import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type MainTabParamList = {
  HomeTab: undefined;
  StatisticsTab: undefined;
  ProfileTab: undefined;
};

export type MainStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList>;
  ActivityHistory: undefined;
  Consistency: undefined;
  EditProfile: undefined;
  Reminders: undefined;
  AddReminder: undefined;
  EditReminder: { reminderId: string };
  Language: undefined;
  PrivacySecurity: undefined;
  About: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  ProfileSetup: undefined;
  Main: NavigatorScreenParams<MainStackParamList>;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type MainStackScreenProps<T extends keyof MainStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<MainStackParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  MainStackScreenProps<keyof MainStackParamList>
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
