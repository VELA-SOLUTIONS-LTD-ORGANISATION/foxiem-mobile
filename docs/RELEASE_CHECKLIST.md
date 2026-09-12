# Foxiem release checklist

Use before a store-facing build. Stage 14 AdMob items are included.

## Product

- [ ] Splash → Profile Setup / Main flow verified
- [ ] Counter (+1 / +5 / −1 / Reset) persists across restart
- [ ] Statistics / History / Consistency agree on the same events
- [ ] Reminders schedule/cancel on device
- [ ] Six languages switch without missing keys
- [ ] Reset App Data returns to Profile Setup

## AdMob

- [ ] Real iOS AdMob App ID configured (not Google sample)
- [ ] Real Android AdMob App ID configured (not Google sample)
- [ ] Real iOS banner unit IDs configured (`statistics`, `activityHistory`)
- [ ] Real Android banner unit IDs configured
- [ ] UMP European regulations message published in AdMob Privacy & messaging
- [ ] Privacy choices tested (when UMP marks options required)
- [ ] Privacy Policy published and linked in `EXTERNAL_LINKS.privacyPolicy`
- [ ] app-ads.txt published on developer website
- [ ] app-ads.txt verified in AdMob
- [ ] Apple App Privacy answers reviewed for Google Mobile Ads
- [ ] Play Data Safety reviewed for Google Mobile Ads
- [ ] iOS test ads verified on a development build
- [ ] Android test ads verified on a development build
- [ ] Production / release build does **not** use `TestIds.BANNER`
- [ ] Home remains ad-free
- [ ] No accidental-click layout (ads away from +1/+5/−1, tabs, forms)
- [ ] No interstitial / app-open / rewarded ads shipped

## Privacy & legal

- [ ] Privacy screen advertising section accurate
- [ ] About local-first wording scoped to Foxiem product data
- [ ] Terms URL configured if required by stores
- [ ] ATT decision documented (Stage 14: not used)

## Build / QA

- [ ] Fresh native build after AdMob plugin changes (not Expo Go)
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] Physical device pass of `docs/QA_CHECKLIST.md` AdMob section
- [ ] Responsive banner check at 320–480 widths (`docs/RESPONSIVE_QA_MATRIX.md`)
