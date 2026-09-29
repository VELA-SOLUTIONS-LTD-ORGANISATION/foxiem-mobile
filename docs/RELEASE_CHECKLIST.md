# Foxiem release checklist (2.0)

Use before a store-facing build. 2.0 removes ads and the profile, adds intent-based trackers, and migrates 1.0.x data on first launch (`docs/DATA-MIGRATION.md`).

## Build

- [ ] Fresh native build with EAS (`eas build --profile production`). 2.0 removes `react-native-google-mobile-ads` and adds `expo-haptics`, `expo-sharing` and `expo-file-system`, so an OTA update or Expo Go is not enough.
- [ ] `npm run typecheck`, `npm run lint` and `npm test` pass; `npx expo-doctor` passes.
- [ ] Version is 2.0.0 in `app.json`; build numbers come from EAS (`appVersionSource: remote`).

## Upgrade from 1.0.x (on a device that has 1.0.4 installed with data)

- [ ] Install 2.0 over 1.0.4: every counter appears with the same number, the open counter is first, no onboarding, the what's-new banner shows once.
- [ ] 1.0.x reminders still fire with their original message.
- [ ] Kill the app during the first launch, relaunch: nothing is duplicated or missing.

## Product (physical iPhone and Android phone, light and dark)

- [ ] New user: Welcome → template → Create tracker → count, in under 30 seconds.
- [ ] Custom tracker for each intent: Just count, Reach, Stay under, Reduce, Build consistency.
- [ ] Rapid taps (20+ in a few seconds) all count; Undo reverts the burst; haptics fire.
- [ ] Reaching a target: one ring pulse, check mark, success haptic. Stay under never turns red.
- [ ] Period rollover: a daily tracker starts fresh after midnight without losing history.
- [ ] History: add a past entry, edit amount/time, delete with Undo.
- [ ] Reminders: allow, deny and "Don't allow" → Open Settings; a reminder fires at the chosen time and opens its tracker.
- [ ] CSV export opens the share sheet on both platforms.
- [ ] Reset Foxiem returns to Welcome and leaves no trackers behind.
- [ ] Six languages switch without missing text; check German and French at the smallest phone.
- [ ] VoiceOver and TalkBack: Home rows read name, value and status; + and − are labelled; the count is announced.
- [ ] Largest text size: Home, Detail and Settings remain usable.

## Pro and purchases

- [ ] Production builds show **no** Pro surfaces until a store adapter ships: `createPurchaseAdapter` returns `unavailableAdapter` outside `__DEV__` (covered by `src/__tests__/releaseConfig.test.ts`).
- [ ] Before selling Pro: create `foxiem_pro_monthly`, `foxiem_pro_yearly` and `foxiem_pro_lifetime` in App Store Connect and Play Console, implement `PurchaseAdapter` (RevenueCat or StoreKit 2 / Play Billing), verify purchase, restore, renewal, cancellation, grace period, billing retry, refund and expiry in sandbox, add a Terms of Use URL (`EXTERNAL_LINKS.termsOfUse`) and fill in the store subscription metadata.

## Store declarations to update for 2.0

- [ ] **App Store Connect → App Privacy:** remove advertising data and third-party advertising; keep "Product interaction / Other usage data" for Firebase Analytics, not linked to identity and not used for tracking.
- [ ] **App Store Connect:** no App Tracking Transparency prompt is used; "No" for tracking.
- [ ] **Play Console → Data safety:** remove the Google Mobile Ads entries (advertising ID, ads); keep app interactions for analytics; declare that data is not shared.
- [ ] **Play Console → Ads:** "No, my app does not contain ads".
- [ ] **app-ads.txt** is no longer required.
- [ ] Store listing copy and screenshots no longer mention ads or the profile; describe the five ways to count.
- [ ] Privacy Policy at https://foxiem.com/privacy matches Settings → Privacy: local storage, no account, anonymous Firebase Analytics events that the user can switch off, no advertising.
- [ ] EEA/UK: decide whether anonymous analytics needs a consent prompt; 2.0 ships an in-app opt-out (Settings → Privacy) and no consent SDK.

## Before tagging

- [ ] `store/` listing files and `scripts/apply-aso-store-config.mjs` updated for 2.0 copy.
- [ ] Release notes: "Foxiem now counts with intent. Give each counter a target, a limit or a rhythm, and see how it changes."
