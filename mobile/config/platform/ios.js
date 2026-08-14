const createIosConfig = (base) => ({
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

module.exports = { createIosConfig };
