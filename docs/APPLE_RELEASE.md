# Foxiem — Apple Store release status

Last updated: 2026-09-12

## Final status (current)

**IOS WAITING FOR REVIEW (build 6 — monetized)**

See actionable list: [`store/OWNER_ACTIONS.md`](../store/OWNER_ACTIONS.md)

| Field | Value |
|-------|--------|
| ASC status | **Waiting for Review** (submitted ~2026-09-12 18:03) |
| Version | 1.0.0 |
| Build for review | **6** (commit `1d1bbf7`, real AdMob App IDs + units) |
| Superseded | Build **5** removed — must **not** ship as public final |
| Release mode | **Automatically release this version** (saved while Waiting for Review) |
| Review contact | Filled |

Cannot go App Store LIVE until Apple Approves. Auto-release is set so it should publish after approval without a further Manual Release click.

## Security

| Item | Status |
|------|--------|
| Exposed Expo token rotated | **YES** — `eas whoami` → `foxiem-github-actions` (robot) |
| GitHub `EXPO_TOKEN` updated with replacement | **YES** — `updated_at` **2026-09-12T11:28:02Z** |
| Local `.expo-token` valid | **YES** (gitignored; value never printed) |
| Expo robot for CI | **YES** — `foxiem-github-actions` (Developer) |
| Token value in git / chat / workflow | **Chat paste occurred** — treat as re-exposed; revoke + recreate via `paste-expo-token.ps1` when practical (do not paste into chat again) |
| Optional workflow | `.github/workflows/ios-submit.yml` added (manual, explicit build ID only) |

### Owner action required (token is one-time visible in the browser)

**Easiest path (recommended):**

```powershell
cd c:\Users\hkuzudisli\Desktop\foxiem-mobile
powershell -File scripts\paste-expo-token.ps1
```

That opens Notepad on `.expo-token`. Paste the Expo token (one line), save, close Notepad. The script sets the GitHub secret and runs `eas whoami` without printing the value.

Then reply in chat: `token rotated`

Manual alternative:

1. Copy token from Expo Access Tokens (robot **foxiem-github-actions**)
2. Save as a single line in `foxiem-mobile/.expo-token` — **do not paste into chat**
3. Run: `powershell -File scripts/set-expo-token-secret.ps1`
4. Reply: `token rotated`


## Source

- Repo: `foxiem-mobile` / `master`
- Commit: `337f656` (clean working tree)

## EAS iOS build (reuse — do not rebuild)

| Field | Value |
|-------|--------|
| Build ID | `c1b47ad6-4084-4a41-ad79-c37d4698fd38` |
| Platform | iOS |
| Distribution | App Store (`iOS App Store build`) |
| Version | 1.0.0 |
| Build number | **5** |
| Artifact | **IPA** (download available) |
| Bundle ID | `co.uk.solutionvela.foxiem` (project) |
| Status | **Finished** (re-verified 2026-09-12 via Expo dashboard) |
| SDK | 57.0.0 |
| Profile / env | production / production |
| Git commit on build | `504c5a0` (docs commit `337f656` is later; no rebuild for docs-only) |

Android: **untouched** this release track.

## EAS Submit config

```json
"submit": {
  "production": {
    "ios": {
      "ascAppId": "6811348160"
    }
  }
}
```

Configured from live ASC app URL `…/apps/6811348160/…`.

## App Store Connect

| Item | Status |
|-------|--------|
| Foxiem app record | **YES** — iOS 1.0 Prepare for Submission |
| Apple ID (ascAppId) | **6811348160** |
| Bundle ID | `co.uk.solutionvela.foxiem` (New App form) |
| SKU | `foxiem-ios` |
| ASC API key for EAS Submit | **YES** — Key ID `359Z68CNMD` on EAS servers (`[Expo] EAS Submit`); Issuer `a04d5b3c-3ea9-430b-bcf7-bba45bb29099` |

## TestFlight

| Item | Status |
|------|--------|
| Build 5 uploaded | **YES** — EAS submission `98da815f-8a40-4438-bd8a-60d57bcd4ab3` (2026-09-12) |
| Processed | **YES** — ASC shows upload **Complete**; build status **Ready to Submit** (expires in 90 days) |
| Device QA | **PENDING** — internal group **Foxiem Internal** (1 build); tester Hakan invited — install via TestFlight app; ASC shows **INSTALLS –** (no install yet as of 2026-09-12 re-check) |
| TestFlight URL | https://appstoreconnect.apple.com/apps/6811348160/testflight/ios |

## Screenshots (validation)

ASC-ready exports in `store/screenshots/` (from owner marketing compositions):

| Set | Count | Exact size | Alpha | Programmatic OK |
|-----|------:|------------|-------|-----------------|
| iPhone | 3 | **1260×2736** | none (RGB) | **YES** |
| iPad | 3 | **2064×2752** | none (RGB) | **YES** |

Story order: Count what matters → See your progress → Make it yours.

Caveat: sources arrived via chat at lower resolution; exports are upscaled. Prefer replacing with native high-res masters before App Review if available.

### Screenshot content accuracy (Phase 30)

| Asset | Issue vs shipping app |
|-------|------------------------|
| iPhone set | Tabs show Home / Statistics / Profile — **matches** `MainTabNavigator` |
| iPad `01-count-what-matters` | Tab bar patched to **Home / Statistics / Profile** (matches shipping app). Consistency banner was repaired programmatically — prefer owner remaster if the cream text box looks off before ASC upload. |

