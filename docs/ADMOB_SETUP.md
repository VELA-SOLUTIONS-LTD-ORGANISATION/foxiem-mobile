# AdMob setup (Foxiem 1.0.x, obsolete)

> **Foxiem 2.0 removed ads.** `react-native-google-mobile-ads`, the UMP consent flow and every banner are gone, and none of the files below exist any more. This page is kept only as a record of the 1.0.x setup. See `docs/RELEASE_CHECKLIST.md` for the 2.0 store declarations.

Foxiem 1.0.x monetized with **banner ads only** via `react-native-google-mobile-ads` **16.3.4**.
Expo Go **cannot** run AdMob (native module). Use a development client / native build.

In Expo Go the app still launches: ads detect the missing native module and stay disabled
(fail closed).

## What is implemented in code

- Centralized config: `src/ads/adConfig.ts`
- Consent (UMP): `src/ads/consent.ts` + `AdsProvider`
- Banner UI: `AdBanner` on **Home** (top, compact), **Statistics**, and **Activity History**
- Profile, Reminders, Privacy, About, Consistency remain **ad-free**
- Home banner sits under the greeting, above the topic row / counter / `+1` so it does not overlap the primary action
- Development (`__DEV__`) always uses official Google test banner ID
- Production uses platform-specific Foxiem banner units
- Expo plugin App IDs are **real Foxiem AdMob App IDs** (native rebuild required after change)
- No ATT / `userTrackingUsageDescription` / `expo-tracking-transparency` in this release

## Production AdMob identifiers (configured)

| Item | Value |
|------|--------|
| Publisher / app-ads | `google.com, pub-3249455013386377, DIRECT, f08c47fec0942fa0` |
| Android App ID | `ca-app-pub-3249455013386377~1127078474` |
| iOS App ID | `ca-app-pub-3249455013386377~1517960718` |
| Android Statistics banner | `ca-app-pub-3249455013386377/8663174751` |
| Android Activity History banner | `ca-app-pub-3249455013386377/4815042040` |
| iOS Statistics banner | `ca-app-pub-3249455013386377/4723929748` |
| iOS Activity History banner | `ca-app-pub-3249455013386377/3370098436` |

Do **not** invent additional formats (interstitial / rewarded / app open / native).

## Privacy & messaging (UMP)

Code calls Google UMP (`AdsConsent.gatherConsent` / privacy options form).

Configure AdMob:

**AdMob → Privacy & messaging → European regulations**

Publish the applicable message for EEA / UK / Switzerland.

## app-ads.txt

Public URL: `https://foxiem.com/app-ads.txt`  
Developer website in store listings: `https://foxiem.com`

## Privacy Policy

In-app: `EXTERNAL_LINKS.privacyPolicy` → `https://foxiem.com/privacy`

## Firebase Analytics (Ads measurement)

Project **foxiem-counter** is linked for Google Ads quality bidding only.

- Android config: `google-services.json` (`co.uk.solutionvela.foxiem`)
- iOS config: `GoogleService-Info.plist` (`co.uk.solutionvela.foxiem`)
- Plugins: `@react-native-firebase/app` + `@react-native-firebase/analytics` via `app.config.ts`
- Conversion events: `onboarding_complete`, `first_count` (PII-free; no name, notes, or count values)
- Native events require an EAS rebuild after these files / plugins change

## ATT

**Not used.** Ads may still request without IDFA where the SDK allows.
