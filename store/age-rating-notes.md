# Age rating questionnaire notes (source audit)

Complete Apple's live questionnaire in App Store Connect from these findings. Do not invent.

## Likely answers (verify in ASC UI)

| Topic | Evidence from Foxiem | Draft |
|-------|----------------------|-------|
| Unrestricted web access | App opens specific https links; not a general browser | Typically no / limited |
| User-generated content | No UGC, chat, forums | No |
| Messaging / chat | None | No |
| Gambling | None | No |
| Contests | None | No |
| Violence / horror | None | No |
| Sexual content / nudity | None | No |
| Profanity | None | No |
| Alcohol / tobacco / drugs | None | No |
| Medical / treatment info | Counter only; no medical claims | No |
| Advertising | Google Mobile Ads SDK present; banners on Statistics / Activity History in production | **Yes — advertising** |

Owner must click through Apple's current age-rating form and confirm each item.
