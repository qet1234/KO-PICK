import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { recordLegalConsent } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const APPLE_USER_ID_KEY = 'kopick.apple-user-id';

export async function signInWithAppleNative() {
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) throw new Error('이 기기에서는 Apple 로그인을 사용할 수 없습니다.');

  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );
  const state = Crypto.randomUUID();
  const credential = await AppleAuthentication.signInAsync({
    nonce: hashedNonce,
    state,
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (credential.state !== state || !credential.identityToken) {
    throw new Error('Apple 인증 결과를 확인하지 못했습니다.');
  }

  await SecureStore.setItemAsync(APPLE_USER_ID_KEY, credential.user);

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
    access_token: credential.authorizationCode ?? undefined,
  });
  if (error) throw error;

  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(' ');
  if (fullName) {
    await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        given_name: credential.fullName?.givenName,
        family_name: credential.fullName?.familyName,
      },
    });
  }

  await recordLegalConsent('apple');
}

export async function appleAuthorizationCodeForDeletion() {
  const user = await SecureStore.getItemAsync(APPLE_USER_ID_KEY);
  const state = Crypto.randomUUID();
  const credential = user
    ? await AppleAuthentication.refreshAsync({ user, state })
    : await AppleAuthentication.signInAsync({ state });
  if (credential.state !== state || (user && credential.user !== user) || !credential.authorizationCode) {
    throw new Error('Apple 연동 해제용 인증 결과를 확인하지 못했습니다.');
  }
  await SecureStore.setItemAsync(APPLE_USER_ID_KEY, credential.user);
  return credential.authorizationCode;
}

export async function clearAppleAuthState() {
  await SecureStore.deleteItemAsync(APPLE_USER_ID_KEY);
}
