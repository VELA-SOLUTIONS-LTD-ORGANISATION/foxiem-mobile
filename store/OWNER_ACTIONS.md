# Owner actions required (release gates)

## Apple — IOS BINARY UPLOADED — TESTFLIGHT QA PENDING

### 1) TestFlight device QA (blocking)

Install **Foxiem 1.0.0 (5)** from TestFlight (group **Foxiem Internal**) → exercise Home / Statistics / Profile, reminders, ads paths → reply with QA notes.

### 2) Review phone (if still prompted)

ASC may still ask for App Review **phone** (`+` country code) when you Add for Review.

### Already done (Apple)

- Support URL: `https://foxiem.com/privacy`
- App Privacy responses **Published**
- Privacy Policy URL, Age Ratings **4+**, screenshots (iPhone×3 + iPad×3), build **5**

Optional later: set `VITE_SUPPORT_EMAIL` on foxiem-web and point Support URL at a dedicated contact page.

**Stop:** Do **not** click **Add for Review** until device QA is done (or you explicitly authorize submission).

---

## Android — ANDROID RELEASE PREPARATION PENDING

See `docs/ANDROID_RELEASE.md`.

Internal testing is **active** for **1.0.0 / versionCode 7**. Store listing graphics + locales are uploaded. Official `app-ads.txt` is live. Production remains **INACTIVE**. Do **not** rebuild / re-submit AAB / promote to Production.

### Remaining (blocking for “READY FOR PRODUCTION ROLLOUT”)

1. Exact Play **versionCode 7** Internal Testing smoke on a working Google Play device (local emulator path abandoned; no physical device on hand), **or** explicitly accept that gap before rollout.
2. Optional: Firebase Test Lab Robo with `~\.credentials\foxiem-vc7-TEST-LAB-QA-BUILD.apk` (same-source extract from Play AAB; not a store upload).
3. Pre-launch report still **NOT GENERATED** by Google — do not rebuild solely to force it.
4. AdMob crawl may stay **PENDING** for up to ~24h–7d — does not block Play publish by itself.
5. **Do not** production rollout until you explicitly authorize it.

### Already done (Android)

- App created (`co.uk.solutionvela.foxiem`)
- Privacy / ads (“Contains ads”) / ratings / data safety / audience
- Store settings Productivity + contact + website
- en-GB + tr/de/fr/es/it listing copy; icon, feature, phone + tablet screenshots
- Internal testing activated (testers + opt-in link available in Console)
- External / open testing skipped
- Play submit SA permissions on Foxiem (`expo-upload@baby-namer-vela…`)
- EAS Google Play Service Credential configured
- EAS Submit of build `aaea7ba8-6195-475a-aaaf-c34e0199a3e9` → submission `a730ee6f-b9da-48b8-bf44-597d9481e7b2`
- Manual GitHub workflow `.github/workflows/android-submit.yml`

**Stop:** Do **not** production **rollout / publish** until you explicitly authorize it.
