import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import type { Provider, Session } from '@supabase/supabase-js';

import { appConfig } from '@/lib/config';
import { PRIVACY_VERSION, TERMS_VERSION } from '@/lib/legal';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export type MobileAuthProvider = 'google' | 'kakao' | 'naver';

const appRedirectTo = makeRedirectUri({
  scheme: 'kopick',
  path: 'auth/callback',
});

const webRedirectTo = new URL('/auth/mobile/callback', appConfig.webUrl).toString();

function authParams(url: string) {
  const queryStart = url.indexOf('?');
  const fragmentStart = url.indexOf('#');
  const query = queryStart >= 0
    ? url.slice(queryStart + 1, fragmentStart >= 0 ? fragmentStart : undefined)
    : '';
  const fragment = fragmentStart >= 0 ? url.slice(fragmentStart + 1) : '';
  return new URLSearchParams([query, fragment].filter(Boolean).join('&'));
}

type LoginAttempt = { state: string; verifier: string; provider: MobileAuthProvider; expires: number };
const ATTEMPT_KEY = 'kopick-mobile-login-v2';
let completion: { key: string; promise: Promise<Session>; expires: number } | null = null;

async function beginLogin(provider: MobileAuthProvider): Promise<LoginAttempt> {
  const random = () => Array.from(Crypto.getRandomBytes(32), byte => byte.toString(16).padStart(2, '0')).join('');
  const attempt = { state: random(), verifier: random(), provider, expires: Date.now() + 900_000 };
  completion = null;
  await SecureStore.setItemAsync(ATTEMPT_KEY, JSON.stringify(attempt));
  return attempt;
}

function callbackParams(url: string) {
  const parsed = new URL(url);
  const web = new URL(webRedirectTo);
  const custom = parsed.protocol === 'kopick:' && parsed.hostname === 'auth' && parsed.pathname === '/callback';
  const appLink = parsed.origin === web.origin && parsed.pathname === web.pathname;
  if ((!custom && !appLink) || parsed.username || parsed.password) throw new Error('잘못된 로그인 주소입니다.');
  const params = authParams(url);
  for (const key of ['code', 'mobile_code', 'auth_state', 'access_token', 'refresh_token', 'token_hash']) {
    if (params.getAll(key).length > 1) throw new Error('중복된 로그인 정보입니다.');
  }
  if (params.has('access_token') || params.has('refresh_token') || params.has('token_hash')) {
    throw new Error('이전 로그인 링크는 사용할 수 없습니다. 앱에서 다시 로그인해 주세요.');
  }
  return params;
}

export async function completeMobileAuthUrl(url: string, _fallbackProvider?: MobileAuthProvider) {
  const params = callbackParams(url);
  const state = params.get('auth_state');
  const key = JSON.stringify([state, params.get('code'), params.get('mobile_code')]);
  // The callback screen and browser completion can receive the same response concurrently.
  if (completion?.key === key && completion.expires > Date.now()) return completion.promise;
  const promise = (async () => {
    const stored = await SecureStore.getItemAsync(ATTEMPT_KEY);
    const attempt: LoginAttempt | null = stored ? JSON.parse(stored) : null;
    if (!attempt || !state || state !== attempt.state || attempt.expires < Date.now()) {
      throw new Error('로그인 요청이 없거나 만료되었습니다. 앱에서 다시 로그인해 주세요.');
    }
    const error = params.get('error_description') || params.get('error');
    if (error) { await SecureStore.deleteItemAsync(ATTEMPT_KEY); throw new Error(error); }
    const code = params.get('code');
    const mobileCode = params.get('mobile_code');
    if ((attempt.provider === 'naver' && (!mobileCode || code)) ||
        (attempt.provider !== 'naver' && (!code || mobileCode))) {
      throw new Error('로그인 요청과 응답이 일치하지 않습니다.');
    }
    await SecureStore.deleteItemAsync(ATTEMPT_KEY);
    let session: Session | null;
    if (attempt.provider === 'naver') {
      const response = await fetch(new URL('/auth/mobile/exchange', appConfig.webUrl).toString(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mobileCode, verifier: attempt.verifier }),
      });
      const exchange = await response.json();
      if (!response.ok || typeof exchange.token_hash !== 'string') throw new Error('로그인 인증이 만료되었습니다. 다시 로그인해 주세요.');
      const result = await supabase.auth.verifyOtp({ type: 'email', token_hash: exchange.token_hash });
      if (result.error) throw result.error;
      session = result.data.session;
    } else {
      const result = await supabase.auth.exchangeCodeForSession(code!);
      if (result.error) throw result.error;
      session = result.data.session;
    }
    if (!session) throw new Error('로그인 세션을 만들지 못했습니다.');
    await recordLegalConsent(attempt.provider);
    return session;
  })();
  completion = { key, promise, expires: Date.now() + 30_000 };
  return promise;
}

export async function recordLegalConsent(provider: MobileAuthProvider) {
  const { error } = await supabase.rpc('record_user_legal_consents', {
    p_privacy_version: PRIVACY_VERSION,
    p_source: `mobile_${provider}_age14`,
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
  const result = await WebBrowser.openAuthSessionAsync(startUrl, appRedirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') {
    await SecureStore.deleteItemAsync(ATTEMPT_KEY);
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

  const attempt = await beginLogin(provider);
  const redirectTo = new URL(webRedirectTo);
  redirectTo.searchParams.set('auth_state', attempt.state);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: {
      redirectTo: redirectTo.toString(),
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
  const attempt = await beginLogin('naver');
  const challenge = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, attempt.verifier);
  const startUrl = new URL('/auth/mobile/naver', appConfig.webUrl);
  startUrl.searchParams.set('challenge', challenge);
  startUrl.searchParams.set('auth_state', attempt.state);
  startUrl.searchParams.set('platform', 'android');
  return finishBrowserLogin(startUrl.toString(), 'naver');
}
