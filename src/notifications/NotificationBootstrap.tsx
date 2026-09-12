import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

import { navigateToHome } from '@/navigation/ref';
import { useAppState } from '@/state';

import { configureReminderNotifications, isFoxiemReminderResponse } from './reminderNotifications';

export function NotificationBootstrap() {
  const { hydrated, setupCompleted } = useAppState();

  useEffect(() => {
    void configureReminderNotifications();
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const openHome = () => {
      if (setupCompleted) {
        navigateToHome();
      }
    };

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (isFoxiemReminderResponse(response)) {
        openHome();
      }
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response && isFoxiemReminderResponse(response)) {
        openHome();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [hydrated, setupCompleted]);

  return null;
}
