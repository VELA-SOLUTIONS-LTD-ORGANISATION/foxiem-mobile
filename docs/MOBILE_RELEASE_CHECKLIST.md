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
- [ ] production env secrets on EAS (optional; none required yet for build)

## SIGNING

- [ ] iOS distribution credentials ready — **BLOCKED: interactive Apple login required**
- [x] Android production keystore ready

## GITHUB

- [ ] `EXPO_TOKEN` configured — **BLOCKED: secret missing**
- [x] workflow `.github/workflows/mobile-production-build.yml` exists
- [ ] manual `workflow_dispatch` works (pending token + iOS)
- [x] CI validation scripts pass locally (typecheck + 121 tests)

## BUILD

- [ ] iOS production EAS build passes
- [x] Android production EAS build passes (`7f7ab21f…`, versionCode 6, AAB)
- [x] Android artifact is AAB
- [x] Android build ID / URL recorded
- [x] no `--auto-submit` / no store release

## NEXT

- [ ] Apple TestFlight / App Store stage
- [ ] Google Play stage
