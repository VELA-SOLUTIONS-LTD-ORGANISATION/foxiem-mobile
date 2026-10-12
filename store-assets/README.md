# Store assets

## `raw/`

Produced by `npm run store:screenshots` / `bundle exec fastlane screenshots`.

```text
raw/{locale}/ios/iphone-6.9/
raw/{locale}/ios/ipad-13/
raw/{locale}/android/phone/
```

Do not crop, stretch or redraw these PNGs. They are the native UI.

## `framed/`

AppScreens (or similar) marketing frames. Same locales and device classes as `raw/`. Not generated in-repo.

## `ios/iap-review/`

Paywall copies for App Review IAP screenshots (from `en-GB` iPhone 6.9 Pro scene).
