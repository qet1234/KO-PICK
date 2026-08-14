import type { ExpoConfig } from 'expo/config';

export const createIosConfig = (
  base: ExpoConfig['ios'],
): NonNullable<ExpoConfig['ios']> => ({
  ...base,
  bundleIdentifier: 'com.koreapick.app',
  buildNumber: '1',
  supportsTablet: false,
  usesAppleSignIn: true,
  infoPlist: {
    ...base?.infoPlist,
    ITSAppUsesNonExemptEncryption: false,
  },
});
