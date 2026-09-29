# Foxiem — Google Ads App campaigns

Paid **user acquisition** (Google Ads), not AdMob banners. In-app ads stay in `docs/ADMOB_SETUP.md`.

App campaigns are automated: **no keywords**. Google uses store listings, assets, and Firebase conversions to bid.

Do **not** invent a budget, billing profile, or support email. Set those in the Google Ads account.

## App targets

| Store | App | URL |
|-------|-----|-----|
| Google Play | `co.uk.solutionvela.foxiem` | https://play.google.com/store/apps/details?id=co.uk.solutionvela.foxiem |
| App Store | Apple ID `6811348160` | https://apps.apple.com/app/id6811348160 |

Campaigns will not serve until that store listing is **public**.

## Firebase (already in the binary)

Project **foxiem-counter** · package / bundle `co.uk.solutionvela.foxiem`.

| Event | Source | Use in Google Ads |
|-------|--------|-------------------|
| `first_open` | Firebase automatic | Primary for **Installs** campaigns |
| `onboarding_complete` | `logAdsConversion` after setup | Secondary quality |
| `first_count` | `logAdsConversion` after first +1 | Primary for **In-app actions** |

Events are PII-free (no name, notes, or count values). They only fire in native EAS builds, not Expo Go.

## Ads account (Foxiem only)

| | |
|--|--|
| Customer ID | **835-190-2400** |
| ocid | `8553074608` |
| Google user | same as AdMob / Play (`solutionvela@gmail.com`) |
| Do not use | Kara Mood **549-328-3366** — keep conversions and spend separate |

