# Foxiem mobile — production EAS builds

Architecture:

```text
GitHub (foxiem-mobile)
  → GitHub Actions (workflow_dispatch)
    → validate (npm ci / typecheck / tests)
      → Expo EAS Build (production)
        → iOS store .ipa
        → Android Play .aab
```

A successful EAS build is **not** a store release. This stage does **not** run `eas submit` or `--auto-submit`.

## Identifiers (permanent)

| Field | Value |
| --- | --- |
| iOS `bundleIdentifier` | `co.uk.solutionvela.foxiem` |
| Android `package` | `co.uk.solutionvela.foxiem` |
| User-facing version | `1.0.0` (`expo.version`) |
| Expo project | `@vela-solution-ltd/foxiem` |
| EAS project ID | `cf0512da-2372-4fc2-9ec3-2dfc440cd3f1` |

## GitHub workflow

File: `.github/workflows/mobile-production-build.yml`

- Trigger: **manual** `workflow_dispatch` only
- Input: `all` | `ios` | `android` (default `all`)
- Runner: `ubuntu-latest` (orchestrates EAS cloud builds)
- Permissions: `contents: read`
- Concurrency group: `foxiem-mobile-production-build` (`cancel-in-progress: false`)
- Node: **22** (Expo SDK 57 minimum 22.13.x)
- Steps: checkout → `npm ci` → typecheck → tests → Expo auth → `eas build --profile production --non-interactive --wait`
- Does **not** upload `.ipa` / `.aab` to GitHub Artifacts (use Expo build URLs)

## EXPO_TOKEN setup

1. Expo dashboard → Access tokens → create a token for the account that can build `@vela-solution-ltd/foxiem`
2. GitHub repo **Settings → Secrets and variables → Actions**
3. Create secret name: `EXPO_TOKEN`
4. Never put the token in YAML, `.env`, docs, or commit history

## EAS project

```bash
npx eas-cli@latest whoami
npx eas-cli@latest project:info
```

Reuse the linked project in `app.json` → `extra.eas.projectId`. Do not create duplicates.

## Production profile (`eas.json`)

- `cli.appVersionSource`: `remote`
- `build.production.autoIncrement`: `true` (Android `versionCode`, iOS `buildNumber`)
- Android: `buildType: app-bundle` (AAB)
- iOS: store distribution (not simulator)
- `environment: production`
- No `--auto-submit` in CI

## Version management

- User-facing: keep `expo.version` intentional (currently `1.0.0`)
- Developer-facing build numbers: managed remotely by EAS
- If store binaries already exist with higher numbers, sync with `eas build:version:set` before relying on auto-increment
- First project init: remote versions start from local defaults (no prior store binaries)

## Signing

### Android

Prefer **EAS-managed** keystore for `co.uk.solutionvela.foxiem`.  
Do not commit `.jks` / `.keystore` files.

Verified store AAB:

- Build ID: `7f7ab21f-a4cc-4d7c-b025-a21cc974f1b2`
- URL: https://expo.dev/accounts/vela-solution-ltd/projects/foxiem/builds/7f7ab21f-a4cc-4d7c-b025-a21cc974f1b2
- `1.0.0` / versionCode `6` / artifact `.aab`

### iOS

EAS-managed Apple Distribution certificate + provisioning profile for `co.uk.solutionvela.foxiem`.

First-time iOS credentials require **interactive** Apple authentication by the product owner:

```bash
cd foxiem-mobile
npx eas-cli@latest credentials -p ios
# choose: production / Set up a new distribution certificate + provisioning profile
# or:
npx eas-cli@latest build -p ios --profile production
```

Do not paste Apple passwords, MFA codes, or certificate contents into chat or the repo.

CI builds are `--non-interactive` and will fail until iOS credentials are already on Expo.

**Current gate (verified):** non-interactive iOS build fails with  
`Distribution Certificate is not validated for non-interactive builds` / `Credentials are not set up`.

Remote developer versions (EAS): iOS `buildNumber` **3**, Android `versionCode` **6**.

## EXPO_TOKEN (GitHub)

**Current gate (verified):** repo `solutionvela/foxiem-mobile` has **no** Actions secrets yet.

1. https://expo.dev/accounts/vela-solution-ltd/settings/access-tokens → create token  
2. Prefer local file (never paste into chat):
   - save token as `.expo-token` (gitignored)
   - run `powershell -File scripts/set-expo-token-secret.ps1`
3. Or GitHub → Settings → Secrets → Actions → `EXPO_TOKEN` manually  
4. Never put the token in YAML, `.env`, docs, or commit history

Do **not** keep probing `eas build -p ios --non-interactive` until Apple credentials exist — failed probes still increment remote `buildNumber`.

## Manual workflow run

1. Confirm iOS + Android signing ready (Android already yes)
2. Confirm `EXPO_TOKEN` secret exists
3. GitHub → Actions → **Mobile Production Build** → Run workflow → platform `all`
4. Wait until the job finishes (`--wait`); green means EAS builds succeeded

## Build verification

Record for each platform:

- EAS build ID
- Expo build URL
- `appVersion` / build number (`versionCode` or `buildNumber`)
- Android artifact type must be **AAB**
- Bundle / package identifiers unchanged

## Failure handling

- If CI validation fails → do not start EAS
- If either platform fails → do not submit the other platform to a store
- Fix credentials/config, then re-run manual dispatch

## AdMob note (non-blocking for binary build)

Native plugin currently uses Google **sample App IDs** so the SDK can initialize. Production banner unit IDs are empty (fail closed). Real AdMob App/Unit IDs are required before monetized store release — not invented here.

Android EAS builds use `react-native-google-mobile-ads@16.3.4` (Play Services Ads **25.0.0**). Newer 16.4+/16.5 pull Ads 25.4.0 which requires Kotlin metadata 2.3.0 while Expo SDK 57 library modules still compile with Kotlin 2.1.x.

## Next stages (not this document)

1. Apple TestFlight / App Store preparation
2. Google Play preparation
