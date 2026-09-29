import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';

import type { ProFeature } from './features';
import { usePro } from './ProProvider';

export type FeatureAccess = {
  /** Whether Pro exists in this build at all. When false, hide the entry point entirely. */
  visible: boolean;
  allowed: boolean;
  /** Opens the contextual paywall; dismissing it returns to the same screen. */
  request: () => void;
};

export function useFeature(feature: ProFeature): FeatureAccess {
  const pro = usePro();
  const navigation = useNavigation();
  const request = useCallback(() => navigation.navigate('Paywall', { feature }), [feature, navigation]);
  return { visible: pro.available, allowed: pro.canUse(feature), request };
}
