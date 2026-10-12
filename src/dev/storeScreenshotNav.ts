import { CommonActions } from '@react-navigation/native';
import { InteractionManager, Platform } from 'react-native';

import { draftFromTracker } from '@/domain/trackers';
import type { Tracker, TrackerDraft } from '@/domain/types';
import type { SupportedLanguage } from '@/i18n';
import { navigationRef } from '@/navigation/ref';

import { STORE_SCREENSHOT_TRACKER_ID } from './storeScreenshotFixture';
import { screenshotTrackerNames, storeLocaleToAppLanguage } from './storeScreenshotLocales';
import type { StoreScreenshotScene } from './storeScreenshotMode';

type PreferencesApi = {
  language: SupportedLanguage;
  update: (patch: { language: SupportedLanguage }) => Promise<void>;
};

type TrackerStoreApi = {
  trackers: Tracker[];
  updateTracker: (trackerId: string, draft: TrackerDraft) => unknown;
};

export async function applyStoreScreenshotLocale(
  lang: string | undefined,
  preferences: PreferencesApi,
  store: TrackerStoreApi,
): Promise<void> {
  const language = storeLocaleToAppLanguage(lang);
  if (preferences.language !== language) {
    await preferences.update({ language });
  }
  const names = screenshotTrackerNames(language);
  for (const tracker of store.trackers) {
    const name = names[tracker.id];
    if (name && tracker.name !== name) {
      store.updateTracker(tracker.id, { ...draftFromTracker(tracker), name });
    }
  }
}

function markScene(scene: StoreScreenshotScene): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }
  window.setTimeout(() => {
    document.documentElement.dataset.storeScene = scene;
  }, 500);
}

export function openStoreScreenshotScene(scene: StoreScreenshotScene): void {
  if (!navigationRef.isReady()) {
    return;
  }
  if (scene === 'home' && isAlreadyOnHome()) {
    markScene(scene);
    return;
  }
  switch (scene) {
    case 'home':
      navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'HomeTab' } }] }));
      break;
    case 'tracker':
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'TrackerDetail', params: { trackerId: STORE_SCREENSHOT_TRACKER_ID } }],
        }),
      );
      break;
    case 'insights':
      navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'InsightsTab' } }] }));
      break;
    case 'reminders':
      navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Notifications' }] }));
      break;
    case 'widgets':
      navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Widgets' }] }));
      break;
    case 'paywall':
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Paywall', params: { feature: 'widgets' } }],
        }),
      );
      break;
  }
  markScene(scene);
}

function isAlreadyOnHome(): boolean {
  const state = navigationRef.getRootState();
  if (!state || state.routes.length !== 1) {
    return false;
  }
  const route = state.routes[state.index];
  if (route?.name !== 'Main') {
    return false;
  }
  const tabs = route.state;
  if (!tabs || tabs.index == null || !tabs.routes?.length) {
    return true;
  }
  return tabs.routes[tabs.index]?.name === 'HomeTab';
}

export function openStoreScreenshotSceneWhenIdle(scene: StoreScreenshotScene): void {
  InteractionManager.runAfterInteractions(() => {
    openStoreScreenshotScene(scene);
  });
}