Direct: [ads.google.com](https://ads.google.com/aw/campaigns?ocid=8553074608)

## Owner setup (Google Ads UI)

1. Open account **835-190-2400** (not Kara Mood). Payment/billing is required before the draft can serve.
2. **Goals / Data manager → Linked accounts → Firebase** → link **foxiem-counter**.
3. **Goals → Conversions → Import from Firebase**: `first_open`, `onboarding_complete`, `first_count`.
4. Mark `first_open` as **primary** for the first 2 weeks (or until ~15 install conversions/day).
5. Keep `first_count` imported. When volume is enough, switch optimization to **In-app actions → first_count**.
6. One App campaign per platform, same country list as Kara Mood. Do **not** create a campaign per country.
7. Goal: **Installs**. Live Android campaign: **Foxiem Android Installs** (`24271566707`).
8. Daily budget: owner sets. Live budget is £2.15/day.
9. Headlines on the live campaign are the 5 English lines below. Turkish copy is kept here for a later asset set, not a second campaign. Google rotates assets and cannot pin Turkish text to Turkey.
10. Upload images from `store/screenshots/`. Do not edit assets daily for the first 7 days (learning).

## Campaign settings (one campaign, Kara Mood countries)

| Field | Foxiem Android Installs |
|-------|-------------------------|
| Type | App |
| Goal | Installs / Install volume (All users) |
| Locations | Same 23 countries as Kara Mood (Austria, Belgium, Canada, Czechia, Denmark, Finland, France, Germany, Iceland, Ireland, Italy, Japan, Luxembourg, Netherlands, Norway, Poland, Portugal, Spain, Sweden, Switzerland, Turkiye, United Kingdom, United States) |
| Languages | English, German, French, Spanish, Japanese, Turkish |
| Headlines / descriptions | 5 English (live). Turkish lines below are not in the ad group. |
| Budget | £2.15/day |
| Start | 21 September 2026, no end date |

iOS is a separate campaign later (different store), not a per-country split.

## Headlines (max 30 characters) — EN

| # | Text | Chars |
|---|------|------:|
| 1 | Small counts. Big progress. | 27 |
| 2 | Count what matters | 18 |
| 3 | Local-first counter | 19 |
| 4 | No account required | 19 |
| 5 | See streaks, stay consistent | 28 |

## Descriptions (max 90 characters) — EN

| # | Text | Chars |
|---|------|------:|
| 1 | A calm local-first counter for habits, streaks and daily actions. No account needed. | 84 |
| 2 | Tap +1, see history and consistency, and keep every count on your device. | 73 |
| 3 | Track water, prayer, reps or any action with named topics on one device. | 72 |
| 4 | Foxiem stays on your phone. No account, no cloud profile, no sign-in. | 69 |
| 5 | Build a daily streak with +1, +5 and history you can actually read. | 67 |

## Headlines — TR

| # | Text | Chars |
|---|------|------:|
| 1 | Küçük sayım, büyük ilerleme | 27 |
| 2 | Cihazında kalan sayaç | 21 |
| 3 | Hesap yok, sadece say | 21 |
| 4 | Her gün +1, net ilerleme | 24 |
| 5 | Konularla ayrı say | 18 |

## Descriptions — TR

| # | Text | Chars |
|---|------|------:|
| 1 | Sakin, yerel bir sayaç. Alışkanlık, seri ve günlük eylemler cihazında kalır. | 76 |
| 2 | +1 ile say, geçmişi ve tutarlılığı gör. Hesap gerekmez. | 55 |
| 3 | Su, zikir, tekrar: her konuyu ayrı say, hepsi telefonunda kalsın. | 65 |
| 4 | Foxiem hesapsız çalışır. Profil, sayaç ve hatırlatıcılar cihazda kalır. | 71 |
| 5 | +1, +5 ve geçmiş ile günlük serini basit tut. | 46 |

## Extra headlines (hold for locale expansion)

| Locale | Headline | Chars |
|--------|----------|------:|
| de-DE | Kleine Schritte, großer Erfolg | 30 |
| fr-FR | Petits comptes, grands progrès | 30 |
| es-ES | Cuentas chicas, gran progreso | 29 |
| it | Piccoli conti. Grandi passi. | 28 |

## Images (upload, do not invent new UI)

Google will crop. Prefer store assets already approved:

| Asset | File | Use as |
|-------|------|--------|
| Feature graphic | `store/screenshots/play-feature-graphic.png` (1024×500) | Landscape (Android) |
| High-res icon | `store/screenshots/play-icon-512.png` | Icon |
| Phone 1 | `store/screenshots/play-phone/01-count-what-matters.png` | Portrait |
| Phone 2 | `store/screenshots/play-phone/02-see-your-progress.png` | Portrait |
| Phone 3 | `store/screenshots/play-phone/03-make-it-yours.png` | Portrait |
| iPhone 1 | `store/screenshots/iphone/01-count-what-matters.png` | Portrait (iOS) |
| iPhone 2 | `store/screenshots/iphone/02-see-your-progress.png` | Portrait (iOS) |
| iPhone 3 | `store/screenshots/iphone/03-make-it-yours.png` | Portrait (iOS) |

Ideal extra sizes if you export later: landscape **1200×628**, square **1200×1200**. Do not generate fake product UI.

## YouTube videos (live on Android Installs)

Unlisted on channel **kuziworks**. Linked to **Foxiem Android Installs** ad group assets (portrait + landscape).

| Orientation | URL |
|-------------|-----|
| Portrait | https://youtu.be/wM1QILwjQko |
| Landscape | https://youtu.be/rP3jiCri9hA |

Source files: `store/ads/foxiem-ios-portrait.mp4`, `store/ads/foxiem-ios-landscape.mp4`. A square cut would further lift ad strength; not required to serve.

## What not to do

- Do not run Search keyword campaigns for a free utility app until App campaigns have data.
- Do not optimize for AdMob impressions or revenue as the install conversion.
- Do not send profile name, notes, or counter values to Ads.
- Do not claim the app is live in a market where the store listing is still in review.

## Measurement check (after 48 hours)

Firebase DebugView on a production/TestFlight build should show `first_open`, then `onboarding_complete`, then `first_count` after the first increment. Google Ads → Conversions should move from “No recent conversions” once the Firebase link is active.
