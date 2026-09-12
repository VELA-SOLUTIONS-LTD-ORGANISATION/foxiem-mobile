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

## Android — ANDROID INTERNAL TESTING SUBMISSION VERIFIED

See `docs/ANDROID_RELEASE.md`.

AAB **1.0.0 / versionCode 7** is on Play **Internal testing** as a **draft** via EAS Submit. Play service-account → EAS credentials path is configured. Production is **not** released.

### Remaining (store listing / activation — not AAB transfer)

1. **Internal Testing activation (optional for install):** Play → Internal testing → finish Select testers + Preview and confirm if you want an active internal track.
2. **Upload store graphics (blocking for production listing):** icon, feature graphic, phone + tablet screenshots under `store/screenshots/`.
3. **Translations:** tr / de / fr / es / it from `store/play-listing-locales.md`.
4. **Do not** production rollout until you explicitly authorize it.

### Already done (Android)

- App created (`co.uk.solutionvela.foxiem`)
- Privacy / ads / ratings / data safety / audience
- Store settings Productivity + contact + website
- en-GB listing draft text
- External / open testing skipped
- Play submit SA permissions on Foxiem (`expo-upload@baby-namer-vela…`)
- EAS Google Play Service Credential configured
- EAS Submit of build `aaea7ba8-6195-475a-aaaf-c34e0199a3e9` → submission `a730ee6f-b9da-48b8-bf44-597d9481e7b2`
- Manual GitHub workflow `.github/workflows/android-submit.yml`

**Stop:** Do **not** production **rollout / publish** until you explicitly authorize it.
