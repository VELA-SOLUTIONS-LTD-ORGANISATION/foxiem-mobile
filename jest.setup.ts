jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-GB', regionCode: 'GB' }],
  getCalendars: () => [{ firstWeekday: 2, uses24hourClock: true, timeZone: 'Europe/London', calendar: 'gregory' }],
}));

jest.mock('expo-font', () => ({
  loadAsync: jest.fn(async () => undefined),
  isLoaded: jest.fn(() => true),
  isLoading: jest.fn(() => false),
  useFonts: () => [true, null],
}));

jest.mock('@expo-google-fonts/bricolage-grotesque', () => ({
  BricolageGrotesque_700Bold: 'BricolageGrotesque_700Bold',
  BricolageGrotesque_800ExtraBold: 'BricolageGrotesque_800ExtraBold',
}));

jest.mock('@expo-google-fonts/figtree', () => ({
  Figtree_400Regular: 'Figtree_400Regular',
  Figtree_500Medium: 'Figtree_500Medium',
  Figtree_600SemiBold: 'Figtree_600SemiBold',
  Figtree_700Bold: 'Figtree_700Bold',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Soft: 'soft', Rigid: 'rigid' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => undefined),
  hideAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    exists = false;
    content = '';
    constructor(...parts: unknown[]) {
      this.uri = parts.map(String).join('/');
    }
    create() {
      this.exists = true;
    }
    delete() {
      this.exists = false;
    }
    write(content: string) {
      this.content = content;
    }
  }
  return { File, Paths: { cache: 'cache', document: 'document' } };
});

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted', canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted', canAskAgain: true })),
  scheduleNotificationAsync: jest.fn(async () => `notif-${Math.random().toString(36).slice(2, 8)}`),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  setNotificationCategoryAsync: jest.fn(async () => []),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  AndroidImportance: { DEFAULT: 3 },
  PermissionStatus: { DENIED: 'denied', GRANTED: 'granted', UNDETERMINED: 'undetermined' },
  SchedulableTriggerInputTypes: { WEEKLY: 'weekly', DATE: 'date' },
}));
