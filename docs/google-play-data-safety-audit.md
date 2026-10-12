# Google Play Data Safety audit (Foxiem 2.0 source)

Date: 5 October 2026. Answers are for the **2.0** application in this repository, not the live Play 1.0.4 ads binary. Google treats SDK collection as the app’s collection. Do not submit this form until the public privacy policy matches it.

Sources: Foxiem source, `app.config.ts`, `google-services.json` presence, RevenueCat, Sentry, Google Sign-In, expo-notifications, Firebase Analytics. Merged AAB not yet inspected — if App Bundle Explorer later shows Advertising ID or extra permissions, revisit.

## Collection principles in code

- Trackers, names, counts, notes, reminders, preferences: **on-device** (`appStorage`). Not sent to analytics (allow-list only).
- Guest-first: account is optional and hidden unless `EXPO_PUBLIC_API_URL` + Google web client are valid (`src/account/config.ts`).
- Analytics: default **off**; native Firebase collection flags default false; `setAnalyticsEnabled` only after consent (`src/lib/telemetry/analytics.ts`, `app.config.ts`).
- Signing in must not wipe local trackers (`AccountProvider` / store remain separate).
- Account deletion calls `POST /api/account/delete` and signs out; it must not wipe local trackers unless the user separately resets the app.

## Data Safety categories (2.0)

| Category | Collected? | Shared? | Optional? | Purpose | Encrypted in transit | User can request deletion | Why |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Personal info — Email | Yes, **if** Google/Apple sign-in is enabled in the binary and the user signs in | Shared with Foxiem backend for the session; Google/Apple already have it | Optional (guest works) | App functionality (account) | Yes (HTTPS) | Yes (in-app delete + must have web URL) | `AccountUser.email` from API |
| Personal info — Name | Only if the backend stores a username from the IdP | Same as email | Optional | App functionality | Yes | Yes | API may return `username` as email fallback |
| User IDs | Yes when signed in (account id); RevenueCat app user id (anonymous then `logIn`) | RevenueCat, optional backend, Sentry opaque id | Account optional; RC anonymous always if billing configured | App functionality; fraud prevention (store) | Yes | Account id: yes. Anonymous RC id: store-side; not a Foxiem login | `Purchases.logIn`, `setSentryUser` |
| Device or other IDs | Crash diagnostics (Sentry); optional Analytics instance ids when consent granted; FCM/Expo push token if notifications allowed and signed in | Sentry; Firebase if consented; backend for push | Analytics optional; push optional | App functionality; analytics (opt-in); crash | Yes | Push: unregister/delete account. Analytics: withdraw consent. Crash: retention at Sentry | Do **not** declare “no diagnostics” because PII is off |
| Purchase history | Yes if user buys or restores | Google Play; RevenueCat | Optional (no purchase) | App functionality | Yes | Store/RC records; Foxiem cannot erase Play history | Entitlement `pro` |
| App interactions | Yes **only after** analytics consent | Firebase Analytics | Optional | Analytics | Yes | Withdraw consent; limited Firebase deletion | Allow-listed events only |
| Crash logs / diagnostics | Yes if `EXPO_PUBLIC_SENTRY_DSN` is in the binary | Sentry | Tied to shipping a DSN | App functionality | Yes | Privacy policy / Sentry retention | `initSentry`, `attachStacktrace` |
| Location / contacts / photos / audio / health | No in Foxiem product code | — | — | — | — | — | No APIs for these |
| Advertising ID / ads data | Must be **No** for 2.0 if AD_ID is not in the merged manifest and ads SDK is absent | — | — | — | — | — | Confirm on AAB. Manifest sets `google_analytics_adid_collection_enabled=false` |
| Approximate location | No (unless a transitive SDK later appears in the AAB) | — | — | — | — | — | Confirm on AAB |

## Sharing

- **Google Play Billing / Play** — purchase tokens, product ids.
- **RevenueCat** — customer info, entitlements, receipts.
- **Google Sign-In / Apple** — identity tokens at sign-in time.
- **Foxiem API** (`EXPO_PUBLIC_API_URL`) — session, optional push token, entitlement refresh, account delete.
- **Firebase Analytics** — only if consent granted.
- **Sentry** — crash events, opaque user id, device/OS typical of the SDK (not emails).
- **Expo push** — device token when registering.

Do not mark “data is not shared” if those processors run.

## Ephemeral

Identity tokens used for sign-in/step-up are not stored as product content. Session tokens live in SecureStore until sign-out/delete.

## Data Safety vs live policy page

https://foxiem.com/privacy (fetched 5 Oct 2026) matches 2.0: no ads, optional account, RevenueCat, Sentry, opt-in analytics, deletion at foxiem.com/delete. Policy vs **source** is aligned.

The **Play Console Data Safety form** is still for live **1.0.4 ads** until it is rewritten with a 2.0 AAB. Submitting 2.0 Data Safety answers while users install 1.0.4 (or leaving ads answers after 2.0 ships) would contradict User Data policy. Treat form update as **BLOCKED** until the 2.0 artifact is the declared binary.

## Form checklist when the policy is accurate

1. Ads: No.
2. Data collected: Yes (account optional, purchases, diagnostics, opt-in analytics).
3. Data encrypted in transit: Yes.
4. Users can request deletion: Yes — in-app Settings and https://foxiem.com/delete. Point the Console field at that URL.
5. Do not claim data never leaves the device.
