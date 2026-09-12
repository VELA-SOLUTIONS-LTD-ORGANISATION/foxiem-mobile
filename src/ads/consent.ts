import { Platform } from 'react-native';

import { isNativeMobileAdsPlatform } from './adConfig';
import { getGoogleMobileAds, isGoogleMobileAdsNativeAvailable } from './nativeAvailability';

export type ConsentBootstrapResult = {
  canRequestAds: boolean;
  privacyOptionsRequired: boolean;
  status: string;
  error: Error | null;
};

function mapConsentInfo(info: {
  canRequestAds: boolean;
  privacyOptionsRequirementStatus: string;
  status: string;
}): ConsentBootstrapResult {
  return {
    canRequestAds: info.canRequestAds,
    privacyOptionsRequired: info.privacyOptionsRequirementStatus === 'REQUIRED',
    status: info.status,
    error: null,
  };
}

const UNAVAILABLE: ConsentBootstrapResult = {
  canRequestAds: false,
  privacyOptionsRequired: false,
  status: 'UNAVAILABLE',
  error: null,
};

/**
 * UMP bootstrap: update consent info, show form if required, return canRequestAds.
 * Never throws to callers — ads fail closed on error / missing native module.
 */
export async function bootstrapAdsConsent(): Promise<ConsentBootstrapResult> {
  if (!isNativeMobileAdsPlatform() || !isGoogleMobileAdsNativeAvailable()) {
    return UNAVAILABLE;
  }

  const gma = getGoogleMobileAds();
  if (!gma) {
    return UNAVAILABLE;
  }

  const { AdsConsent } = gma;

  try {
    const info = await AdsConsent.gatherConsent();
    return mapConsentInfo(info);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (__DEV__) {
      console.warn('[Foxiem Ads] Consent gather failed', err);
    }

    try {
      const existing = await AdsConsent.getConsentInfo();
      return {
        ...mapConsentInfo(existing),
        error: err,
      };
    } catch (fallbackError) {
      if (__DEV__) {
        console.warn('[Foxiem Ads] Consent fallback failed', fallbackError);
      }
      return {
        ...UNAVAILABLE,
        error: err,
      };
    }
  }
}

export async function presentPrivacyOptionsForm(): Promise<ConsentBootstrapResult | null> {
  if (!isNativeMobileAdsPlatform() || !isGoogleMobileAdsNativeAvailable()) {
    return null;
  }

  const gma = getGoogleMobileAds();
  if (!gma) {
    return null;
  }

  try {
    const info = await gma.AdsConsent.showPrivacyOptionsForm();
    return mapConsentInfo(info);
  } catch (error) {
    if (__DEV__) {
      console.warn('[Foxiem Ads] Privacy options form failed', error);
    }
    return null;
  }
}

export function isAdsConsentSupported(platform: typeof Platform.OS = Platform.OS): boolean {
  return isNativeMobileAdsPlatform(platform) && isGoogleMobileAdsNativeAvailable(platform);
}
