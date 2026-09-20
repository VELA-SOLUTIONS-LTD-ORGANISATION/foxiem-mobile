import fs from 'fs';
import path from 'path';

import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic Expo config layered on top of the static `app.json`.
 *
 * Attach Firebase App + Analytics when Foxiem google-services files are present.
 * Production AdMob App IDs stay in `app.json`.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;
  const plugins: ExpoConfig['plugins'] = [...(base.plugins ?? [])];

  const googleServicesFile = path.join(__dirname, 'google-services.json');
  const googleServiceInfoPlist = path.join(__dirname, 'GoogleService-Info.plist');
  const android = { ...(base.android ?? {}) };
  const ios = { ...(base.ios ?? {}) };
  const hasAndroidFirebase = fs.existsSync(googleServicesFile);
  const hasIosFirebase = fs.existsSync(googleServiceInfoPlist);

  if (hasAndroidFirebase || hasIosFirebase) {
    plugins.push(
      ['@react-native-firebase/app', { ios: { disableSPM: true } }],
      '@react-native-firebase/analytics',
    );
    if (hasAndroidFirebase) {
      android.googleServicesFile = './google-services.json';
    }
    if (hasIosFirebase) {
      ios.googleServicesFile = './GoogleService-Info.plist';
    }
  }

  return {
    ...base,
    plugins,
    android,
    ios,
  };
};
