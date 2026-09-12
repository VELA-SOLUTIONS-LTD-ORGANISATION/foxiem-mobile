import {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  AdsConsentStatus,
} from 'react-native-google-mobile-ads';

import { bootstrapAdsConsent, presentPrivacyOptionsForm } from '@/ads/consent';

describe('ads consent bootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows ads when consent is not required', async () => {
    (AdsConsent.gatherConsent as jest.Mock).mockResolvedValueOnce({
      status: AdsConsentStatus.NOT_REQUIRED,
      canRequestAds: true,
      privacyOptionsRequirementStatus: AdsConsentPrivacyOptionsRequirementStatus.NOT_REQUIRED,
      isConsentFormAvailable: false,
    });

    await expect(bootstrapAdsConsent()).resolves.toMatchObject({
      canRequestAds: true,
      privacyOptionsRequired: false,
      error: null,
    });
  });

  it('surfaces privacy options requirement after consent flow', async () => {
    (AdsConsent.gatherConsent as jest.Mock).mockResolvedValueOnce({
      status: AdsConsentStatus.OBTAINED,
      canRequestAds: true,
      privacyOptionsRequirementStatus: AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
      isConsentFormAvailable: true,
    });

    await expect(bootstrapAdsConsent()).resolves.toMatchObject({
      canRequestAds: true,
      privacyOptionsRequired: true,
    });
  });

  it('disables ads when canRequestAds is false', async () => {
    (AdsConsent.gatherConsent as jest.Mock).mockResolvedValueOnce({
      status: AdsConsentStatus.REQUIRED,
      canRequestAds: false,
      privacyOptionsRequirementStatus: AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
      isConsentFormAvailable: true,
    });

    await expect(bootstrapAdsConsent()).resolves.toMatchObject({
      canRequestAds: false,
    });
  });

  it('falls back to existing consent info when gather fails but SDK still allows ads', async () => {
    (AdsConsent.gatherConsent as jest.Mock).mockRejectedValueOnce(new Error('network'));
    (AdsConsent.getConsentInfo as jest.Mock).mockResolvedValueOnce({
      status: AdsConsentStatus.OBTAINED,
      canRequestAds: true,
      privacyOptionsRequirementStatus: AdsConsentPrivacyOptionsRequirementStatus.NOT_REQUIRED,
      isConsentFormAvailable: false,
    });

    const result = await bootstrapAdsConsent();
    expect(result.canRequestAds).toBe(true);
    expect(result.error).toBeInstanceOf(Error);
  });

  it('fails closed when gather and fallback both fail', async () => {
    (AdsConsent.gatherConsent as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    (AdsConsent.getConsentInfo as jest.Mock).mockRejectedValueOnce(new Error('also boom'));

    await expect(bootstrapAdsConsent()).resolves.toMatchObject({
      canRequestAds: false,
      privacyOptionsRequired: false,
    });
  });

  it('presents privacy options form without throwing', async () => {
    (AdsConsent.showPrivacyOptionsForm as jest.Mock).mockResolvedValueOnce({
      status: AdsConsentStatus.OBTAINED,
      canRequestAds: true,
      privacyOptionsRequirementStatus: AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
      isConsentFormAvailable: true,
    });

    await expect(presentPrivacyOptionsForm()).resolves.toMatchObject({
      canRequestAds: true,
      privacyOptionsRequired: true,
    });
  });
});
