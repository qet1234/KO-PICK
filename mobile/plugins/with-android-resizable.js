const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

// Preserve React Native's configuration handlers when switching between the
// cover and inner displays, including devices with different display densities.
module.exports = function withAndroidResizable(config) {
  return withAndroidManifest(config, (next) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(next.modResults);
    activity.$['android:resizeableActivity'] = 'true';
    const changes = new Set(
      (activity.$['android:configChanges'] || '').split('|').filter(Boolean),
    );
    for (const change of ['screenSize', 'smallestScreenSize', 'screenLayout', 'orientation', 'density']) {
      changes.add(change);
    }
    activity.$['android:configChanges'] = [...changes].join('|');
    return next;
  });
};
