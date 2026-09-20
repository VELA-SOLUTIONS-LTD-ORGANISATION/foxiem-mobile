# App Privacy questionnaire notes (source audit)

Draft answers for App Store Connect **App Privacy**. Owner must confirm before Save. Do not invent AdMob production IDs.

## Privacy Policy URL

`https://foxiem.com/privacy` (HTTPS 200). Save in ASC **App Privacy → Edit → Save**.

## Does this app collect data?

**Yes** — `react-native-google-mobile-ads` is linked and initializes (UMP + Mobile Ads) with production Foxiem AdMob App IDs and banner units on Statistics / Activity History.

## Local-only Foxiem data (usually do **not** declare as “collected”)

Name/username, language, counter, history, reminders stay in AsyncStorage on device. Foxiem code does not sync them to a Foxiem server.

## Data types to declare (Google Mobile Ads SDK)

Per [Google AdMob iOS data disclosure](https://developers.google.com/admob/ios/privacy/data-disclosure):

| Type | Purposes (draft) | Linked to user? (draft) |
|------|------------------|-------------------------|
| Device ID | Third-Party Advertising; Analytics | Not Linked |
| Advertising Data | Third-Party Advertising; Analytics | Not Linked |
| Product Interaction | Third-Party Advertising; Analytics | Not Linked |
| Diagnostics (Crash Data) | App Functionality; Analytics | Not Linked |
| Performance Data | App Functionality; Analytics; Third-Party Advertising | Not Linked |
| Coarse Location | Third-Party Advertising; Analytics | Not Linked |

Firebase Analytics is linked for Ads measurement only (`@react-native-firebase/app` + `analytics`, project `foxiem-counter`). Events are PII-free (`onboarding_complete`, `first_count`). No Foxiem crash/auth/push backends or Foxiem server in source.

## Used for Tracking?

**Draft: No** for current binary (no ATT / `NSUserTrackingUsageDescription`). Revisit if personalized ads / IDFA go live.

## Evidence

- Ads: `src/ads/*`, `app.json`, `package.json`
- Firebase / Ads conversions: `google-services.json`, `GoogleService-Info.plist`, `app.config.ts`, `src/lib/telemetry/adsConversions.ts`
- Local storage: `src/storage/*`
- Notifications: local only (`src/notifications/reminderNotifications.ts`)
- Guards: `src/__tests__/releaseConfig.test.ts`, `store/compliance-notes.md`
