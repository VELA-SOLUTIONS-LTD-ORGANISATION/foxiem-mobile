# Store screenshot factory

Native RAW captures for App Store / Play **device classes**, not every phone model.

```text
APP (screenshot mode + fixture)
        │
   foxiem://_dev/store/{scene}?lang={locale}
        │
 ┌──────┴──────┐
 iOS simctl    Android adb
 (Fastlane)    (Fastlane)
        │
 store-assets/raw/{locale}/{ios|android}/{class}/
        │
 AppScreens  →  store-assets/framed/   (marketing borders, later)
```

## One command

```bash
npm run store:screenshots
# or, with Ruby + Bundler:
bundle exec fastlane screenshots
```

Windows captures **Android phone** natively. iPhone 6.9" and iPad 13" use **Expo web + Playwright** at Apple's exact PNG sizes (440×956@3x → 1320×2868, 1032×1376@2x → 2064×2752). macOS still prefers Simulator via `ios.mjs`.

Subset:

```bash
# one locale, Android only
set STORE_SCREENSHOT_LANGS=en-GB
set STORE_SCREENSHOT_CLASSES=phone
npm run store:screenshots:android
```

## Device classes

| Class | Size | When |
|---|---|---|
| iPhone 6.9" | 1320×2868 | required (Apple scales smaller iPhones) |
| iPad 13" | 2064×2752 | on (`supportsTablet`) |
| Android phone | 1080×1920 | required (Play 9:16) |
| Android 7" / 10" | — | **off** until those Play listings exist |
| Watch | — | **off** (Watch UI is native Swift, not these RN screens) |

## Locales (app languages)

`en-GB` `tr-TR` `de-DE` `fr-FR` `es-ES` `it-IT`

pt-BR is not an app language. Arabic is listing-only — no UI screenshots.

Scenes: Home, Counter, Insights, Reminders, Widgets, Pro.

## Layout

```text
store-assets/raw/en-GB/ios/iphone-6.9/01-home.png
store-assets/raw/tr-TR/android/phone/02-counter.png
store-assets/framed/          # AppScreens output, not generated here
```

## Fastlane vs XCUITest / Espresso

`ios/` and `android/` are gitignored (Expo CNG). Lanes named `snapshot` / `screengrab` run the same simctl/adb factory Fastlane would drive from UI tests: locale × class × scene, deterministic fixture, no tap-through tests.

## AppScreens

Import `store-assets/raw/**` as device screens. Keep copy/overlays in AppScreens. Export framed sets into `store-assets/framed/{locale}/…` at the same class sizes.
