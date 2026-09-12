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

- [x] `EXPO_TOKEN` configured
- [x] workflow `.github/workflows/mobile-production-build.yml` exists
- [x] manual `workflow_dispatch` works
- [x] CI validation passes before EAS

## BUILD

- [x] iOS production EAS build passes (`c1b47ad6…`, buildNumber 5, `.ipa`, store)
- [x] Android production EAS build passes (`aaea7ba8…`, versionCode 7, `.aab`)
- [x] Android artifact is AAB
- [x] build IDs / URLs recorded
- [x] no `--auto-submit` / no store release

## NEXT

- [ ] Apple TestFlight / App Store stage
- [ ] Google Play stage
