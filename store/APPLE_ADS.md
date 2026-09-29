# Foxiem — Apple Ads (Advanced)

Paid App Store acquisition via [app-ads.apple.com](https://app-ads.apple.com) **Advanced** (Campaign Manager). Not AdMob. Not Google Ads.

App: **Foxiem Counter** · Apple ID `6811348160` · Bundle `co.uk.solutionvela.foxiem`  
Developer: **VELA SOLUTIONS LTD** · Free · Productivity (+ Lifestyle) · 4+ · EN listing · v1.0.3 live

Do **not** invent payment methods, CPA caps, or new budgets above existing owner-approved Basic levels. Use Apple’s recommended max CPT where shown in UI.

## Basic vs Advanced (account context)

| | Basic (already live) | Advanced (this setup) |
|--|----------------------|------------------------|
| Control | App + countries + monthly budget + max CPI | Keywords, match types, CPT bids, ad groups, Search Match |
| Goal | Simple installs | Brand defence + category discovery + learning |
| Coexistence | Keep Basic running until Advanced proves spend control | Start with Brand + Discovery only; pause Basic later if overlap |

Basic was set ~£225/month with max CPI ~£0.81. Advanced daily budgets below are sized to that order of magnitude, not a scale-up.

## Analysis (why this structure)

1. **Brand is unprotected without Advanced.** Basic does not let you exact-match `foxiem` / `foxiem counter`. Competitors can bid on your name; Brand campaign closes that gap first.
2. **Category intent matches the store listing.** Primary genre Productivity, secondary Lifestyle; copy centres on habit / streak / counter / local-first / no account. Those are the exact keywords for Category.
3. **Zero ratings (0 reviews).** CPT will be higher and CVR lower until social proof grows. Prefer Brand + tight Category first; delay Competitor (high CPT, low relevance until ratings exist).
4. **English-only App Store listing (`languageCodesISO2A: EN`).** Prefer EN-language countries first. Turkey can wait for a TR storefront localization; otherwise ads send users to EN pages.
5. **Align geography with Google Ads Foxiem**, but drop markets that previously failed Basic eligibility (e.g. Brazil/China issues) unless Apple shows them eligible again.
6. **Creative.** Search Results ads use the App Store product page by default. Custom Product Pages / ad variations come later; do not block launch on CPP.

## Campaign plan (create in this order)

### 1) `Foxiem — Brand` (Search Results · Manage Bids)

| Field | Value |
|-------|--------|
| App | Foxiem Counter (`6811348160`) |
| Placements | Search Results |
| Countries | Same eligible set as Basic / Google Ads EN core: United Kingdom, United States, Canada, Ireland, Australia (if available), Germany, France, Netherlands, Sweden, Norway, Denmark, Finland, Switzerland, Austria, Belgium, Spain, Italy, Portugal, Poland, Czechia, Japan. Skip TR until TR listing exists. |
| Daily budget | Owner-set; start ~£5–7.50/day (within ~£225/mo envelope shared with Basic) |
| Ad group | `Brand Exact` |
| Search Match | **Off** |
| Match type | **Exact** |
| Max CPT | Use Apple suggested bid; brand can sit at the high end of the suggestion |
| Keywords | `foxiem`, `foxiem counter`, `foxiem app`, `vela solutions` (if volume), common misspellings if suggested |

### 2) `Foxiem — Discovery` (Search Results · Manage Bids)

| Field | Value |
|-------|--------|
| Countries | Same as Brand |
| Daily budget | ~£3–5/day |
| Ad group A | `Discovery Broad` — Search Match **Off**, match **Broad**, seeds = Brand + Category keyword lists |
| Ad group B | `Discovery Search Match` — **no keywords**, Search Match **On**, conservative CPT (lower than Brand) |
| Negatives (exact) | All Brand + Category exact keywords (so Discovery doesn’t cannibalize) |

### 3) `Foxiem — Category` (after Discovery has 3–7 days of search terms)

| Field | Value |
|-------|--------|
| Ad group | `Category Exact` · Search Match **Off** · Exact |
| Seed keywords (exact) | `habit tracker`, `habit counter`, `streak tracker`, `daily habit`, `tally counter`, `counter app`, `habit app`, `consistency tracker`, `water tracker`, `prayer counter`, `daily counter`, `progress tracker`, `local habit tracker` |
| Max CPT | Moderate (below Brand); follow UI recommendations |

### 4) Competitor — **hold**

Do not create until Category CPA is stable and ratings > 0. Competitor CPT burns budget without brand equity.

## Keywords ↔ Google Ads signals

Reuse audience/search terms already validated for Foxiem Google Ads (habit tracker, streak tracker, tally counter, prayer counter, water tracker, consistency tracker). On Apple they become **exact keywords**, not audience signals.

## Billing / org

- Legal entity: **VELA SOLUTIONS LTD** (Companies House / Hampshire — already on Basic Business Details)
- Apple ID for Ads: account owner Apple ID (UI currently shows `hakan.kuzudisli@yandex.com` on Advanced sign-in)
- Payment: existing Apple Ads billing on the Foxiem Ads account — do not invent a new card

## Live Advanced campaigns

Org: **Foxiem** · Advanced account id `24300790` · Apple ID used for login: `hakan.kuzudisli@yandex.com`

### `Foxiem — Brand` — **Running** (created 22 Sep 2026)

| Field | Value |
|-------|--------|
| App | Foxiem Counter (`6811348160`) |
| Placement | Search Results |
| Countries | 24 (UK, US, CA, IE, AU, DE, FR, NL, SE, NO, DK, FI, CH, AT, BE, ES, IT, PT, PL, CZ, JP, NZ, LU, IS) — Türkiye skipped (EN-only listing) |
| Daily budget | £7.50 |
| Bid strategy | Manage Bids |
| Ad group | Brand Exact |
| Search Match | **Off** |
| Max CPT | £0.81 (Apple suggested) |
| Keywords (Exact) | `[foxiem]`, `[foxiem counter]`, `[foxiem app]` |

### `Foxiem — Discovery` — **Running** (created 22 Sep 2026)

| Field | Value |
|-------|--------|
| Placement | Search Results |
| Countries | Same 24 |
| Daily budget | £4.00 |
| Bid strategy | Manage Bids |
| Ad group | Discovery Search Match |
| Search Match | **On** |
| Max CPT | £0.81 |
| Keywords | none (Search Match discovers terms) |
| Negatives | add `[foxiem]`, `[foxiem counter]`, `[foxiem app]` as exact campaign negatives when convenient (Brand owns those) |

### Still to create

- `Foxiem — Category` after Discovery search-term data (3–7 days)
- Competitor: hold
- Optional: Discovery Broad ad group + brand exact negatives on Discovery

## Ops checklist after create

1. Confirm campaigns status Running / Pending (not Draft). ✅ Brand + Discovery Running
2. Confirm Search Match Off on Brand and Category Exact. ✅ Brand
3. Confirm exact negatives on Discovery. ⏳ optional follow-up
4. Leave Basic on for 7 days; compare CPI/CPT vs Advanced Brand.
5. Promote winning Discovery search terms into Category Exact; add them as Discovery negatives.
6. Do not mix Kara Mood or any other app into this Apple Ads org.

## References

- [Campaign structure](https://ads.apple.com/app-store/best-practices/campaign-structure)
- [Manual bidding](https://ads.apple.com/app-store/best-practices/manual-bidding)
- [Keyword bid considerations](https://ads.apple.com/app-store/help/bids-and-budget/0076-considerations-for-keyword-bids)
