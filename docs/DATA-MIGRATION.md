# Data migration: Foxiem 1.0.x → 2.0 (storage schema 3)

Foxiem stores everything on the device in AsyncStorage. There is no server copy, so the migration must never lose, duplicate or silently reinterpret anything a 1.0.x user counted.

## Previous storage (1.0.0 – 1.0.4)

| Key | Contents | Written by |
|---|---|---|
| `foxiem.counter` | `{ currentCount }` for the single 1.0.0 counter | 1.0.0 |
| `foxiem.history` | event list for that counter (`id`, `type`, `amount`, `previousValue`, `newValue`, `createdAt`) | 1.0.0 |
| `foxiem.counterDomain` | schema 2: `{ schemaVersion: 2, activeTopicId, topics[], events[] }`, one default topic plus named topics; events carry `topicId` | 1.0.2 – 1.0.4 |
| `foxiem.topicMigrationVersion` | marker for the 1.0.0 → 1.0.2 move | 1.0.2 – 1.0.4 |
| `foxiem.setupCompleted` | onboarding finished | 1.0.x |
| `foxiem.profile` | the name asked for during 1.0.x setup | 1.0.x |
| `foxiem.preferences` | `{ language }` | 1.0.x |
| `foxiem.reminders` | general reminders with a preset `messageKey` | 1.0.x |

## New storage (2.0, schema 3)

| Key | Contents |
|---|---|
| `foxiem.schemaVersion` | `3`, written last |
| `foxiem.trackers` | `{ schemaVersion: 3, trackers: Tracker[] }` (the tracker index) |
| `foxiem.events.<trackerId>` | that tracker's `CountEvent[]`, one shard per tracker so a tap rewrites one small list |
| `foxiem.preferences` | language, appearance, haptics, week start, analytics consent (the 1.0.x `{ language }` shape is still accepted) |
| `foxiem.reminders` | reminders with `trackerId` (`null` = general check-in), `smart`, and the 1.0.x `messageKey` when present |
| `foxiem.firstRun` | `{ completedAt }` |
| `foxiem.notices` | dismissed hints and the one-time "what's new" banner |
| `foxiem.entitlement` | cached Pro state (status, plan, expiry). No receipts, tokens or secrets |
| `foxiem.recovery` | the last five unreadable raw values, kept for support |
| `foxiem.devStore` | development builds only: the simulated store |

Events remain the source of truth. Current values, period totals, streaks, consistency and insights are always recomputed from them.

## How 1.0.x data maps to 2.0

- **Every 1.0.x counter becomes a "Just count" tracker over all time**, which is exactly how 1.0.x behaved. Topic ids are kept as tracker ids and event ids are kept, so the migration is deterministic.
- **The default counter** is named "General" in the user's language. If it was never used (count 0, no events) it is skipped, so nobody gets an empty tracker they never made.
- **The counter that was open in 1.0.x** comes first on Home.
- **Starting value** is the first event's `previousValue`, or the saved count when there is no history. This keeps counts that were entered before history existed.
- **When count and history disagree** (1.0.0 wrote them separately), Foxiem keeps the number the user last saw: it appends one `adjust` event (`source: 'migration'`, id `<topic>.migration-adjust`) that brings the chain to the saved count. History explains it as "Foxiem added this while updating".
- **Reset events** from 1.0.x are kept and still reset the running value.
- **Events with the same timestamp** keep their stored order. They are never reordered by id.
- **Reminders** from 1.0.x become general check-ins (`trackerId: null`), keep their preset message and their schedule, and are grandfathered past the Free limit of one reminder per tracker.
- **Preferences:** the chosen language is kept; new settings start from their defaults.
- **Profile name:** 2.0 has no profile, so the name is no longer shown or used. The key stays on the device and is removed only by Reset Foxiem.
- **Onboarding:** users with data skip the new first run and see a one-time "Foxiem now counts with intent" banner on Home.

## Order of operations and idempotency

On launch, `loadDomain` (in `src/storage/domainStorage.ts`) checks `foxiem.schemaVersion`:

1. **Not 3:** read the 1.0.x keys, run the pure transform in `src/storage/migration.ts`, then write the event shards, then the tracker index, then the version marker. If the app is killed at any point before the marker is written, the next launch runs the same transform from the same untouched 1.0.x keys and overwrites the partial result with identical data. Running it twice is a no-op.
2. **3:** read the index and the shards.

The 1.0.x keys are never modified or deleted by the migration. They remain on the device as a backup.

## Migration record

`foxiem.migration` records progress as `started`, then `staged` (the merged result is fully written to the live keys), then `committed` (schema 3 is in force). It also stores the source (`v1`, `v2`, `none` or `recovery`), an attempt count and timestamps. `foxiem.schemaVersion === 3` remains the single flag the loader trusts; the record explains how the device got there and lets a later launch resume instead of starting over. A rebuilt tracker index sets `recoveredAt`, after which orphaned history is never deleted.

## Failure behaviour

| Situation | What happens |
|---|---|
| Tracker index unreadable (corrupt JSON) | The raw value is quarantined in `foxiem.recovery`, trackers are rebuilt from the 1.0.x backup when one exists, and Home says "Foxiem restored your trackers" and that recent entries may be missing. |
| One event shard unreadable | That tracker opens with no history, the raw shard is quarantined, other trackers are unaffected, and Home says "Some history couldn't be read". |
| Shards with no tracker in the index | Removed, but only after the index parsed successfully, so a broken index can never delete history. |
| A save fails (e.g. the device is out of space) | The in-memory state stays correct, writes keep retrying (latest wins per key), and Home says "Foxiem couldn't save your latest changes". |
| Storage fails during the migration | The 1.0.x keys are never touched. The app shows the migrated counters from memory, the record stays at `started` or `staged`, and the next launch resumes. Trackers created in the failed session are merged by id with the re-migrated data (live edits win, events are unioned, nothing is duplicated). If only the version marker failed, the fully staged result is committed without transforming again. |
| Reset Foxiem | Removes every key that starts with `foxiem.` using `multiRemove`. It never calls `AsyncStorage.clear()`, so other libraries' data is untouched. It does not cancel a subscription. |

## Future account and sync merge

Foxiem 2.0 has no account. When sync arrives, a guest's local data merges by id: tracker ids and event ids are globally unique (`createLocalId`), a merge is the union of events per tracker followed by `rebuildChain`, and nothing is overwritten by an empty remote. Rules are in `docs/PRODUCT.md` under "Guest-first and accounts".

## Tests

- `src/storage/__tests__/migration.test.ts`: v2 topics with every event and count preserved; v1 count-only data; count and history disagreeing (adjust event); interrupted migration re-run; an untouched install; legacy reminders and preferences; a fresh install; corrupt index recovered from backup with quarantine; one corrupt shard isolated; orphan shard cleanup; prefix-only reset.
- `src/__tests__/appFlows.test.tsx`: a 1.x user launches 2.0 and sees their counters with the right counts, no onboarding, the what's-new banner, and the 1.x backup still present.
- `src/domain/__tests__/events.test.ts`: chains stay consistent, including same-timestamp ordering.
