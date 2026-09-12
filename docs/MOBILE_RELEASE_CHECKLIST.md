# Foxiem mobile release checklist

## SOURCE

- [ ] repository clean
- [ ] main/master branch pushed
- [ ] no credentials tracked

## EXPO

- [ ] EAS project linked (`extra.eas.projectId`)
- [ ] Expo account correct (`@vela-solution-ltd/foxiem`)
- [ ] bundle ID `co.uk.solutionvela.foxiem`
- [ ] Android package `co.uk.solutionvela.foxiem`
- [ ] SDK 57 `expo-doctor` reviewed
- [ ] production env configured (as needed)

## SIGNING

- [ ] iOS distribution credentials ready
- [ ] Android production keystore ready

## GITHUB

- [ ] `EXPO_TOKEN` configured
- [ ] workflow `.github/workflows/mobile-production-build.yml` exists
- [ ] manual `workflow_dispatch` works
- [ ] CI validation passes before EAS

## BUILD

- [ ] iOS production EAS build passes
- [ ] Android production EAS build passes
- [ ] Android artifact is AAB
- [ ] build IDs / URLs recorded
- [ ] no `--auto-submit` / no store release

## NEXT

- [ ] Apple TestFlight / App Store stage
- [ ] Google Play stage
