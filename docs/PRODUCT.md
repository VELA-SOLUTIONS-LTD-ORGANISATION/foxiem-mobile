# Foxiem product model

**Foxiem — Count with intent.** Count what matters. Understand your progress.

Foxiem is a personal count & progress tracker. Every tracker has an intent that answers "what should this number do?". Counting stays one tap; understanding grows around it over time.

## Intents

| Intent (internal) | User-facing choice | Periods | Setup asked | Hero reads |
|---|---|---|---|---|
| `count` | Just count it | all time (default) or resets daily/weekly/monthly | nothing | "128 · total", "19 this month" |
| `reach` | Reach a target | day, week, month, all time | how many, every … | "6 of 8 today", "2 to go" |
| `limit` | Stay under a limit | day, week, month | the limit, every … | "2 of max 3 today", "1 left" |
| `reduce` | Reduce it over time | compared by day, week or month | how often to compare; optional "usual amount" as a starting point | "24 this week", "↓ 17% vs last week" |
| `consistency` | Build consistency | weekly rhythm | days per week (1–7) | "3 of 4 days this week" |

Intent changes Home status lines, Tracker Detail hero and meter, completion feedback, streak rules, insights, reminder copy, weekly review lines and empty states.

**Comparisons are like-for-like.** "vs last week" compares this week so far with the same point last week, and only when the tracker existed for the whole comparison window. Otherwise Foxiem says there is not enough history yet.

**Consistency before streaks.** Consistency is the share of recent days (up to 30, never before the tracker existed) that met the tracker's rule: any entry for Just count / Consistency, target met for Reach, within limit for Stay under. Streaks exist but a missed day never erases the consistency picture.

## Navigation

- **Home** — count. All active trackers, one tap to count, tap a row for detail.
- **Insights** — understand. This week across trackers, highlights, reviews and patterns.
- **Settings** — control. Pro, preferences, notifications, data, privacy, about.
- **Tracker Detail** — the number, count keys, this week, consistency, calendar, insights, recent history. Settings, reminders and full history open from here.

The old Statistics, Consistency and Activity History screens merged into Tracker Detail and Insights. Profile was removed: Foxiem is not a social product and no longer asks for a name.

## Free

Multiple trackers, all five intents, targets, limits, daily/weekly/monthly periods, automatic period resets, custom step, unit, starting value, icon, colour, notes, templates, increment/decrement, undo, full event history with add/edit/delete, current and best streak, 30-day consistency, this week and last week comparison, current and previous month calendar, one reminder per tracker plus a general check-in reminder, CSV export of all data, archive, dark mode, six languages, fully offline.

Free is a complete product. Counting, history and the user's own data are never gated.

## Pro — "See what's changing, not just what you counted."

- **Patterns:** weekday and time-of-day patterns, cross-tracker patterns.
- **Progress intelligence:** pace projections, required daily rate, 12-week trends.
- **Your complete story:** full calendar history and yearly heatmap, weekly and monthly reviews.
- **Smarter reminders:** up to five reminders per tracker, progress-aware copy, skipped when the target is already met, suggested time from your history.
- **Reports:** a weekly summary CSV across all trackers.
- **Quiet Hours:** a reminder that would fire inside your quiet window is skipped, not shifted to later.
- **Widgets:** many trackers, a chosen tracker per widget, medium and large sizes, iOS Lock Screen widgets, colour choices and quick minus and plus buttons.
- **Apple Watch:** count from your wrist.

All Pro analytics are deterministic calculations on local events. Nothing is generated text, and every insight has a minimum-data rule; below it Foxiem says what is needed instead.

Free includes one home-screen widget for the primary tracker, with a quick count. Not offered anywhere: sync, backup, Wear OS, Watch complications.

Widgets and the Watch share one contract (`src/widgets/`): the app writes a snapshot of display-ready tracker state to shared storage, and surfaces write presses to an inbox that the app drains idempotently (each press has a unique id; the snapshot lists the ids already applied). The display rules (`resolveDisplay`) run in TypeScript for the app and the Android widget, and are mirrored in Swift for the iOS widget and the Watch (`targets/*/Models.swift`); keep the two in step when changing them. Free users only ever get the primary tracker in the snapshot, so a widget cannot show more than Free allows. Tapping anything else deep-links (`foxiem://tracker/<id>`, `foxiem://pro?feature=widgets`).

**Pro lapsing while the app is closed.** The snapshot carries `proUntil` (epoch ms, `null` for lifetime and Free): the cached entitlement's expiry plus the same offline grace the app uses. Every surface settles the snapshot against the clock when it reads it (`settleSnapshot` in TypeScript, `Snapshot.settled(now:)` in Swift, `isProNow` on the Watch), so a lapsed subscription falls back to Free behaviour (primary tracker only, Pro sizes locked) without the app having to run. The iOS timeline also schedules a refresh at `proUntil`.

