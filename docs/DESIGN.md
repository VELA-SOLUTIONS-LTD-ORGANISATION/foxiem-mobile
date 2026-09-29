# Foxiem design direction

Foxiem turns counting into progress without making counting complicated. The design has to make one tap feel great and make the understanding around it quiet, honest and easy to read.

## Taste, stated explicitly

- **Calm, precise, tactile, optimistic.** A tool you trust, not a game and not a dashboard.
- **The number is the product.** Numerals get the boldest type, the most space and the only big motion.
- **Colour belongs to the user's trackers.** App chrome is ink on paper. Each tracker brings its own colour, so the app becomes personal as people use it.
- **One memorable interaction: the Count Moment.** Everything else stays still.
- **The fox is a brand moment, not wallpaper.** It appears on first run, in empty states and in Pro, never on every screen.

Named defaults we reject: Inter/Roboto by habit, purple or blue gradients (the old image-based `+1` button), cream backgrounds with a serif and terracotta accent, near-black with one acid accent, glassmorphism, identical rounded card grids with one soft grey shadow, pills for everything, ALL-CAPS eyebrows, 01/02/03 labels, fade-up on every element, confetti, emoji as iconography, KPI tile dashboards, tiny low-contrast metadata.

## Directions explored

Home compositions A–C were rendered as real 390 pt mocks and critiqued before choosing. Type was chosen from a rendered specimen of six pairings using real Foxiem copy, large numerals, tabular digits and Turkish/German diacritics.

### 1. Ledger rows (chosen)
- **Type / numbers:** Bricolage Grotesque ExtraBold numerals right-aligned like a ledger; Figtree for text.
- **Home:** one grouped list; each row is icon, name, intent status line, number and a large + key in the thumb zone.
- **Tracker:** a row with a thin meter (target tick or limit cap) or a trend chip, depending on intent.
- **Count interaction:** + on the row counts instantly; the digits roll, the meter moves and an Undo snackbar appears.
- **Progress:** meters for Reach/Stay under, day dots for Consistency, arrow + percentage for Reduce, nothing for Just count.
- **Navigation:** Home · Insights · Settings tabs; tracker depth lives in Tracker Detail.
- **Personality / premium:** quiet, exact, personal through tracker colours; premium comes from type and restraint.
- **Accessibility:** 52 pt keys with 24 pt gaps, text never relies on colour, rows expose count/decrement actions to screen readers.
- **Strengths:** fastest scan-and-tap loop, scales from 1 to 50 trackers, long names wrap cleanly.
- **Weaknesses:** a column of saturated keys can look like a rainbow (fixed with tinted keys that go solid on press).
- **Scalability:** reorder, archive and grouping slot into a list naturally.

### 2. Instrument tiles
- Two-column tiles with a big number and small + per tracker.
- Strong numbers, but it is the identical-card-grid default, truncates long names, wastes space with 1–3 trackers and shows little intent context. Rejected after rendering.

### 3. Focus deck
- One tracker per screen, swipe between them, huge number and full-width + / −.
- Best possible count moment for a single tracker, but hides everything else and fails "scan Home in a second". Rejected for Home; its hero composition became Tracker Detail.

### 4. Tally instrument (mechanical)
- Odometer digits, ruler tick marks as progress, monochrome with one signal colour.
- Beautiful precision and a great count moment, but cold and technical across a whole app. Its odometer roll and tick-mark meters were kept inside the chosen direction.

### 5. Field notebook
- Naturalist journal: paper texture, serif numerals, hand-drawn tally strokes, the fox in the margins.
- Warm and ownable, but lands on the cream + serif default, pushes Foxiem toward journaling, and hand-drawn tallies read poorly above 20. Rejected.

### 6. Soft hardware
- Every tracker is a physical clicker key with depth; presses sink and split-flap digits flip.
- Very tactile, but neumorphism has weak contrast and accessibility, feels gimmicky and ages fast. Rejected; the press physics survive in the Count Moment.

### 7. Stacks (data-ink)
- Each row leads with a 7-day sparkline; the number is secondary.
- Informative for power users, but turns Home into a BI dashboard and slows down the one-tap loop. Rejected; the 7-day bars moved to Tracker Detail.

### 8. Orbit rings
- A grid of progress rings, one per tracker; tap the ring to count.
- Familiar from fitness apps, but rings mean nothing for Just count or Reduce, labels crowd, and it copies a strong competitor pattern. Rejected.

**Why Ledger rows:** it is the only direction that keeps the one-tap loop instant with many trackers while giving every intent a distinct, honest representation. Boldness is spent where the brief asks: the numerals and the Count Moment.

## The Count Moment

- The + key compresses on press (spring, native driver), a light haptic fires on press-in, and the value commits immediately.
- Digits that change roll: the outgoing digit leaves upward and the new one arrives from below (reversed for −). Unchanged digits stay still, so 9 → 10 feels mechanical and exact.
- The meter animates as part of the same beat; Stay under never turns red.
- Reaching a target gets one restrained celebration: a single ring pulse around the number, a check mark and a success haptic. No confetti.
- Rapid taps never wait for animation. Each change restarts the roll from the current frame; storage coalesces bursts.
- Reduced motion: values update instantly with no roll or pulse; haptics follow the separate haptics setting.

## Design system

Tokens live in `src/theme/`. Components read them through `useTheme()`; nothing hard-codes a colour.

