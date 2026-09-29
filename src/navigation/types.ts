import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { ProFeature } from '@/pro/features';

export type TabParamList = {
  HomeTab: undefined;
  InsightsTab: undefined;
  SettingsTab: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  Start: undefined;
  Main: NavigatorScreenParams<TabParamList> | undefined;
  CreateTracker: { templateId?: string; firstRun?: boolean } | undefined;
  TrackerDetail: { trackerId: string };
  TrackerSettings: { trackerId: string };
  History: { trackerId: string };
  ReminderEditor: { trackerId: string | null; reminderId?: string };
  Paywall: { feature?: ProFeature } | undefined;
  WeeklyReview: undefined;
  MonthlyReview: undefined;
  YearView: { trackerId: string };
  Language: undefined;
  Appearance: undefined;
  Notifications: undefined;
  Privacy: undefined;
  About: undefined;
  Archived: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
