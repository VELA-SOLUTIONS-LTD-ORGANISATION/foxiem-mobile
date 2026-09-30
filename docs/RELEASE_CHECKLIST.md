# Foxiem 2.0 release checklist

Everything the codebase can do without a phone, a store account or a Mac has been done and is covered by automated checks (`npm run typecheck`, `npm run lint`, `npm test`, `npx expo-doctor`). What is left below genuinely needs a store dashboard, Apple or Google credentials, a native build, or a physical device.

Nothing on this list has been run by the engineering pass. In particular the Swift (iOS widget, Watch app, WatchConnectivity module) and the Android widget were written without a compiler for them, so treat their first native build as the first real test.

## 1. Accounts and dashboards

### RevenueCat

- [ ] Create the RevenueCat project with an iOS app (bundle id `co.uk.solutionvela.foxiem`) and an Android app (package `co.uk.solutionvela.foxiem`).
- [ ] Create the products in App Store Connect and Play Console: `foxiem_pro_yearly`, `foxiem_pro_monthly` (subscriptions) and `foxiem_pro_lifetime` (non-consumable / one-time). No weekly plan.
- [ ] In RevenueCat, create one entitlement with the id `pro` and attach all three products.
- [ ] Create an offering, make it **current**, and add packages for the three products. The app also falls back to other offerings, but the paywall reads best from one.
- [ ] Copy the **public** SDK keys into the EAS environment for production builds: `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` (`appl_…`) and `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` (`goog_…`). Never use a Test Store key (`test_…`); release builds reject it.
- [ ] Add a Terms of Use URL (`EXTERNAL_LINKS.termsOfUse` in `src/constants/links.ts`) and fill in the subscription metadata in both stores.
- [ ] Sandbox test on a device: purchase each plan, restore, cancel, renewal, grace period, billing retry, refund and expiry. Confirm Pro turns off and no data disappears.

### Foxiem backend and optional account

The app works fully without an account. The account section (Settings, Account) and the account paragraph in Privacy appear only in builds that have **all** of the values below; otherwise nothing is shown and nothing is sent anywhere. The backend lives in `foxiem-backend` (see its `docs/DEPLOYMENT.md`).

- [ ] Deploy `foxiem-backend` and put Cloudflare in front of it, then set `EXPO_PUBLIC_API_URL=https://api.<your-domain>` in the EAS environment (https only; release builds reject anything else).
- [ ] Google Cloud: create OAuth clients of type **Web**, **Android** (package `co.uk.solutionvela.foxiem` + the SHA-1 of the upload key **and** of the Play App Signing key) and **iOS** (bundle id). Set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (required) and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. Put all client ids in the backend's `FOXIEM_GOOGLE_CLIENT_IDS`.
- [ ] Apple guideline 4.8 (login services): Google sign-in on iOS is shown together with Sign in with Apple. Set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, enable the Sign in with Apple capability on the App ID, and set backend `FOXIEM_APPLE_CLIENT_IDS=co.uk.solutionvela.foxiem`.
- [ ] RevenueCat webhook: URL `https://api.<your-domain>/api/v1/webhooks/revenuecat`, Authorization header value = the backend's `FOXIEM_REVENUECAT_WEBHOOK_SECRET` **without** a `Bearer ` prefix.
- [ ] Push: upload the APNs key (EAS credentials) for iOS; Android uses the Firebase project already in `google-services.json`.
- [ ] Store listings and privacy: Play Data safety and App Store Privacy must now declare e-mail address (account, optional), purchase history (subscription status) and device id (push token, optional), all linked to the user and not used for tracking. The Privacy Policy must describe the optional account and account deletion.
- [ ] Device test (Android first): sign in, purchase in sandbox and confirm the backend shows the entitlement, sign out and sign in on a second device and confirm Pro follows the account, allow notifications and confirm a billing-issue push arrives, delete the account and confirm sign-in creates a fresh one.

### Apple

- [ ] Set `ios.appleTeamId` in the Expo config (the build currently warns that it is missing). The widget and Watch targets need it to sign.
- [ ] Enable the In-App Purchase capability for the app id.
- [ ] Register the App Group `group.co.uk.solutionvela.foxiem` and enable it for the app, the widget extension and the Watch app (and their provisioning profiles). `app.json` already lists it in the entitlements.
- [ ] App Store Connect → App Privacy: remove advertising data; keep "Product interaction / Other usage data" for analytics, not linked to identity, not used for tracking. Answer "No" to tracking. No App Tracking Transparency prompt is used.

### Google Play

- [ ] Data safety: remove the Google Mobile Ads entries (advertising ID, ads); keep app interactions for analytics; state that data is not shared. Analytics is consent-based (off until the user opts in).
- [ ] Ads declaration: "No, my app does not contain ads".
- [ ] `app-ads.txt` is no longer needed.

### Store listing

