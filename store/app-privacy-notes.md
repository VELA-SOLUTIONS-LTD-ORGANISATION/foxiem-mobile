# App Privacy questionnaire notes (Foxiem 2.0 source)

Draft answers for App Store Connect **App Privacy**. Confirm before Save. Official: [guideline 5.1](https://developer.apple.com/app-store/review/guidelines/).

## Privacy Policy URL

`https://foxiem.com/privacy` (HTTPS, public, names Foxiem, optional account, RevenueCat, Sentry, opt-in analytics, no ads, deletion).

## Does this app collect data?

**Yes.** Guest use keeps trackers on-device. Optional account, purchases, crash reports and opt-in analytics leave the device.

## Local-only (do not declare as collected product content)

Tracker names, counts, notes, reminders, preferences in on-device storage. Not uploaded.

## Types to declare (2.0)

| Type | Linked to user? | Purposes (draft) |
|------|-----------------|------------------|
| Email Address | Yes, if the person signs in | App Functionality |
| User ID | Yes when signed in; RevenueCat app user id for billing | App Functionality; Fraud Prevention |
| Purchase History | Yes if they buy/restore | App Functionality |
| Crash Data | Not linked to email (`sendDefaultPii: false`) | App Functionality |
| Product Interaction | Only after analytics consent | Analytics |
| Device ID / diagnostics typical of Sentry | Not linked to email | App Functionality |

No advertising SDK in 2.0. Do **not** declare Third-Party Advertising.

## Used for Tracking?

**Draft: No** unless ATT / IDFA is added. Analytics is opt-in measurement, not ATT tracking as currently implemented.

## Account deletion

In-app Settings → Delete account, and `https://foxiem.com/delete`. Does not wipe local trackers.
