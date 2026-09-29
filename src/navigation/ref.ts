import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function openTracker(trackerId: string): void {
  if (!navigationRef.isReady()) {
    return;
  }
  navigationRef.dispatch(
    CommonActions.reset({
      index: 1,
      routes: [{ name: 'Main', params: { screen: 'HomeTab' } }, { name: 'TrackerDetail', params: { trackerId } }],
    }),
  );
}

export function openHome(): void {
  if (!navigationRef.isReady()) {
    return;
  }
  navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'HomeTab' } }] }));
}

export function resetToWelcome(): void {
  if (!navigationRef.isReady()) {
    return;
  }
  navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Welcome' }] }));
}
