# Foxiem — Google Play release status

Last updated: 2026-09-12

## Final status (current)

**ANDROID INTERNAL TESTING SUBMISSION VERIFIED**

EAS Submit uploaded versionCode **7** (1.0.0) to Google Play **Internal testing** as a **draft** release. Production was not touched.

## Google Play / service account

| Field | Value |
|-------|--------|
| App | Foxiem |
| Package | `co.uk.solutionvela.foxiem` |
| Play App ID | `4972859522205405089` |
| Service account (submit) | `expo-upload@baby-namer-vela.iam.gserviceaccount.com` |
| Play permissions | YES — Foxiem app-scoped (testing tracks + related; not Production rollout admin) |
| Dedicated SA created | `foxiem-eas-submit@…` (keys exist in GCP; Play invite blocked by Console form — reused `expo-upload` instead) |

## Expo / EAS

| Field | Value |
|-------|--------|
| Project | `@vela-solution-ltd/foxiem` |
| Google Play Service Credential on EAS | **YES** (`expo-upload@baby-namer-vela…`) |
| Build ID (source of truth) | `aaea7ba8-6195-475a-aaaf-c34e0199a3e9` |
| Version / versionCode | 1.0.0 / **7** |
| Artifact | AAB (production) |
| Local copy | `store/android-builds/foxiem-1.0.0-vc7.aab` |

## Submission

| Field | Value |
|-------|--------|
| EAS Submission ID | `a730ee6f-b9da-48b8-bf44-597d9481e7b2` |
| Status | FINISHED / success (`Submitted your app to Google Play Store!`) |
| Track | `internal` |
| Release status (eas.json / upload) | `draft` |
| Play Console | Internal testing → Draft release **1.0.0** with app bundle **7 (1.0.0)** |
| Production | **NOT RELEASED** |

Details: https://expo.dev/accounts/vela-solution-ltd/projects/foxiem/submissions/a730ee6f-b9da-48b8-bf44-597d9481e7b2

## eas.json submit profile

```json
"submit": {
  "production": {
    "android": {
      "track": "internal",
      "releaseStatus": "draft"
    }
  }
}
```

No production track. No rollout fraction. No `--auto-submit` on builds.

## GitHub Actions

| Field | Value |
|-------|--------|
| Workflow | `.github/workflows/android-submit.yml` |
| Trigger | `workflow_dispatch` only |
| Build ID | Explicit input `eas_build_id` (never `--latest`) |
| Auth | `EXPO_TOKEN` GitHub secret |
| Google JSON in GitHub | **NO** (uses EAS-stored Play submit credential) |
| Environment | `production` (if configured on the repo) |

## Pre-launch report

Status: **not available / pending** at verification time (do not invent results). Check Play → Test and release → Pre-launch report after the internal release is processed.

## Security

| Check | Result |
|-------|--------|
| JSON committed | NO |
| Temporary local JSON removed | YES |
| Google password stored | NO |
| Google key exposed in chat/logs | NO |

## Still open (non-blocker for internal AAB transfer)

These remain for store listing / production readiness — **not** required to prove Internal Testing upload:

1. Upload store graphics (icon, feature graphic, phone + tablet screenshots)
2. Add listing translations (tr / de / fr / es / it)
3. Complete Internal Testing activation (testers + Preview and confirm) if you want installable internal track
4. **Do not** production rollout unless explicitly authorized

## App content / store settings (already done)

Privacy, ads, ratings, data safety, audience, Productivity category, contact `solutionvela@gmail.com`, website `https://foxiem.com`, en-GB listing draft text — see earlier checklist entries.
