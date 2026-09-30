import { DarkTheme, DefaultTheme, NavigationContainer, type Theme as NavigationTheme } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Linking } from 'react-native';

import { quickCountTarget, reminderTarget } from '@/notifications';
import { usePro } from '@/pro/ProProvider';
import { useNotices, usePreferences, useReminders, useTrackerStore } from '@/state';
import { readJson, writeJson } from '@/storage/appStorage';
import { STORAGE_KEYS } from '@/storage/keys';
import { useTheme } from '@/theme';

import { parseDeepLink, type DeepLinkTarget } from './deepLinks';
import { navigationRef, openHome, openPaywall, openTracker } from './ref';
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
  const pending = useRef<DeepLinkTarget | null>(null);
  const trackersRef = useRef(store.trackers);
  const firstRunRef = useRef(store.firstRunCompleted);

  useEffect(() => {
    trackersRef.current = store.trackers;
    firstRunRef.current = store.firstRunCompleted;
  }, [store.firstRunCompleted, store.trackers]);

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

  /** Go where a link, widget or notification points. Anything stale falls back to Home, never a dead screen. */
  const go = useCallback((target: DeepLinkTarget) => {
    if (!navigationRef.isReady()) {
      pending.current = target;
      return;
    }
    // Before first run is finished the Welcome flow owns navigation.
    if (!firstRunRef.current) {
      return;
    }
    if (target.kind === 'tracker') {
      if (trackersRef.current.some((tracker) => tracker.id === target.trackerId && tracker.archivedAt === null)) {
        openTracker(target.trackerId);
      } else {
        openHome();
      }
    } else if (target.kind === 'paywall') {
      openPaywall(target.feature);
    } else {
      openHome();
    }
  }, []);

  const { tap } = store;
  const seenPresses = useRef(new Set<string>());
  /** The notification's Count button: apply once (the key survives relaunches) and stay where the user was. */
  const countFromNotification = useCallback(
    async (response: Notifications.NotificationResponse) => {
      const press = quickCountTarget(response);
      if (!press) {
        return false;
      }
      // The listener and the launch check can both see the same press; only one may count it.
      if (seenPresses.current.has(press.key)) {
        return true;
      }
      const last = await readJson<string>(STORAGE_KEYS.lastQuickAction);
      if (last !== press.key) {
        seenPresses.current.add(press.key);
        // Before the stores have loaded there is nothing to count into: leave it for the launch check.
        if (tap(press.trackerId, 'up')) {
          await writeJson(STORAGE_KEYS.lastQuickAction, press.key);
        } else {
          seenPresses.current.delete(press.key);
        }
      }
      return true;
    },
    [tap],
  );

  useEffect(() => {
    const notificationSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void countFromNotification(response).then((handled) => {
        if (handled) {
          return;
        }
        const target = reminderTarget(response);
        if (target) {
          go(target.trackerId ? { kind: 'tracker', trackerId: target.trackerId } : { kind: 'home' });
        }
      });
    });
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      const target = parseDeepLink(url);
      if (target) {
        go(target);
      }
    });
    return () => {
      notificationSubscription.remove();
      linkSubscription.remove();
    };
  }, [countFromNotification, go]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    // Only the launch notification or link matters here; later ones use the listeners above.
    void Notifications.getLastNotificationResponseAsync()
      .then(async (response) => {
        if (!response || (await countFromNotification(response))) {
          return;
        }
        const target = reminderTarget(response);
        if (target?.trackerId) {
          go({ kind: 'tracker', trackerId: target.trackerId });
        }
      })
      .catch(() => undefined);
    void Linking.getInitialURL()
      .then((url) => {
        const target = parseDeepLink(url);
        if (target) {
          go(target);
        }
      })
      .catch(() => undefined);
  }, [countFromNotification, go, ready]);

  if (!ready) {
    return null;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onReady={() => {
        void SplashScreen.hideAsync().catch(() => undefined);
        const target = pending.current;
        pending.current = null;
        if (target) {
          go(target);
        }
      }}
    >
      <RootNavigator initialRoute={store.firstRunCompleted ? 'Main' : 'Welcome'} />
    </NavigationContainer>
  );
}
