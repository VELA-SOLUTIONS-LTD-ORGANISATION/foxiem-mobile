# Owner actions required (release gates)

## Apple — WAITING FOR REVIEW (build 6)

### Current

- Version **1.0.0** is **Waiting for Review** with monetized **build 6** (commit `1d1bbf7`, real AdMob IDs).
- Build **5** was removed from the version and must **not** ship as the public final.
- Release mode: **Manually release this version**.

### Optional owner

- Install build **6** from TestFlight (group **Foxiem Internal**) for smoke QA (Home ad-free; Statistics/History banners; consent). Do **not** click live production ads.
- Watch ASC until Approved → then manually release when ready.

### Already done (Apple)

- Support URL: `https://foxiem.com/privacy`
- App Privacy published; Age Ratings; screenshots
- Review contact filled
- Build 5 removed from review → replaced with build 6 → submitted

---

## Android — PRODUCTION PENDING (vc8 Internal + Closed review)

See `docs/ANDROID_RELEASE.md`.

| Item | Status |
|------|--------|
| Monetized build | **1.0.0 / versionCode 8** (`50a62f42-…`, commit `1d1bbf7`) |
| Internal testing | **Active** (bundle 8) |
| Closed Alpha | **Changes in review** (Publishing overview) |
| Production | **INACTIVE** |
| vc7 | Superseded — do **not** promote |

### Remaining

1. Wait for Play review of Closed Alpha / store content (or accept residual Internal-only risk).
2. Optional: Firebase Test Lab Robo with `~\.credentials\foxiem-vc8-TEST-LAB-QA-BUILD.apk`.
3. Promote **only versionCode 8** to Production when gates pass.
4. Pre-launch may still be NOT GENERATED — do not invent results.

### Already done (Android)

- Real AdMob App IDs + four banner units in vc8
- Privacy / ads / ratings / data safety / listings
- `app-ads.txt` live
- Internal vc8 activated; Closed Alpha submitted for review
- Managed publishing currently **off**

**Stop:** Do **not** promote **vc7**. Do **not** claim LIVE until stores show public availability.
