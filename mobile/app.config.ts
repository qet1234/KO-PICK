import type { ConfigContext, ExpoConfig } from 'expo/config';

const easProjectId = '8914e5dd-3545-482a-ad4d-4290b399e4b1';
const naverMapClientId =
  process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID?.trim() || 'NAVER_MAP_CLIENT_ID_REQUIRED';
const releaseBuildProfiles = new Set(['production', 'testflight']);
const isReleaseBuild = releaseBuildProfiles.has(process.env.EAS_BUILD_PROFILE ?? '');

if (isReleaseBuild) {
  const requiredEnvironmentVariables = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'EXPO_PUBLIC_NAVER_MAP_CLIENT_ID',
    'EXPO_PUBLIC_WEB_URL',
  ] as const;
  const missing = requiredEnvironmentVariables.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`KO-PICK release build is missing: ${missing.join(', ')}`);
  }
}

const createExpoConfig = ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'KO-PICK',
  slug: 'ko-pick',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'kopick',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  runtimeVersion: {
    policy: 'fingerprint',
  },
  updates: {
    url: `https://u.expo.dev/${easProjectId}`,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
  },
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
    allowBackup: false,
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      monochromeImage: './assets/monochrome-icon.png',
      backgroundColor: '#146b45',
    },
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.VIBRATE',
    ],
  },
  web: {
    ...config.web,
    output: 'static',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-apple-authentication',
    [
      'expo-splash-screen',
      {
        image: './assets/splash.png',
        imageWidth: 240,
        resizeMode: 'contain',
        backgroundColor: '#f5f8f6',
        dark: {
          image: './assets/splash.png',
          backgroundColor: '#17211c',
        },
      },
    ],
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
      projectId: easProjectId,
    },
  },
});

export default createExpoConfig;
