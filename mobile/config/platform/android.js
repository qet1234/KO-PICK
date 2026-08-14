const createAndroidConfig = (base) => ({
  ...base,
  package: 'com.koreapick.app',
  versionCode: 25,
  allowBackup: false,
  intentFilters: [
    {
      action: 'VIEW',
      autoVerify: true,
      category: ['BROWSABLE', 'DEFAULT'],
      data: [
        {
          scheme: 'https',
          host: 'koreapick.duckdns.org',
          pathPrefix: '/auth/mobile/callback',
        },
      ],
    },
  ],
  predictiveBackGestureEnabled: false,
  adaptiveIcon: {
    foregroundImage: './assets/adaptive-icon.png',
    backgroundColor: '#FFFFFF',
  },
  blockedPermissions: [
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.WRITE_EXTERNAL_STORAGE',
    'android.permission.SYSTEM_ALERT_WINDOW',
    'android.permission.VIBRATE',
  ],
});

module.exports = { createAndroidConfig };
