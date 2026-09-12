import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import { isNativeMobileAdsPlatform } from './adConfig';
import { bootstrapAdsConsent, presentPrivacyOptionsForm } from './consent';
import { initializeMobileAdsOnce } from './mobileAds';
import { isGoogleMobileAdsNativeAvailable } from './nativeAvailability';

type AdsContextValue = {
  /** Consent + platform allow ad requests. */
  canRequestAds: boolean;
  /** SDK initialized successfully after consent permits ads. */
  adsReady: boolean;
  /** Bootstrapping consent/SDK (does not block Foxiem UI). */
  isBootstrapping: boolean;
  /** Show UMP Privacy Options row in Privacy screen. */
  privacyOptionsRequired: boolean;
  openPrivacyOptions: () => Promise<void>;
};

const AdsContext = createContext<AdsContextValue | null>(null);

const DEFAULT_VALUE: AdsContextValue = {
  canRequestAds: false,
  adsReady: false,
  isBootstrapping: false,
  privacyOptionsRequired: false,
  openPrivacyOptions: async () => undefined,
};

export function AdsProvider({ children }: { children: ReactNode }) {
  const [canRequestAds, setCanRequestAds] = useState(false);
  const [adsReady, setAdsReady] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(
    isNativeMobileAdsPlatform() && isGoogleMobileAdsNativeAvailable(),
  );
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    if (!isNativeMobileAdsPlatform() || !isGoogleMobileAdsNativeAvailable()) {
      setIsBootstrapping(false);
      if (__DEV__ && isNativeMobileAdsPlatform()) {
        console.info(
          '[Foxiem Ads] Native AdMob module missing (Expo Go or rebuild needed). Ads disabled; app continues.',
        );
      }
      return;
    }

    let cancelled = false;

    const run = async () => {
      setIsBootstrapping(true);
      try {
        const consent = await bootstrapAdsConsent();
        if (cancelled) {
          return;
        }

        setCanRequestAds(consent.canRequestAds);
        setPrivacyOptionsRequired(consent.privacyOptionsRequired);

        if (consent.canRequestAds) {
          const ready = await initializeMobileAdsOnce();
          if (!cancelled) {
            setAdsReady(ready);
          }
        } else {
          setAdsReady(false);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[Foxiem Ads] Bootstrap failed', error);
        }
        if (!cancelled) {
          setCanRequestAds(false);
          setAdsReady(false);
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  const openPrivacyOptions = useCallback(async () => {
    if (!isGoogleMobileAdsNativeAvailable()) {
      return;
    }
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return;
    }

    const result = await presentPrivacyOptionsForm();
    if (!result) {
      return;
    }

    setCanRequestAds(result.canRequestAds);
    setPrivacyOptionsRequired(result.privacyOptionsRequired);

    if (result.canRequestAds) {
      const ready = await initializeMobileAdsOnce();
      setAdsReady(ready);
    } else {
      setAdsReady(false);
    }
  }, []);

  const value = useMemo<AdsContextValue>(
    () => ({
      canRequestAds,
      adsReady,
      isBootstrapping,
      privacyOptionsRequired,
      openPrivacyOptions,
    }),
    [adsReady, canRequestAds, isBootstrapping, openPrivacyOptions, privacyOptionsRequired],
  );

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAds(): AdsContextValue {
  return useContext(AdsContext) ?? DEFAULT_VALUE;
}
