import { createNativeStackNavigator } from '@react-navigation/native-stack';

import {
  EditProfileScreen,
  LanguageScreen,
} from '@/screens/profile';
import { AddReminderScreen, EditReminderScreen, RemindersScreen } from '@/screens/reminders';
import { AboutScreen, PrivacySecurityScreen } from '@/screens/settings';
import { ActivityHistoryScreen, ConsistencyScreen } from '@/screens/statistics';

import { MainTabNavigator } from './MainTabNavigator';
import type { MainStackParamList } from './types';

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={MainTabNavigator} />
      <Stack.Screen name="ActivityHistory" component={ActivityHistoryScreen} />
      <Stack.Screen name="Consistency" component={ConsistencyScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Reminders" component={RemindersScreen} />
      <Stack.Screen name="AddReminder" component={AddReminderScreen} />
      <Stack.Screen name="EditReminder" component={EditReminderScreen} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
    </Stack.Navigator>
  );
}
