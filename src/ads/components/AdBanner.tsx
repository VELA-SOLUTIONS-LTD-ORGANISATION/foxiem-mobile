import { useCallback, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors, space } from '@/theme';

import { getBannerUnitId, type BannerPlacement } from '../adConfig';
import { useAds } from '../AdsProvider';
import { getGoogleMobileAds, isGoogleMobileAdsNativeAvailable } from '../nativeAvailability';

type AdBannerProps = {
  placement: BannerPlacement;
};

/**
 * Inline adaptive banner slot. Renders nothing until consent + SDK allow requests.
 * On failure / Expo Go / missing native module, collapses with no error UI.
 */
export function AdBanner({ placement }: AdBannerProps) {
  const { canRequestAds, adsReady } = useAds();
  const { width: windowWidth } = useWindowDimensions();
  const [failed, setFailed] = useState(false);
  const [loadedHeight, setLoadedHeight] = useState<number | null>(null);

  const unitId = getBannerUnitId(placement);
  const nativeReady = isGoogleMobileAdsNativeAvailable();
  const gma = nativeReady ? getGoogleMobileAds() : null;

  const shouldRequest =
    (Platform.OS === 'ios' || Platform.OS === 'android') &&
    nativeReady &&
    gma != null &&
    canRequestAds &&
    adsReady &&
    Boolean(unitId) &&
    !failed;

  const bannerWidth = Math.max(320, Math.floor(windowWidth));

  const onAdFailedToLoad = useCallback(
    (error: Error) => {
      if (__DEV__) {
        console.warn(`[Foxiem Ads] Banner failed (${placement})`, error);
      }
      setFailed(true);
      setLoadedHeight(null);
    },
    [placement],
  );

  const onAdLoaded = useCallback((dimensions: { width: number; height: number }) => {
    setLoadedHeight(dimensions.height);
  }, []);

  if (!shouldRequest || !unitId || !gma) {
    return null;
  }

  const { BannerAd, BannerAdSize } = gma;

  return (
    <View style={[styles.slot, loadedHeight != null ? { minHeight: loadedHeight } : null]}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.INLINE_ADAPTIVE_BANNER}
        width={bannerWidth}
        maxHeight={120}
        onAdLoaded={onAdLoaded}
        onAdFailedToLoad={onAdFailedToLoad}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: '100%',
    alignItems: 'center',
    marginTop: space[6],
    marginBottom: space[4],
    paddingTop: space[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
