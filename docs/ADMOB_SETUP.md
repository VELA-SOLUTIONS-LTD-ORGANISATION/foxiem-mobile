# AdMob setup (Foxiem Stage 14)

Foxiem monetizes with **banner ads only** via `react-native-google-mobile-ads`.
Expo Go **cannot** run AdMob (native module). Use a development client / native build.

In Expo Go the app still launches: ads detect the missing native module and stay disabled
(fail closed). You will see a DEV log that AdMob is unavailable until a native rebuild.

## What is implemented in code

- Centralized config: `src/ads/adConfig.ts`
- Consent (UMP): `src/ads/consent.ts` + `AdsProvider`
- Banner UI: `AdBanner` on **Statistics** and **Activity History** only
- Home, Profile, Reminders, Privacy, About, Consistency remain **ad-free**
- Development ad requests use official `TestIds.BANNER`
- Production Ad Unit IDs are empty until you supply real values (fail closed)
- Native App IDs currently use **Google sample App IDs** in `app.json` so the SDK can boot in development builds

## Required: AdMob console

1. Create/add **iOS** app  
   Bundle ID: `co.uk.solutionvela.foxiem`
2. Create/add **Android** app  
   Package: `co.uk.solutionvela.foxiem`
3. Create **four** banner ad units (do not share iOS/Android IDs):
   - iOS Statistics banner
   - iOS Activity History banner
   - Android Statistics banner
   - Android Activity History banner
4. Copy real **App IDs** (`ca-app-pub-…~…`) into the Expo plugin in `app.json`
5. Copy real **Ad Unit IDs** (`ca-app-pub-…/…`) into `PRODUCTION_BANNER_UNITS` in `src/ads/adConfig.ts`

Until step 4–5 are done, treat monetization as **not production-ready**.

## Privacy & messaging (UMP)

Code calls Google UMP (`AdsConsent.gatherConsent` / privacy options form).

You must also configure AdMob:

**AdMob → Privacy & messaging → European regulations**

Publish the applicable message for EEA / UK / Switzerland.  
Until that message exists in the AdMob account, UMP may not present a real production consent experience.

Do **not** build a custom GDPR modal in Foxiem.

## Test ads (mandatory in development)

- `__DEV__` always requests `TestIds.BANNER`
- Never click your own **production** ads
- Prefer official test ads / registered test devices
- Invalid traffic can jeopardize the AdMob account

## Native rebuild

After installing/changing the AdMob plugin or App IDs:

```bash
npx expo prebuild
# or EAS Build / development client rebuild
```

Then install the new iOS and Android builds. Restarting Metro alone is not enough.

### Plugin generates (when configured)

- **iOS:** `GADApplicationIdentifier` (and optional SKAdNetwork items if you pass `skAdNetworkItems`)
- **Android:** `com.google.android.gms.ads.APPLICATION_ID` meta-data

Foxiem does **not** set `userTrackingUsageDescription` / ATT in this stage.

## app-ads.txt

Required for many new AdMob apps:

1. Host a public developer website
2. Publish `https://your-domain/app-ads.txt` (or the path Google documents for your setup)
3. Include your real AdMob publisher ID line (do not invent one)
4. Link the same website in App Store / Play Console listings
5. Verify app-ads.txt in AdMob

**Current status:** not published (external blocker).

## Privacy Policy

`EXTERNAL_LINKS.privacyPolicy` is still empty.

**PRIVACY POLICY PUBLIC URL: MISSING** — release blocker before monetized distribution.

Update the public policy to disclose Google Mobile Ads / advertising data practices, then set the URL in `src/constants/links.ts`.

## Store privacy re-audit

After AdMob:

- Re-answer **Apple App Privacy**
- Re-answer **Google Play Data Safety**
- Align answers with the **current** Google Mobile Ads SDK data practices

Do not invent answers in code.

## ATT

Stage 14: **ATT not used**. No `NSUserTrackingUsageDescription` is added by Foxiem config.  
Ads may still request without IDFA where the SDK allows.

## Child-directed / under-age flags

Not set. Foxiem is not configured as child-directed or under-age-of-consent by default.

## Physical device QA (minimum)

iOS and Android:

- [ ] Consent form where UMP requires it
- [ ] Test banner on Statistics
- [ ] Test banner on Activity History (non-empty list)
- [ ] Empty Activity History shows no banner
- [ ] Home has no ad
- [ ] Privacy / Reminders / Profile have no ad
- [ ] Ad load failure leaves layout intact
- [ ] Offline: app works; ads absent
- [ ] Privacy choices row when required
- [ ] Denied / limited consent → no crash, no forced ads
- [ ] Return from external ad browser
- [ ] Banner not touching bottom tabs; no accidental overlap with controls