Do **not** upload `foxiem-web/public/images/*-screen.png` (512×1024).

## Privacy / support

| Item | Status |
|------|--------|
| `https://foxiem.com/privacy` HTTPS | **YES** (200, SPA route live) |
| Policy mentions AdMob / local data | **YES** (product privacy page) |
| Legal “final policy” disclaimer | Present on page — legal sign-off still owner decision |
| Support email / support URL | **SUPPORT CONTACT REQUIRED** (`VITE_SUPPORT_EMAIL` empty → placeholder contact copy) |
| Marketing URL | `https://foxiem.com` |

## App binary notes (from source — not App Privacy form answers yet)

- SDK: Expo 57; ads: `react-native-google-mobile-ads@16.3.4`
- Production App IDs in `app.json`: Android `~1127078474` / iOS `~1517960718`
- Production banner units (wired in `src/ads/adConfig.ts`): iOS Statistics `/4723929748`, iOS Activity History `/3370098436` (+ Android pair)
- `__DEV__` always uses Google test banner ID; missing native module fail-closes (no request)
- ATT / tracking description: **not** configured (do not add ATT unless required)
- Local data: `AsyncStorage` only (profile, counter, history, reminders, language)
- Notifications: `expo-notifications` local scheduling — no Foxiem push server
- Networking beyond ads: HTTPS opens for public links only (`externalLinks`)
- `ITSAppUsesNonExemptEncryption`: `false` in `app.json`
  - Reasoning draft: app uses standard OS TLS / platform crypto only; no custom encryption implementation found in Foxiem source. Final App Store answer still owner-confirmed.

## App Store Connect version 1.0 (ASC)

| Item | Status |
|------|--------|
| Listing fields saved | **YES** — promo, description, keywords, marketing URL, copyright, review notes |
| Localizations | **YES** — **en-GB** (primary/fallback) + **tr**, **de-DE**, **fr-FR**, **es-ES**, **it** (app-supported languages). Other App Store languages fall back to English. See `store/listing-locales.md` |
| App Information | **YES** — subtitle `Small counts. Big progress.`; Primary **Productivity**; Secondary **Lifestyle** |
| Content Rights | **YES** — third-party content rights affirmed (AdMob SDK) |
| Support URL | **YES** — `https://foxiem.com/privacy` (live privacy/support-adjacent page; set when dedicated contact email is configured) |
| Review contact | Name may be filled in UI; Iris `appStoreReviewDetail` is **null** until email+phone provided (`+` country code) |
| Sign-in required | **Off** |
| Release | **Manually release this version** |
| Build for 1.0 | **5** (1.0.0) attached; Iris build `usesNonExemptEncryption: false` |
| Screenshots in ASC | **YES** — iPhone 6.5" set (3) + iPad Pro 12.9" set (3); asset state **COMPLETE** (uploaded 2026-09-12 via Iris) |
| Privacy Policy URL in App Privacy | **YES** — `https://foxiem.com/privacy` |
| App Privacy data practices | **YES** — 6 types; Not Linked; **Published** 2026-09-12 by Hakan Kuzudisli |
| Age Ratings | **DONE** — **4+** (Advertising = Yes); saved 2026-09-12 |
| Add for Review | **Not clicked** (stop line) |

## Draft App Store listing copy

Saved into ASC English (U.K.) from `store/listing-copy.md` (Support URL still pending).

## Automation

- `.github/workflows/ios-submit.yml` — `workflow_dispatch` only; requires identical explicit EAS build UUID inputs; uses `--id`; no push trigger; does not submit for App Review.

## Evidence audit (2026-09-12)

| Objective item | Evidence | Result |
|----------------|----------|--------|
| Rotate EXPO_TOKEN + GitHub secret (never print) | `eas whoami` → `foxiem-github-actions`; `gh secret list` EXPO_TOKEN `2026-09-12T11:28:02Z` | **Done** |
| Reuse EAS build `c1b47ad6…` 1.0.0 / 5; no rebuild; no Android | `eas build:view` Status finished, store, Version 1.0.0, Build 5 | **Done** |
| EAS Submit → ASC → TestFlight | Submission `98da815f…`; TF build 5 Ready to Submit; group Foxiem Internal | **Done** |
| Device QA | ASC INSTALLS **–** | **Pending owner** |
| Screenshots | Iris: iPhone 6.5 ×3 COMPLETE; iPad ×3 COMPLETE; UI 3 of 10 each | **Done** |
| Privacy / App Privacy | Privacy URL `https://foxiem.com/privacy`; 6 data types; Not Linked | **Done** |
| Age / compliance | Age declaration `advertising: true`; build `usesNonExemptEncryption: false` | **Done** |
| Metadata gaps | Support URL null; review phone required | **Pending owner** |
| Build 5 on version 1.0 | Attached; Manual release | **Done** |
| Docs + optional `ios-submit.yml` | `docs/APPLE_RELEASE.md`, checklist, workflow present | **Done** |
| STOP before Submit for Review | Add for Review not clicked | **Honored** |

**Final status:** `IOS BINARY UPLOADED — TESTFLIGHT QA PENDING` (allowed terminal status while device QA + support/phone remain owner-gated).

