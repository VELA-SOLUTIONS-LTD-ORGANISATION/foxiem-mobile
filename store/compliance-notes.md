# Export compliance & ATT notes (source audit)

Not App Store Connect form submissions — decision aids from foxiem-mobile source.

## Encryption / export compliance

Findings:
- `app.json` sets `ios.infoPlist.ITSAppUsesNonExemptEncryption` = `false`
- App storage: `@react-native-async-storage/async-storage` (no custom crypto layer in Foxiem code)
- Notifications: `expo-notifications` local scheduling
- Networking: HTTPS for public links; Google Mobile Ads SDK present; Firebase Analytics for Ads conversions (`foxiem-counter`)
- No custom encryption algorithms found in Foxiem application source

Draft determination:
- Documentation required for App Store export questions: typically **NO** when only exempt/standard encryption is used and `ITSAppUsesNonExemptEncryption` is accurately `false`
- Owner must confirm before answering ASC export compliance for build 5

## ATT / tracking

Findings:
- No `NSUserTrackingUsageDescription` / ATT prompt configured in app config tests
- `react-native-google-mobile-ads` ships with **production** Foxiem AdMob App IDs (`app.json`) and banner units (`src/ads/adConfig.ts`)
- `__DEV__` uses Google test banner ID only; production builds request live banners on Statistics / Activity History
- Do **not** add an ATT prompt solely because AdMob is linked

Draft determination:
- Current shipping binary should not introduce ATT unless production AdMob/IDFA configuration actually requires it
- App Privacy questionnaire must reflect that an advertising SDK is present (banners on selected screens)

## AdMob disclosure

- In-app privacy strings and https://foxiem.com/privacy describe Google Mobile Ads on selected screens
- Home is intended to remain ad-free per placement contracts (statistics / activity history placements)
