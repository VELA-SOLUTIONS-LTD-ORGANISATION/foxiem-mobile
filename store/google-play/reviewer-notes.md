# Google Play reviewer notes (draft — do not send until 2.0 AAB is on a testing track)

Foxiem is guest-first. Core counting works without an account.

Restricted functionality is Foxiem Pro (`pro` entitlement): extra insights, extra reminder options, widgets beyond the Free set, and related Pro surfaces. Access is via Google Play Billing:

- `foxiem_pro_monthly` (auto-renewing monthly)
- `foxiem_pro_yearly` (auto-renewing yearly)
- `foxiem_pro_lifetime` (one-time)

There is no permanent production backdoor. Reviewers should use Google Play license testing / the Internal testing track with a license-tester Google account so purchases do not charge a personal payment method. After purchase, Pro unlocks immediately from RevenueCat customer info. Restore Purchases is in Settings.

Local tracker data remains on the device if Pro expires or the optional account is deleted.

Paywall: Settings → Foxiem Pro, or any locked Pro surface.
