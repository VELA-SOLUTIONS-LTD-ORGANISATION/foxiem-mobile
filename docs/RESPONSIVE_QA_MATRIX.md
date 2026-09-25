# Responsive QA Matrix

Foxiem Stage 13 companion document.

Automated Jest tests cover breakpoints, padding tokens, locale parity, and structural contracts.
They **cannot** prove pixel-perfect layout, safe areas, native pickers, VoiceOver/TalkBack, or real notification delivery.

Use this matrix on simulators/emulators and physical devices before release.

## Representative viewports (QA only)

| Class | Size |
| --- | --- |
| iOS compact | 320 × 568 |
| iOS standard | 375 × 667 / 390 × 844 |
| iOS large | 414 × 896 / 430 × 932 |
| Android compact | 360 × 640 |
| Android standard | 412 × 915 (approx) |
| Android large | 480 × 960 |

Do **not** hardcode these sizes in production logic.

## Screens to verify

For each viewport, check:

| Screen | No clip | No horizontal overflow | Scroll | Header / safe area | Buttons reachable | Text wraps | Touch ≥ 44 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Profile Setup | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Home | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Statistics | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Activity History | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Consistency | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Profile | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Reminders | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Reminder Editor | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Language | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Privacy | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| About | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

## Font scale

Repeat key screens at:

- Default
- Large
- Accessibility / very large

Priority screens: Profile Setup, Edit Profile, Reminder Editor, ConfirmDialog, Privacy, About.

## Languages

Minimum visual pass:

- English
- German (long strings)
- Turkish

Ideal: all six (`en`, `tr`, `de`, `fr`, `es`, `it`).

## Orientation

iOS stays portrait. Android does not lock orientation or resizability, so large screens and Android 16 can rotate and resize the app. Layouts should stay usable in landscape on a tablet-width window.

## Native-only QA (not replaced by Jest)

Run on **real iOS and Android devices**:

- Native time picker (Add/Edit Reminder)
- Notification permission prompt
- Notification fire + tap
- Android hardware Back
- Keyboard insets on forms
- Safe areas / notches
- VoiceOver
- TalkBack
- OS font scaling
- Cold restart persistence (counter, history, reminders, language)

## Home compact checklist

At compact height/width, confirm hierarchy remains:

1. Count
2. Mascot
3. +1
4. Quick actions

No core action may disappear. Touch targets stay ≥ 44.

## Consistency week row

At width 320, all 7 weekday markers remain visible with no horizontal ScrollView.

## AdMob banners (Stage 14)

Verify on native builds at widths **320 / 360 / 375 / 390 / 414 / 430 / 480**:

| Check | Statistics | Activity History |
| --- | --- | --- |
| No horizontal clip / overflow | ☐ | ☐ |
| No overlay on chart / list rows | ☐ | ☐ |
| Not touching bottom tabs | ☐ | ☐ |
| Clear separation from Foxiem cards | ☐ | ☐ |
| No huge empty reserved block when unloaded | ☐ | ☐ |
| Empty history remains ad-free | n/a | ☐ |

Home may show a compact top banner. It must not overlap the counter or `+1` at any width.
