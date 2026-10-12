# App Store Connect metadata (Foxiem 2.0)

Prepared for a **new iOS version**. Do **not** submit for App Review until the owner says so.

Official sources used 5 October 2026:

- [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) especially 2.3 metadata, 2.3.2 IAP indication, 2.3.3 screenshots show the app in use, 2.3.7 no prices in metadata, 3.1.1 IAP, 3.1.2 subscriptions, 5.1 privacy

## Locales (match the app)

`en-GB`, `tr`, `de-DE`, `fr-FR`, `es-ES`, `it-IT`

Limits: name 30, subtitle 30, promotional text 170, keywords 100, description 4000.

Brand name **Foxiem** is not translated. No prices in name, subtitle, screenshots or keywords.

## Screenshots on disk

`store-assets/raw/{locale}/ios/iphone-6.9/` — 1320×2868, 24-bit PNG, no alpha (validated).
`store-assets/raw/{locale}/ios/ipad-13/` — 2064×2752, same rules.

Order: home, counter, insights, reminders, widgets, paywall (prices hidden in screenshot mode).

Paywall shot exists so featured Pro tools are marked as requiring purchase (guideline 2.3.2) without showing store prices (2.3.7).

## Watch

The production iOS target includes `FoxiemWatch`. Official sizes (same size in every locale):

- 396 × 484 (Series 9/8/7)
- 416 × 496 (Series 12/11/10)
- 410 × 502 / 422 × 514 (Ultra)

Capture on a paired Watch or watchOS simulator. Do not invent Watch UI. This is a Submit blocker, not a reason to fake shots.


## Privacy / support

- Privacy: `https://foxiem.com/privacy`
- Support URL: `https://foxiem.com` (contact `support@solutionvela.co.uk`)
- Account deletion web: `https://foxiem.com/delete`

## Review notes

See `reviewer-notes.md`. Demo account: none for core counting. Pro is IAP via RevenueCat `pro`.
