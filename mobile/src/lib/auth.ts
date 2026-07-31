import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { Provider, Session } from '@supabase/supabase-js';

import { appConfig } from '@/lib/config';
import { PRIVACY_VERSION, TERMS_VERSION } from '@/lib/legal';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export type MobileAuthProvider = 'apple' | 'google' | 'kakao' | 'naver';

const redirectTo = makeRedirectUri({
  scheme: 'kopick',
  path: 'auth/callback',
});

function authParams(url: string) {
  const queryStart = url.indexOf('?');
  const fragmentStart = url.indexOf('#');
  const query = queryStart >= 0
    ? url.slice(queryStart + 1, fragmentStart >= 0 ? fragmentStart : undefined)
    : '';
  const fragment = fragmentStart >= 0 ? url.slice(fragmentStart + 1) : '';
  return new URLSearchParams([query, fragment].filter(Boolean).join('&'));
}

async function createSessionFromUrl(url: string) {
  const params = authParams(url);
  const error = params.get('error_description') || params.get('error');
  if (error) throw new Error(error);

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const result = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (result.error) throw result.error;
    return result.data.session;
  }

  const code = params.get('code');
  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    if (result.error) throw result.error;
    return result.data.session;
  }

  const tokenHash = params.get('token_hash');
  if (tokenHash) {
    const result = await supabase.auth.verifyOtp({
      type: 'magiclink',
      token_hash: tokenHash,
    });
    if (result.error) throw result.error;
    return result.data.session;
  }

  throw new Error('로그인 인증 결과를 확인하지 못했습니다.');
}

function normalizedProvider(value: unknown): MobileAuthProvider {
  if (value === 'apple' || value === 'google' || value === 'kakao' || value === 'naver') {
    return value;
  }
  return 'google';
}

export async function completeMobileAuthUrl(
  url: string,
  fallbackProvider?: MobileAuthProvider,
) {
  const session = await createSessionFromUrl(url);
  if (!session) throw new Error('로그인 세션을 만들지 못했습니다.');
  const provider = normalizedProvider(
    authParams(url).get('provider') ||
      session.user.app_metadata.provider ||
      fallbackProvider,
  );
  await recordLegalConsent(provider);
  return session;
}

export async function recordLegalConsent(provider: MobileAuthProvider) {
  const { error } = await supabase.rpc('record_user_legal_consents', {
    p_privacy_version: PRIVACY_VERSION,
    p_source: `mobile_${provider}`,
    p_terms_version: TERMS_VERSION,
  });
  if (error) {
    await supabase.auth.signOut({ scope: 'local' });
    throw new Error('필수 동의 내역을 기록하지 못해 로그인을 완료하지 않았습니다.');
  }
}

async function finishBrowserLogin(
  startUrl: string,
  provider: MobileAuthProvider,
): Promise<Session> {
  const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('로그인이 취소되었습니다.');
  }
  if (result.type !== 'success') {
    throw new Error('로그인 창을 완료하지 못했습니다.');
  }

  return completeMobileAuthUrl(result.url, provider);
}

export async function signInWithSupabaseOAuth(
  provider: Exclude<MobileAuthProvider, 'naver'>,
) {
  if (!appConfig.isSupabaseConfigured) {
    throw new Error('Supabase 앱 환경변수를 먼저 설정해 주세요.');
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error('로그인 주소를 만들지 못했습니다.');

  return finishBrowserLogin(data.url, provider);
}

export async function signInWithNaver() {
  if (!appConfig.isSupabaseConfigured) {
    throw new Error('Supabase 앱 환경변수를 먼저 설정해 주세요.');
  }
  return finishBrowserLogin(`${appConfig.webUrl}/auth/mobile/naver`, 'naver');
}
