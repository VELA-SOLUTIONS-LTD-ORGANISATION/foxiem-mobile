import fs from 'fs';
import path from 'path';

import {
  AndroidConfig,
  withAndroidManifest,
  withAndroidStyles,
  type ConfigPlugin,
} from 'expo/config-plugins';
import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Google Play flags a locked orientation and resizeableActivity=false on large screens.
 * Android 16 ignores those locks on sw600dp, so the manifest must not declare them.
 * iOS stays portrait via the root `orientation` field.
 */
const withAndroidLargeScreens: ConfigPlugin = (config) =>
  withAndroidManifest(config, (mod) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(mod.modResults);
    delete activity.$['android:screenOrientation'];
    delete activity.$['android:maxAspectRatio'];
    delete activity.$['android:minAspectRatio'];
    activity.$['android:resizeableActivity'] = 'true';
    return mod;
  });

/** Drop deprecated status and navigation bar color theme attributes from the app theme. */
const withAndroidEdgeToEdgeTheme: ConfigPlugin = (config) =>
  withAndroidStyles(config, (mod) => {
    const parent = AndroidConfig.Styles.getAppThemeGroup();
    for (const name of ['android:statusBarColor', 'android:navigationBarColor']) {
      AndroidConfig.Styles.removeStylesItem({
        name,
        xml: mod.modResults,
        parent,
      });
    }
    return mod;
  });

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

  return withAndroidEdgeToEdgeTheme(
    withAndroidLargeScreens({
      ...base,
      plugins,
      android,
      ios,
    }),
  );
};