- [ ] Listing copy and screenshots no longer mention ads or the profile; describe the five ways to count, widgets and the Watch.
- [ ] Refresh `store/` files and run `scripts/apply-aso-store-config.mjs` with the 2.0 copy.
- [ ] Privacy Policy at https://foxiem.com/privacy matches Settings → Privacy: local storage, an optional account (only in builds configured for it), anonymous analytics only after opt-in, no advertising.
- [ ] Release notes: "Foxiem now counts with intent. Give each counter a target, a limit or a rhythm, and see how it changes."

## 2. Native build

- [ ] Run `npx expo prebuild --clean` on a machine with Xcode, then build with EAS (`eas build --profile production`). A fresh native build is required: 2.0 removes `react-native-google-mobile-ads` and adds native modules (`expo-haptics`, `expo-sharing`, `expo-file-system`, `expo-secure-store`, `@react-native-google-signin/google-signin`, RevenueCat, the widget and Watch targets, the local `foxiem-watch` module). An OTA update or Expo Go is not enough.
- [ ] Fix any Swift or Kotlin compile errors from the first build in `targets/widget`, `targets/watch`, `modules/foxiem-watch` and the Android widget handler.
- [ ] Version is 2.0.0 in `app.json`; build numbers come from EAS (`appVersionSource: remote`).

## 3. Physical-device checks (light and dark, smallest and largest phone)

### Upgrade from 1.0.x (device with 1.0.4 and real data)

- [ ] Install 2.0 over 1.0.4: every counter appears with the same number, the open counter is first, no onboarding, the what's-new banner shows once.
- [ ] 1.0.x reminders still fire with their original message.
- [ ] Kill the app during the first launch, relaunch: nothing is duplicated or missing.

### Core

- [ ] New user: Welcome → template → Create → count, under 30 seconds.
- [ ] Rapid taps (20+ in a few seconds) all count; Undo reverts the burst; haptics feel right and switch off with the Haptics setting.
- [ ] Target reached: ring pulse, check mark, success haptic. Stay under never turns red.
- [ ] Period rollover after midnight; timezone and daylight-saving change.
- [ ] Reduce Motion (iOS) and Remove animations (Android): sheets and dialogs fade only; nothing travels.
- [ ] VoiceOver and TalkBack: Home rows, + and −, dialogs and sheets (focus moves in, Escape/back closes, focus returns).
- [ ] Largest text size: Home, Detail, Settings, sheets and dialogs stay usable.
- [ ] Keyboard: sheets and dialogs above the keyboard on Create, Add entry and Notes.
- [ ] Android back button and iOS swipe-back close the top overlay first.

### Reminders and Quiet Hours

- [ ] Allow, deny, and "Don't allow" then Open Settings.
- [ ] A reminder fires at the chosen time and opens its tracker.
- [ ] Notification **Count** button: counts without opening the app, once, even if tapped twice quickly; the number is right when the app is opened.
- [ ] Quiet Hours (Pro): a reminder inside the window is skipped, not delayed; overnight windows; a smart reminder is skipped when the target is already met.

### Widgets and Watch

- [ ] iOS home-screen widget (Free): shows the primary tracker; the count button adds one; tapping opens the tracker.
- [ ] iOS Pro widgets: several trackers, per-widget tracker choice, medium and large, colours, −/+; Lock Screen widgets (circular, rectangular, inline).
- [ ] Downgrade (or `Expire simulated Pro` in a dev build): extra widgets fall back to the primary tracker and Pro surfaces show the upgrade path, with no data lost.
- [ ] Android widgets (counter and trackers list): add from the launcher, configure, tap to count, deep link, Free versus Pro.
- [ ] Widget press while the app is closed is applied exactly once when the app opens; two quick presses count twice; an archived or deleted tracker is ignored.
- [ ] Apple Watch (Pro): install with the iPhone app, counts sync both ways, a press while the phone is out of reach arrives later exactly once, non-Pro shows the upgrade message.
- [ ] Widget gallery names and the Watch fallback strings are English only by design (native code cannot read the app's i18n); check they read well.

### Sharing and reset

- [ ] CSV export opens the share sheet on both platforms.
- [ ] Reset Foxiem returns to Welcome, removes widget data and cancels reminders. It does not cancel a subscription.

## 4. Known limitations to accept or plan

- Wear OS app and Apple Watch complications are not built.
- Native strings in the widget gallery and the Watch app are English.
- Calendar day cells are 36 pt wide on a 320 pt screen (fine on current phones; every cell has a full accessibility label).
- `npm audit --omit=dev` reports 23 moderate or high findings that all come from the Expo config-plugin toolchain (`@xmldom/xmldom` via `@expo/config-plugins`, used only at prebuild time on the developer's machine and not shipped in the app), plus `uuid` and `decode-uri-component` inside the same toolchain. The suggested fixes are breaking downgrades of Expo packages, so none was applied. Re-check when upgrading Expo.
- A web preview (`expo start --web`) works for layout review but has no native modules (widgets, Watch, notifications, haptics).
