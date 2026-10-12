# iOS review-ready checklist

Official: [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/), [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (5 Oct 2026).

| Item | Status | Note |
| --- | --- | --- |
| Production IPA | Uploaded | 2.0.0 build **24** on App Store Connect (processing) |
| App Review submitted | In progress | ASC session is Hakan Kuzudisli / VELA |
| iPhone 6.9" 1320×2868, 6 locales × 6 shots | PASS in repo | Validated PNG, no alpha |
| iPad 13" 2064×2752, 6 locales × 6 shots | PASS in repo | Same |
| Screenshot order | PASS | Home, counter, insights, reminders, widgets, paywall |
| Prices in screenshots | PASS | Screenshot mode hides prices (2.3.7) |
| Paywall present | PASS | Marks IAP surfaces (2.3.2) |
| Debug / test labels | PASS | Production screenshot mode is `__DEV__` only |
| Watch screenshots | BLOCKED | Binary includes FoxiemWatch; ASC requires Watch shots if Watch ships |
| Listing copy 6 locales + ar-SA | PASS in repo | ar-SA rewritten for 2.0 (no ads) |
| Privacy URL | PASS | https://foxiem.com/privacy |
| Support URL | PASS | https://foxiem.com / support@solutionvela.co.uk |
| App Privacy questionnaire | PENDING EXTERNAL | Draft in `store/app-privacy-notes.md` |
| Review notes | In store.config | `reviewer-notes.md` |
