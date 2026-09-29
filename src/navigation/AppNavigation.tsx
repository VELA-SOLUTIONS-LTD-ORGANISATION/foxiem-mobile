import { DarkTheme, DefaultTheme, NavigationContainer, type Theme as NavigationTheme } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo, useRef } from 'react';

import { reminderTarget } from '@/notifications';
import { usePro } from '@/pro/ProProvider';
import { useNotices, usePreferences, useReminders, useTrackerStore } from '@/state';
import { useTheme } from '@/theme';

import { navigationRef, openHome, openTracker } from './ref';
import { RootNavigator } from './RootNavigator';

/** Renders navigation once every store has hydrated; until then the native splash stays up. */
export function AppNavigation() {
  const theme = useTheme();
  const preferences = usePreferences();
  const store = useTrackerStore();
  const reminders = useReminders();
  const pro = usePro();
  const notices = useNotices();
  const ready = preferences.hydrated && store.hydrated && reminders.hydrated && pro.hydrated && notices.hydrated;
  const pendingTracker = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.canvas).catch(() => undefined);
  }, [theme.colors.canvas]);

  const navigationTheme = useMemo<NavigationTheme>(() => {
    const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.ink,
        background: theme.colors.canvas,
        card: theme.colors.surface,
        text: theme.colors.ink,
        border: theme.colors.line,
        notification: theme.colors.brand,
      },
    };
  }, [theme]);

  useEffect(() => {
    const route = (trackerId: string | null) => {
      if (!navigationRef.isReady()) {
        pendingTracker.current = trackerId;
        return;
      }
      if (trackerId && store.trackers.some((tracker) => tracker.id === trackerId)) {
        openTracker(trackerId);
      } else if (store.firstRunCompleted) {
        openHome();
      }
    };
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const target = reminderTarget(response);
      if (target) {
        route(target.trackerId);
      }
    });
    return () => subscription.remove();
  }, [store.firstRunCompleted, store.trackers]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        const target = response ? reminderTarget(response) : null;
        if (!target?.trackerId) {
          return;
        }
        if (navigationRef.isReady()) {
          if (store.trackers.some((tracker) => tracker.id === target.trackerId)) {
            openTracker(target.trackerId);
          }
        } else {
          pendingTracker.current = target.trackerId;
        }
      })
      .catch(() => undefined);
    // Only the launch notification matters here; later taps use the listener above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onReady={() => {
        void SplashScreen.hideAsync().catch(() => undefined);
        const trackerId = pendingTracker.current;
        if (trackerId && store.trackers.some((tracker) => tracker.id === trackerId)) {
          openTracker(trackerId);
        }
        pendingTracker.current = undefined;
      }}
    >
      <RootNavigator initialRoute={store.firstRunCompleted ? 'Main' : 'Welcome'} />
    </NavigationContainer>
  );
}
