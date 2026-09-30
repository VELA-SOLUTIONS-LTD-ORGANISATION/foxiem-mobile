import fs from 'fs';
import path from 'path';

import {
  AndroidConfig,
  withAndroidManifest,
  withAndroidStyles,
  type ConfigPlugin,
} from 'expo/config-plugins';
import type { ConfigContext, ExpoConfig } from 'expo/config';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { withNativeLocalization } = require('./plugins/withNativeLocalization') as {
  withNativeLocalization: (config: ExpoConfig) => ExpoConfig;
};

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
 * Analytics stays off until the person says yes (UK/EU consent). These native defaults keep
 * Firebase from collecting anything between install and that choice; `setAnalyticsEnabled`
 * flips collection on at runtime after consent and off again on withdrawal.
 */
const ANALYTICS_MANIFEST_DEFAULTS: Record<string, string> = {
  firebase_analytics_collection_enabled: 'false',
  firebase_analytics_collection_deactivated: 'false',
  google_analytics_adid_collection_enabled: 'false',
  google_analytics_default_allow_ad_personalization_signals: 'false',
  google_analytics_default_allow_ad_storage: 'false',
  google_analytics_default_allow_ad_user_data: 'false',
  google_analytics_default_allow_analytics_storage: 'false',
  firebase_automatic_screen_reporting_enabled: 'false',
};

const withAnalyticsOffByDefault: ConfigPlugin = (config) =>
  withAndroidManifest(config, (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    for (const [name, value] of Object.entries(ANALYTICS_MANIFEST_DEFAULTS)) {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(application, name, value);
    }
    // @react-native-firebase/analytics ships the same keys set to `true` in its library manifest. Without
    // an explicit replace the manifest merger fails the build instead of letting the app's `false` win.
    for (const item of application['meta-data'] ?? []) {
      if (item.$['android:name'] in ANALYTICS_MANIFEST_DEFAULTS) {
        (item.$ as Record<string, string>)['tools:replace'] = 'android:value';
      }
    }
    return mod;
  });

const IOS_ANALYTICS_DEFAULTS = {
  FIREBASE_ANALYTICS_COLLECTION_ENABLED: false,
  FIREBASE_ANALYTICS_COLLECTION_DEACTIVATED: false,
  GOOGLE_ANALYTICS_IDFV_COLLECTION_ENABLED: false,
  GOOGLE_ANALYTICS_DEFAULT_ALLOW_AD_PERSONALIZATION_SIGNALS: false,
  GOOGLE_ANALYTICS_DEFAULT_ALLOW_AD_STORAGE: false,
  GOOGLE_ANALYTICS_DEFAULT_ALLOW_AD_USER_DATA: false,
  GOOGLE_ANALYTICS_DEFAULT_ALLOW_ANALYTICS_STORAGE: false,
  FirebaseAutomaticScreenReportingEnabled: false,
};

/** `123-abc.apps.googleusercontent.com` becomes `com.googleusercontent.apps.123-abc`; anything else is rejected. */
function googleIosUrlScheme(clientId: string | undefined): string | null {
  const match = /^([0-9]+-[a-z0-9]+)\.apps\.googleusercontent\.com$/i.exec(clientId?.trim() ?? '');
  return match ? `com.googleusercontent.apps.${match[1]}` : null;
}

/**
 * Dynamic Expo config layered on top of the static `app.json`.
 *
 * Attach Firebase App + Analytics when Foxiem google-services files are present.
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

  ios.infoPlist = { ...(ios.infoPlist ?? {}), ...IOS_ANALYTICS_DEFAULTS };

  // Crash reporting (source maps / native symbols). Auth token comes from SENTRY_AUTH_TOKEN at build time.
  plugins.push([
    '@sentry/react-native/expo',
    {
      url: 'https://de.sentry.io/',
      organization: 'vela-solutions-ltd',
      project: 'foxiem-mobile',
    },
  ]);

  // Optional accounts: the session lives in the OS keychain / keystore.
  plugins.push('expo-secure-store');
  // Sign in with Apple (iOS). The plugin adds the entitlement; App ID capability must also be on in the Apple Developer portal.
  plugins.push('expo-apple-authentication');
  // Google sign-in on iOS needs the reversed iOS client id as a URL scheme. It is derived from the public
  // client id (EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID), never invented: without it the plugin is skipped and
  // the account section stays hidden on iOS. Android needs no native configuration.
  const iosUrlScheme = googleIosUrlScheme(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  if (iosUrlScheme) {
    plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme }]);
  }

  // The widget and Watch targets need the Apple Developer Team ID to sign. It is an account value, so it
  // comes from the environment (EAS env / local shell) rather than being guessed or committed.
  const appleTeamId = process.env.APPLE_TEAM_ID?.trim();
  if (appleTeamId) {
    ios.appleTeamId = appleTeamId;
  }

  return withNativeLocalization(
    withAnalyticsOffByDefault(
      withAndroidEdgeToEdgeTheme(
        withAndroidLargeScreens({
          ...base,
          plugins,
          android,
          ios,
        }),
      ),
    ),
  );
};
