import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function resetToProfileSetup(): void {
  if (!navigationRef.isReady()) {
    return;
  }

  navigationRef.reset({
    index: 0,
    routes: [{ name: 'ProfileSetup' }],
  });
}

export function navigateToHome(): void {
  if (!navigationRef.isReady()) {
    return;
  }

  navigationRef.navigate('Main', { screen: 'Tabs', params: { screen: 'HomeTab' } });
}
