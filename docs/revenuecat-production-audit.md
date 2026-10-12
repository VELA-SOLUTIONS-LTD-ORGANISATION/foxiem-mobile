# RevenueCat production audit (Foxiem)

Date: 5 October 2026. Dashboard project **Foxiem** `73b8ba39`. No credential JSON copied.

## Apps

| Store | RC app id | Bundle / package | Status |
| --- | --- | --- | --- |
| App Store | `appadb76367ae` | `co.uk.solutionvela.foxiem` | Mapped |
| Play Store | `app81f26f5a8f` | `co.uk.solutionvela.foxiem` | Matches Play Console |

SDK seen on Android subscribers: `react-native-purchases` **10.10.2** (100%).

## Service credentials & RTDN

| Check | Result |
| --- | --- |
| Service account JSON uploaded | File saved |
| Validation | **Valid credentials** — do not rotate |
| Google developer notifications | **Connected to Google** |
| Last RTDN received | 2026-09-30, 16:15 UTC |
| Play Console topic | `projects/baby-namer-vela/topics/Play-Store-Notifications` |
| Play notification content | **Subscriptions and voided purchases only** — incomplete for lifetime one-time refunds ([RC RTDN docs](https://www.revenuecat.com/docs/platform-resources/server-notifications/google-server-notifications)) |

## Entitlement

Single entitlement **`pro`** / display name Pro. **6 products** attached (3 App Store + 3 Play). Do not add a second Pro entitlement.

## Play products in RC

| Store product | RC status | Type | Entitlement |
| --- | --- | --- | --- |
| `foxiem_pro_monthly:monthly` | Published | Subscription (base plan monthly) | `pro` |
| `foxiem_pro_yearly:yearly` | Published | Subscription (base plan yearly) | `pro` |
| `foxiem_pro_lifetime` | Published | **Non-consumable** | `pro` |

App Store products exist with the same ids; App Store “Could not check” is an Apple-side status, not used to block Play.

## Current offering

Identifier **`default`**, display name **Foxiem Pro**, 3 packages:

| Package | Identifier | Products |
| --- | --- | --- |
| Lifetime Pro | `$rc_lifetime` | `foxiem_pro_lifetime` (both stores) |
| Monthly Pro | `$rc_monthly` | `foxiem_pro_monthly` / `:monthly` |
| Yearly Pro | `$rc_annual` | `foxiem_pro_yearly` / `:yearly` |

Foxiem paywall maps **store product identifiers**, not `$rc_*` names (`planForProduct` in `customerInfoMapping.ts`). That is compatible.

## Identity

`createRevenueCatAdapter.identify` calls `Purchases.logIn(userId)` when an account appears and `logOut` when it becomes null (anonymous already-logged-out is ignored). Guest purchases should alias onto the Foxiem user id. Restore uses `restorePurchases()`.

## Tested purchases

| Path | Status |
| --- | --- |
| Live RC transactions (this project) | None shown |
| Sandbox monthly / yearly / lifetime on Play-installed 2.0 | **BLOCKED** — not executed this pass |
| Restore / guest→sign-in / expiry without data loss | Covered by unit tests; **device/Play** still required |

Do not ship a build that can charge Play without granting `pro`.
