# App Store reviewer notes (draft — do not send until the owner submits)

Foxiem is guest-first. Core counting works without an account.

Restricted functionality is Foxiem Pro (RevenueCat entitlement `pro`): extra insights, extra reminder options, widgets beyond the Free set, and related Pro surfaces. Access is via App Store In-App Purchase:

- `foxiem_pro_monthly` (auto-renewable monthly)
- `foxiem_pro_yearly` (auto-renewable yearly)
- `foxiem_pro_lifetime` (non-consumable)

There is no permanent production backdoor. Reviewers should use Apple’s sandbox / TestFlight with a sandbox Apple ID so purchases do not charge a personal payment method. After purchase, Pro unlocks from RevenueCat customer info. Restore Purchases is in Settings.

Local tracker data remains on the device if Pro expires or the optional account is deleted.

Paywall: Settings → Foxiem Pro, or any locked Pro surface.

Optional Sign in with Apple / Google does not replace local trackers.
