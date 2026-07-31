import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

import { recordLegalConsent } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

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
