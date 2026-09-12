# Foxiem mobile release checklist

## SOURCE

- [x] repository clean
- [x] master branch pushed
- [x] no credentials tracked

## EXPO

- [x] EAS project linked (`cf0512da-2372-4fc2-9ec3-2dfc440cd3f1`)
- [x] Expo account correct (`@vela-solution-ltd/foxiem`)
- [x] bundle ID `co.uk.solutionvela.foxiem`
- [x] Android package `co.uk.solutionvela.foxiem`
- [x] SDK 57 `expo-doctor` reviewed (21/21)
- [x] production profile configured

## SIGNING

- [x] iOS distribution credentials ready
- [x] Android production keystore ready

## GITHUB

- [x] `EXPO_TOKEN` rotated + GitHub secret updated (`2026-09-12T11:28:02Z`; re-rotate via paste script if chat-exposed)
- [x] workflow `.github/workflows/mobile-production-build.yml` exists
- [x] manual `workflow_dispatch` works
- [x] CI validation passes before EAS

## BUILD

- [x] iOS production EAS build passes (`c1b47ad6…`, buildNumber 5, `.ipa`, store) — re-verified Finished / 1.0.0 (5) / IPA
- [x] Android production EAS build passes (`aaea7ba8…`, versionCode 7, `.aab`)
- [x] Android artifact is AAB
- [x] build IDs / URLs recorded
- [x] no `--auto-submit` / no store release

## APPLE (see `docs/APPLE_RELEASE.md`)

- [x] Expo token rotation verified (`eas whoami` → `foxiem-github-actions`)
- [x] EAS build 5 re-verified (Finished, IPA, 1.0.0 / 5)
- [x] App Store Connect app / `ascAppId` **6811348160**
- [x] ASC API key for EAS Submit (Key ID `359Z68CNMD` on EAS servers)
- [x] EAS Submit build `c1b47ad6…` — submission `98da815f…` uploaded to ASC
- [x] TestFlight processing (build 5 Ready to Submit; group **Foxiem Internal** + tester invited)
- [ ] Device QA — install build 5 via TestFlight on real device
- [x] iPhone + iPad screenshots prepared (`store/screenshots/`, plus `asc-iphone-65` 1284×2778)
- [x] Screenshots uploaded to ASC (iPhone 6.5 ×3 + iPad ×3 COMPLETE)
- [x] Privacy Policy URL saved in ASC (`https://foxiem.com/privacy`)
- [ ] Support contact live — **SUPPORT CONTACT REQUIRED**
- [x] Listing draft saved in ASC (promo/description/keywords/marketing/copyright/notes)
- [x] App Information: subtitle + Productivity/Lifestyle + Content Rights
- [x] Build 5 selected for version 1.0 (Manual release) — **STOP before Add for Review**
- [x] App Privacy data practices questionnaire (6 AdMob types; Not Linked; tracking draft No)
- [x] Age Ratings questionnaire (**4+** saved; Advertising = Yes)
- [ ] Review phone + Support URL — **REQUIRED**
- [x] Draft listing/compliance notes in `store/listing-copy.md`, `store/compliance-notes.md`
- [x] Optional `ios-submit.yml` (manual, explicit build ID)

## GOOGLE PLAY (see `docs/ANDROID_RELEASE.md`)

- [x] Play app created (`co.uk.solutionvela.foxiem`, app ID `4972859522205405089`)
- [x] Production AAB ready (`aaea7ba8…`, versionCode **7**) — local copy `store/android-builds/foxiem-1.0.0-vc7.aab`
- [x] AAB uploaded to Play **Internal testing** (draft) via EAS Submit — submission `a730ee6f…`, build `aaea7ba8…`, versionCode **7**
- [x] Play submit service account + EAS Google Play Service Credential configured (`expo-upload@baby-namer-vela…`)
- [x] `eas.json` submit.production.android → track `internal`, releaseStatus `draft`
- [x] Manual GitHub workflow `.github/workflows/android-submit.yml` (`workflow_dispatch`, explicit build ID)
- [x] Privacy policy URL saved (`https://foxiem.com/privacy`)
- [x] Ads / Sign-in / Gov / Financial / Health / Advertising ID declarations
- [x] Target audience 13+; IARC content ratings completed
- [x] Data safety (AdMob-aligned) completed
- [x] en-GB short + full description draft in Console (`store/play-listing-copy.md`)
- [ ] Graphics uploaded (icon / feature / phone / **7"+10" tablet**) — assets in `store/screenshots/`
- [x] Store settings category **Productivity** + contact (`solutionvela@gmail.com`) + website
- [ ] Listing translations tr/de/fr/es/it (`store/play-listing-locales.md`)
- [x] External / open testing skipped
- [x] **STOP before production rollout** unless owner authorizes
- [x] Status: **ANDROID INTERNAL TESTING SUBMISSION VERIFIED** (Production inactive)

## NEXT

- [ ] Device QA → support URL + review phone → then owner Add for Review (Apple)
- [ ] Optional: activate Internal Testing (testers + confirm); upload Play graphics/translations; authorize production only when ready
