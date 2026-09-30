import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getNotificationPermission } from '@/notifications';

/**
 * The Expo push token for this device, or null. Never prompts: it only exists when the person has
 * already allowed notifications (for reminders), and it is only used for billing-issue messages.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return null;
  }
  try {
    if ((await getNotificationPermission()) !== 'granted') {
      return null;
    }
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      return null;
    }
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data || null;
  } catch {
    return null;
  }
}
