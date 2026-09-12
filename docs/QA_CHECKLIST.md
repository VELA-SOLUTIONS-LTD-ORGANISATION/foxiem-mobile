# Foxiem QA checklist

Manual checks for the current local-first production loop. iOS and Android physical devices were **not** available in the Stage 11 environment.

## First launch

- [ ] Splash does not stay forever
- [ ] New install goes to Profile Setup, not Home
- [ ] Name cannot be whitespace-only
- [ ] Username rejects illegal characters
- [ ] Android back on Profile Setup does not open Splash or a blank screen
- [ ] After Continue, Home opens with the entered name

## Counter

- [ ] Rapid +1 twenty times → count 20 and 20 increment events after restart
- [ ] Rapid +5 does not lose events
- [ ] -1 at 0 does nothing
- [ ] Reset Counter dialog Cancel / Confirm
- [ ] Confirm cannot fire twice
- [ ] After Reset Counter, history shows Reset / Result 0

## Statistics / History / Consistency

- [ ] Same events drive all three screens
- [ ] Empty history shows localized empty copy
- [ ] Consistency 0 / 0 / 0 / 7 with no fake streak
- [ ] +1 then -1: Statistics net 0, Consistency today active
- [ ] Language change updates labels immediately

## Profile / Language / Privacy / About

- [ ] Edit Profile save and keyboard Done work
- [ ] Language row exposes selected state
- [ ] Privacy Policy row is not a link while URL is empty
- [ ] Privacy includes Advertising section (Google Mobile Ads)
- [ ] Privacy choices appears only when UMP requires it
- [ ] About version comes from app metadata
- [ ] About local-first copy scopes to Foxiem product data (not “never talks to network”)
- [ ] DEV diagnostics hidden in release builds

## AdMob banners (development client / native build only — not Expo Go)

- [ ] Statistics shows a test banner after content (not near chart controls / tabs)
- [ ] Activity History shows a test footer banner only when history is non-empty
- [ ] Empty Activity History stays ad-free
- [ ] Home has no banner / interstitial / floating ad
- [ ] Profile, Reminders, Language, Privacy, About, Consistency have no ads
- [ ] Ad load failure collapses slot without error UI
- [ ] Offline: core app works
- [ ] Never click production ads during development

## Reminders

- [ ] Save is disabled while scheduling
- [ ] Double Save does not create duplicate notifications
- [ ] Permission denied shows dialog; Open Settings does not freeze UI
- [ ] Delete waits for cancel + storage update
- [ ] Web does not crash on reminder screens

## Reset App Data

- [ ] Dialog explains profile, counter, history, reminders, preferences
- [ ] Confirm cannot run twice
- [ ] After reset: Profile Setup, empty history, streak 0
- [ ] Android back cannot return to the old Home/Profile stack

## Accessibility / layout

- [ ] VoiceOver / TalkBack: Home +1 / -1 / +5 / Reset
- [ ] Tabs, chart summary, history rows, consistency days, reminder toggles
- [ ] Larger text wraps; no clipped Privacy / dialogs
- [ ] German and French tab/button labels remain usable
- [ ] Compact width (~320) has no horizontal overflow

## Device-only (must test on hardware)

- [ ] VoiceOver
- [ ] TalkBack
- [ ] Notification actually fires
- [ ] Android hardware back on every stack
- [ ] Notification permission changed in OS Settings, then return to app
- [ ] Timezone change regroups Statistics/History without rewriting timestamps
