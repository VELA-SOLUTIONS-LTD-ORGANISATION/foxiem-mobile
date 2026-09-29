import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CreateTrackerScreen } from '@/screens/create/CreateTrackerScreen';
import { MonthlyReviewScreen, WeeklyReviewScreen } from '@/screens/insights/ReviewScreens';
import { StartScreen } from '@/screens/onboarding/StartScreen';
import { WelcomeScreen } from '@/screens/onboarding/WelcomeScreen';
import { PaywallScreen } from '@/screens/pro/PaywallScreen';
import { ReminderEditorScreen } from '@/screens/reminders/ReminderEditorScreen';
import { AboutScreen, ArchivedScreen, PrivacyScreen } from '@/screens/settings/InfoScreens';
import { NotificationsScreen } from '@/screens/settings/NotificationsScreen';
import { AppearanceScreen, LanguageScreen } from '@/screens/settings/PreferenceScreens';
import { HistoryScreen } from '@/screens/tracker/HistoryScreen';
import { TrackerDetailScreen } from '@/screens/tracker/TrackerDetailScreen';
import { TrackerSettingsScreen } from '@/screens/tracker/TrackerSettingsScreen';
import { YearViewScreen } from '@/screens/tracker/YearViewScreen';
import { useTheme } from '@/theme';

import { TabNavigator } from './TabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator({ initialRoute }: { initialRoute: 'Welcome' | 'Main' }) {
  const theme = useTheme();
  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.canvas } }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Start" component={StartScreen} />
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="TrackerDetail" component={TrackerDetailScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="TrackerSettings" component={TrackerSettingsScreen} />
      <Stack.Screen name="YearView" component={YearViewScreen} />
      <Stack.Screen name="ReminderEditor" component={ReminderEditorScreen} />
      <Stack.Screen name="WeeklyReview" component={WeeklyReviewScreen} />
      <Stack.Screen name="MonthlyReview" component={MonthlyReviewScreen} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="Appearance" component={AppearanceScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="Archived" component={ArchivedScreen} />
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen name="CreateTracker" component={CreateTrackerScreen} />
        <Stack.Screen name="Paywall" component={PaywallScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
