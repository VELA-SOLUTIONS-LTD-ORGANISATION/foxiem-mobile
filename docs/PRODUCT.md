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

All Pro analytics are deterministic calculations on local events. Nothing is generated text, and every insight has a minimum-data rule; below it Foxiem says what is needed instead.

Not in Pro until they exist: reminder quiet hours, widgets, sync, backup, wearables. They are not advertised.

### When Pro ends

No user data is deleted or hidden. History, trackers, notes and exports stay available. Extra reminders beyond one per tracker are paused (kept, not deleted) and smart reminders fall back to standard ones. Pro-only analysis screens show their explanation again.

## Subscription architecture

- `src/pro/features.ts` — one registry of which capability needs Pro. Screens ask `useFeature(key)`; no entitlement logic lives in screens.
- `src/pro/entitlement.ts` — pure state model: free, active, grace, billing retry, expired, lifetime; offline trust until expiry plus a short grace window.
- `src/pro/purchaseAdapter.ts` — the store boundary: offerings, purchase, restore, refresh, manage URL, plus explicit results (success, cancelled, pending, failed, nothing to restore).
- `src/pro/config.ts` — plan identifiers and reference prices in one place.

**Status: no store integration exists yet.** Production builds use the unavailable adapter, so Pro surfaces, the paywall and restore rows are not shown and nothing pretends to be for sale. Development builds use a simulated adapter so every purchase state can be exercised.

To launch Pro: create `foxiem_pro_monthly`, `foxiem_pro_yearly` and `foxiem_pro_lifetime` in App Store Connect and Play Console, implement `PurchaseAdapter` with RevenueCat or StoreKit 2 / Play Billing in one file, and return it from `createPurchaseAdapter()`. Localised prices then come from the store. No weekly plan; yearly is the highlighted plan, and every plan shows its full billed price.

## Guest-first and accounts

Foxiem never asks for an account, email or name. There is no backend, so there is no sign-in UI and no fake sync.

Future account work must follow these rules:

1. Signing in never replaces or clears local data. Guest data uploads as the user's first copy.
2. Trackers and events already have stable unique ids and timestamps, so merging is a union by id. Events never conflict; trackers with the same name on two devices are shown to the user to keep both or combine.
3. Delete account removes server data only after confirmation and keeps the local copy unless the user also resets the app.

## Future platform features

- **Widgets:** the domain layer (`src/domain/`) is pure TypeScript, so a widget extension can reuse status lines. Needs an App Group / shared storage bridge and native targets (for example `expo-apple-targets` and an Android AppWidget provider). Free: one tracker quick-count widget; Pro: multiple configurations and Lock Screen widgets.
- **Apple Watch / Wear OS:** same domain layer; events carry a `source` field for later input sources.
- **Sync / backup:** see accounts above; storage is already sharded per tracker.

## Analytics

Firebase Analytics exists for Google Ads measurement. Foxiem sends only allow-listed events with enum parameters (`onboarding_complete`, `first_count`, `tracker_created` with intent and source, `reminder_enabled`, `paywall_viewed`, `purchase_started`, `purchase_completed`, `review_viewed`, `data_exported`). Tracker names, notes, counts and history are never sent. Users can turn measurement off in Settings → Privacy.

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
