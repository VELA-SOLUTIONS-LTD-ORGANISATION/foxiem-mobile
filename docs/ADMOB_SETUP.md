# AdMob setup (Foxiem)

Foxiem monetizes with **banner ads only** via `react-native-google-mobile-ads` **16.3.4**.
Expo Go **cannot** run AdMob (native module). Use a development client / native build.

In Expo Go the app still launches: ads detect the missing native module and stay disabled
(fail closed).

## What is implemented in code

- Centralized config: `src/ads/adConfig.ts`
- Consent (UMP): `src/ads/consent.ts` + `AdsProvider`
- Banner UI: `AdBanner` on **Statistics** and **Activity History** only
- Home, Profile, Reminders, Privacy, About, Consistency remain **ad-free**
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

## ATT

**Not used.** Ads may still request without IDFA where the SDK allows.
