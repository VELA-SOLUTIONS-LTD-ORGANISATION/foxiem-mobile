# Google Play production audit (Foxiem 2.0)

Date of this pass: 5 October 2026. Play Console as `solutionvela@gmail.com` / VELA SOLUTIONS LTD. Official sources used: [target API](https://developer.android.com/google/play/requirements/target-sdk), [Play Console Help target API](https://support.google.com/googleplay/android-developer/answer/11926878), [Billing Library deprecation](https://developer.android.com/google/play/billing/deprecation-faq), [screenshots](https://support.google.com/googleplay/android-developer/answer/9866151), [account deletion](https://support.google.com/googleplay/android-developer/answer/13327111), [User Data](https://support.google.com/googleplay/android-developer/answer/10144311), RevenueCat [Play credentials](https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials) and [RTDN](https://www.revenuecat.com/docs/platform-resources/server-notifications/google-server-notifications).

This document is the source of truth for what was **verified in dashboards and source**, not a claim that Production 2.0 was submitted.

## Official requirements (October 2026)

| Topic | Verified fact |
| --- | --- |
| Target API | New apps and **updates after 31 August 2026** must target Android 16 / API **36**. Phone Foxiem is not Wear/Auto/TV. |
| Billing Library | PBL **7** new-update deadline 31 August 2026, extension **1 November 2026**. PBL **8** deadline 31 August 2027. Integrate docs currently show **9.1.0**. Foxiem must not ship PBL 7. |
| RevenueCat | `react-native-purchases` **10.10.2** → `purchases-hybrid-common` **19.3.1** → Play Billing Library **8.3.0** (RevenueCat version matrix). Lifetime must be **non-consumable** or PBL 8 cannot restore consumed OTPs. |
| Screenshots | Minimum two device-type shots to publish; 1080×1920 9:16 recommended for large-format. JPEG/24-bit PNG, no alpha. |
| Account deletion | If the binary allows account creation: in-app path **and** a working public web resource named in Play Console. |

## Live Play app (today)

| Field | Value | Status |
| --- | --- | --- |
| Package | `co.uk.solutionvela.foxiem` | PASS |
| Play app id | `4972859522205405089` | PASS |
| Developer | `9190726442346930166` | PASS |
| Track | Production **Active**, 100% rollout, 178 countries | PASS (1.0.x live) |
| Live version | **1.0.4**, versionCode **11**, target SDK **36**, min API 24+ | PASS vs target API |
| Installs (dashboard) | ~501 / listing 502 | — |
| Last production **binary** | 25 Sept 2026 | PASS (1.0.4) |
| Foxiem row last updated | 5 Oct 2026 | Listing/metadata may have published while binary stayed 1.0.4 |
| Managed publishing | Off | PASS |
| Publishing overview | App update published notice; live release still 25 Sept | BLOCKED mismatch risk |

Repo `app.json` version is **2.0.0**. Any 2.0 AAB must use `versionCode` **> 11** (EAS `autoIncrement` / remote).

Live listing still describes **no account** and **advertising**. That matches **1.0.4**, not 2.0. Do not publish 2.0 screenshots onto the live listing while 1.0.4 is what users install.

## Source inventory (2.0 codebase)

| Item | Fact |
| --- | --- |
| Expo | SDK 57.0.26 |
| React Native | 0.86.3 |
| applicationId | `co.uk.solutionvela.foxiem` |
| Billing | Via RevenueCat only; `react-native-purchases` 10.10.2 |
| Entitlement | `pro` |
| Products | `foxiem_pro_monthly`, `foxiem_pro_yearly`, `foxiem_pro_lifetime` |
| Ads | No `react-native-google-mobile-ads` in 2.0 (`releaseConfig.test.ts`) |
| Analytics | Firebase allow-list, default OFF (`setAnalyticsEnabled`, manifest defaults false) |
| Sentry | Crash-focused, `sendDefaultPii: false`, opaque user id |
| Account | Optional; `POST /api/account/delete` with step-up token; local tracker store is independent |
| Screenshot mode | `__DEV__ && EXPO_PUBLIC_STORE_SCREENSHOTS===1` only |
| Developer panel | Required behind `__DEV__` |

Merged production manifest / AAB permission list: **PENDING EXTERNAL** until a 2.0 AAB is built and inspected in App Bundle Explorer. Expected classes: `INTERNET`, network state, `BILLING`, notifications (`POST_NOTIFICATIONS` and related), widget bind, FCM receive if Firebase is in the binary, haptics vibrate. Must not ship advertising ID collection as on.

## Google Play products

| Product | Play Console | Status |
| --- | --- | --- |
| `foxiem_pro_monthly` | Subscription, Monthly auto-renewing, Active, 175 countries | PASS |
| `foxiem_pro_yearly` | Subscription, Yearly auto-renewing, Active, 175 countries | PASS |
| `foxiem_pro_lifetime` | One-time, purchase option `lifetime` / Buy, Active, 174 countries | PASS (Play side) |

Pricing was not changed.

## RTDN

Play Monetisation setup: notifications **enabled**, topic `projects/baby-namer-vela/topics/Play-Store-Notifications`. Selected content: **Subscriptions and voided purchases only** (radios disabled in UI). RevenueCat Play app: credentials **Valid**, Google notifications **Connected**, last received **2026-09-30**.

RevenueCat docs require **subscriptions, voided purchases and all one-time products** when selling lifetime. Lifetime refunds may lag until the customer opens the app.

| Item | Status |
| --- | --- |
| Credentials exist and validate | PASS (do not rotate) |
| Topic connected | PASS |
| One-time products in RTDN content | BLOCKED (needs Play radio change; UI was read-only this session) |

## Privacy / App content (2.0)

| Item | Status |
| --- | --- |
| Policy URL https://foxiem.com/privacy loads HTTPS | PASS — Console field is this URL (re-verified 5 Oct 2026) |
| Policy matches 2.0 (no ads; optional account; RC; Sentry; deletion) | FIXED — live page dated 5 October 2026 |
| In-app policy link | PASS (`EXTERNAL_LINKS.privacyPolicy`) |
| In-app account delete | PASS in source (Settings, step-up) — only if production env enables accounts |
| Public web deletion URL | FIXED — https://foxiem.com/delete (HTTPS, no login, email request to support@solutionvela.co.uk) |
| Play Console account-deletion URL field | PENDING EXTERNAL — Ads / Data Safety / deletion forms redirected to app-list in this session |
| Data Safety vs 2.0 | BLOCKED — form must be updated **with** 2.0 AAB; live binary is still ads 1.0.4 |
| Ads declaration for 2.0 | BLOCKED — `/app-content/ads` bounced to app-list; live 1.0.4 still had ads. Set **No ads** only after 2.0 AAB |
| App Access | BLOCKED until 2.0 on Internal + license testers. Draft: `store/google-play/reviewer-notes.md` |

## Store listing (repo)

Human copy for app locales `en`, `tr`, `de`, `fr`, `es`, `it` is in `store/google-play/{en-GB,tr-TR,de-DE,fr-FR,es-ES,it-IT}/`. Phone screenshots: `store-assets/raw/{locale}/android/phone/` (1080×1920 set of 6). Feature graphic exists at `store/screenshots/play-feature-graphic.png`.

Play Console Foxiem last-updated **5 Oct 2026**. On the same day the Publisher API **committed** 2.0 localized listings and **36** phone screenshots (6 locales × 6). Live **binary** remains **1.0.4 vc11** until the vc14 production AAB is reviewed. That listing-vs-binary gap is a policy risk until 2.0 is in Production.

## App Store (prepared; review not submitted)

Copy: `store/app-store/` (en-GB, tr, de-DE, fr-FR, es-ES, it-IT). Character limits checked. Screenshots: iPhone 6.9 and iPad 13, six locales, six shots. **Watch screenshots BLOCKED** if FoxiemWatch ships. App Review **not submitted**.

## Build / tests / AAB

| Check | Status |
| --- | --- |
| typecheck / lint / tests / expo-doctor | PENDING EXTERNAL (not completed in this pass) |
| Production AAB 2.0 | PENDING EXTERNAL — EAS vc14 started 5 Oct 2026: https://expo.dev/accounts/vela-solution-ltd/projects/foxiem/builds/f5d3d9df-814b-46b4-87aa-6789e375a6ba |
| Pre-launch report for 2.0 | PENDING EXTERNAL |
| Play-installed purchase tests | BLOCKED — 2.0 not on Internal; no live RC transactions |
| Production review submit | Not done (blockers) |

## Next actions (owner + engineering)

1. In Play Console, set the account-deletion URL to `https://foxiem.com/delete` (web page is live; Console field not confirmed this session).
2. Switch RTDN notification content to include one-time products (Play Console → Monetisation setup). UI was read-only earlier.
3. Confirm EAS production env has public RC Android key, API URL, Google web client; SHA-1/256 of **Play App Signing** on the Android OAuth client.
4. `eas build --profile production --platform android` so versionCode > 11; inspect bundle (target 36, billing 8+, permissions, no screenshot routes).
5. Internal testing + license testers: monthly, yearly, lifetime, restore, guest→sign-in, expiry does not wipe local data.
6. With the 2.0 AAB: Data Safety, Ads = no, App Access from `store/google-play/reviewer-notes.md`.
7. Do **not** submit Play Production or App Review until section R is PASS. iOS: Watch screenshots or drop Watch from that binary first.
