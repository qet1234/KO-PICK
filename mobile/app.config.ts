import type { ConfigContext, ExpoConfig } from 'expo/config';

const naverMapClientId =
  process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID?.trim() || 'NAVER_MAP_CLIENT_ID_REQUIRED';

const createExpoConfig = ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'KO-PICK',
  slug: 'ko-pick',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'kopick',
  userInterfaceStyle: 'automatic',
  ios: {
    ...config.ios,
    bundleIdentifier: 'com.koreapick.app',
    buildNumber: '1',
    supportsTablet: false,
    usesAppleSignIn: true,
    infoPlist: {
      ...config.ios?.infoPlist,
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    ...config.android,
    package: 'com.koreapick.app',
    versionCode: 1,
    predictiveBackGestureEnabled: false,
  },
  web: {
    ...config.web,
    output: 'static',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-dev-client',
    'expo-apple-authentication',
    [
      '@mj-studio/react-native-naver-map',
      {
        client_id: naverMapClientId,
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          extraMavenRepos: ['https://repository.map.naver.com/archive/maven'],
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    ...config.extra,
    eas: {
      ...config.extra?.eas,
      projectId: '8914e5dd-3545-482a-ad4d-4290b399e4b1',
    },
  },
});

export default createExpoConfig;