| Token | Light | Dark |
|---|---|---|
| canvas | `#F3F4F1` | `#0E1012` |
| surface | `#FFFFFF` | `#171A1D` |
| sunken | `#ECEDEA` | `#1F2327` |
| line | `#E2E4DF` | `#2A2F34` |
| track (empty meter, chart grid) | `#E4E6E1` | `#30353B` |
| selected (chosen segment) | `#FFFFFF` | `#343A40` |
| ink / secondary / tertiary | `#15171A` / `#50555C` / `#6B7078` | `#F2F3F0` / `#B6BBC1` / `#8E949B` |
| primary action | ink fill, white label | light fill, ink label |
| improvement | `#2E7D4B` | `#6FCB8F` |
| caution (limits, regressions) | `#9A5B00` | `#F0B45A` |
| destructive only | `#B42318` | `#FF8A80` |

- **Tracker colours:** fox, honey, leaf, teal, sky, iris, berry, cocoa, slate. Each has solid, soft, text-safe ink and an on-solid label colour per theme. Honey uses an ink label because white fails contrast.
- **Type:** Bricolage Grotesque 700/800 for numerals and screen titles; Figtree 400–700 for everything else. Both SIL Open Font License 1.1 (Google Fonts), bundled via `@expo-google-fonts`. All numerals use tabular figures. The hero number sizes itself by digit count and does not scale with system text size (it is already very large); all other text scales, capped so layouts hold.
- **Spacing:** 4 pt grid (4, 8, 12, 16, 20, 24, 32, 40, 48).
- **Radii:** 6, 10, 14, 20, 26. Round only for dots and the progress ring pulse.
- **Surfaces:** flat. One grouped surface per list with hairline separators; shadows only on floating layers (snackbar, sheets) with a real scrim.
- **Touch:** 48 pt minimum; row + key 52 pt (48 pt on phones narrower than 360 pt, where the row also uses a 32 pt icon so the name keeps its width); detail keys 64 pt; − is smaller and separated from + so they are not confused.
- **Screen readers:** every count is announced ("Water: 4", plus "Target reached" on the tap that completes it); Home rows read name, value and status as one element with increment/decrement actions.
- **Motion:** quick 140 ms, base 220 ms, slow 360 ms; emphasized deceleration for arrivals. No entrance animations on lists.
- **Icons:** Ionicons outline for interface chrome; Material Community Icons for tracker glyphs inside tinted tiles. No emoji.

## Intent language

Intent is never communicated by colour alone.

| Intent | Home status | Visual | Completion |
|---|---|---|---|
| Just count | "19 this month" | number only | none |
| Reach | "2 to go today" | meter toward a target tick | check + one pulse |
| Stay under | "1 left today" | meter with a limit cap | "Limit reached" in caution ink; overflow shown as "1 over" |
| Reduce | "↓ 17% vs last week" | arrow + words, improvement or caution tint | none; trend is the reward |
| Build consistency | "3 of 4 days this week" | day dots | check when the week's rhythm is met |

## Visual QA protocol

Screens are rendered at 320, 390 and 430 pt in light and dark, with 1, 5 and 20 trackers, long names, large values and permission-denied states. After each pass, the three weakest decisions are written down and fixed before the next pass. Results are recorded at the end of this file.

## Visual QA results

Rendered with Expo web at device sizes (320 × 568, 390 × 676, 430 × 676) using sample data for every intent, then checked in English, German, Turkish and Italian. Permission-denied reminders, first run, migration and reset were also exercised in `src/__tests__/appFlows.test.tsx`.

**Pass 1 (390, light and dark).** Weakest decisions and fixes:

1. Insights "This week" repeated Home's today status. It now summarises the week per intent ("Target reached on 3 of 5 days", "4 of 5 days this week").
2. Comparisons read "this point last day", and the "level" icon looked like a minus key. Copy is per period ("this time yesterday") and the icon is a neutral level mark.
3. Dark mode's meter track and selected segment were nearly invisible. Added the `track` and `selected` tokens.

Also fixed: the paywall CTA now states the price; Done returns to the feature that opened the paywall; the calendar shades daily goals against the target; the Reduce strip compares with the same point last period.

**Pass 2 (320 and 430, German and Turkish, light and dark).** Weakest decisions and fixes:

1. Tab labels were clipped: the default 49 pt bar is sized for 10 pt labels and ours are 12 pt. The bar is now 56 pt plus the safe area.
2. At 320 pt, long localized captions under the number ("von 7 Tagen") squeezed the tracker name until "Cigarettes" broke mid-word. Compact rows now use a 32 pt icon and a 48 pt key, and the caption may wrap under the number.
3. Segment and picker labels truncated in longer languages ("Am Wochene…", "Mo., 28. S…"). Segmented controls with four or more options use 13 pt labels; the date button gets more width than the time; long labels were shortened per language.

Also fixed: weekly and monthly consistency said "Days the target was reached" while counting weeks; a custom Reach tracker defaulted to "All time" instead of a day; the Turkish hero caption repeated the goal line; reaching a target now shows a check mark next to the status (not only colour).

**Pass 3 (390 English, targeted).** Checked that the pass 2 fixes did not regress the standard layout, and found that dates and times ignored the device region (an en-GB phone showed "02:04 PM"). Formatting now combines the app language with the device region and 12/24-hour setting.