**Native text.** Anything the operating system itself shows (widget gallery names and descriptions, Shortcuts parameter titles, VoiceOver verbs, the Watch fallback, the Android widget picker) is translated into all six languages: `Localizable.xcstrings` in `targets/widget` and `targets/watch`, and `values-<lang>/widget_strings.xml` for Android, generated from one table by `scripts/build-string-catalogs.mjs` (`plugins/withNativeLocalization.js` applies them at prebuild and lists all six languages in the Xcode project's `knownRegions`). Text inside a widget or on the Watch that comes from the app (tracker names, captions, "Goal reached", the locked message) is translated by the app in the person's chosen language and travels in the snapshot. Tests (`nativeStrings.test.ts`, `nativeContract.test.ts`) fail if a Swift literal is missing from a catalog or the Swift structs drift from the snapshot.

### When Pro ends

No user data is deleted or hidden. History, trackers, notes and exports stay available. Extra reminders beyond one per tracker are paused (kept, not deleted) and smart reminders fall back to standard ones. Pro-only analysis screens show their explanation again.

## Subscription architecture

- `src/pro/features.ts` — one registry of which capability needs Pro. Screens ask `useFeature(key)`; no entitlement logic lives in screens.
- `src/pro/entitlement.ts` — pure state model: free, active, grace, billing retry, expired, lifetime; offline trust until expiry plus a short grace window.
- `src/pro/purchaseAdapter.ts` — the store boundary: offerings, purchase, restore, refresh, manage URL, plus explicit results (success, cancelled, pending, failed, nothing to restore).
- `src/pro/config.ts` — plan identifiers and reference prices in one place.

**Status: RevenueCat billing is implemented** (`src/pro/revenueCatAdapter.ts`, mapping in `customerInfoMapping.ts`). Entitlements always come from RevenueCat customer info, never from local flags. The Pro entitlement id is `pro`; products are `foxiem_pro_monthly`, `foxiem_pro_yearly` and `foxiem_pro_lifetime`. Localised prices come from the store. No weekly plan; yearly is the highlighted plan, and every plan shows its full billed price.

Configuration is two public SDK keys, `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` (`appl_…`) and `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` (`goog_…`). A release build without a valid key for its platform shows no Pro surface and sells nothing. RevenueCat Test Store keys are rejected in release builds. Development builds use a simulated adapter so every purchase state can be exercised; set `EXPO_PUBLIC_REVENUECAT_IN_DEV=1` to test the real sandbox instead.

The remaining work is dashboard and store setup, listed in `docs/RELEASE_CHECKLIST.md`.

## Guest-first and accounts

Foxiem never asks for an account, email or name. There is no backend, so there is no sign-in UI and no fake sync.

Future account work must follow these rules:

1. Signing in never replaces or clears local data. Guest data uploads as the user's first copy.
2. Trackers and events already have stable unique ids and timestamps, so merging is a union by id. Events never conflict; trackers with the same name on two devices are shown to the user to keep both or combine.
3. Delete account removes server data only after confirmation and keeps the local copy unless the user also resets the app.

## Future platform features

- **Wear OS and Watch complications:** not built. Events carry an optional `source` field so new input surfaces can be added without changing history.
- **Sync / backup:** see accounts above; storage is already sharded per tracker.

## Analytics

Firebase Analytics exists for Google Ads measurement. Foxiem sends only allow-listed events with enum parameters (`onboarding_complete`, `first_count`, `tracker_created` with intent and source, `reminder_enabled`, `paywall_viewed`, `purchase_started`, `purchase_completed`, `review_viewed`, `data_exported`). Tracker names, notes, counts and history are never sent.

**Consent (UK/EU-safe by default):** collection is off at the native level (`app.config.ts` disables Analytics collection and the advertising ID until the app enables it). After the first count, Home shows a one-time card, "Help improve Foxiem?", with "Share anonymously" and "No thanks". Until the answer is yes, `trackEvent` drops every event in JavaScript and native collection, the advertising ID, ad storage and ad personalisation stay off, so nothing is sent or stored for later. Settings → Privacy changes the choice at any time and takes effect immediately. There is no consent SDK and no tracking prompt because nothing is used for tracking.

## Major flows

| Flow | Path |
|---|---|
| New user | Welcome → template or "Create my own" → intent setup → Tracker Detail (first count) → Home |
| Repeat user | Launch → Home → + on a row → leave |
| Custom tracker | Home + → name → intent → setup → Create → Tracker Detail |
| Correct history | Tracker Detail → History → entry → edit or delete; all numbers re-derive from events |
| Reminder | Tracker settings → Reminder → explanation → OS permission → time/days → save; denied state offers Open Settings |
| Pro discovery | Locked section → explanation → paywall → dismiss returns to the same place |
| Existing user | v1/v2 data migrates to v3 on first launch; the old counter appears as "General" (Just count, all time) |
| Reset | Settings → Reset Foxiem → confirm → all `foxiem.*` keys removed and reminders cancelled → Welcome |
