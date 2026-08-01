export async function signInWithAppleNative() {
  throw new Error('Apple 로그인은 iOS 앱에서 사용할 수 있습니다.');
}

export async function appleAuthorizationCodeForDeletion() {
  return undefined;
}

export async function clearAppleAuthState() {
  return undefined;
}
