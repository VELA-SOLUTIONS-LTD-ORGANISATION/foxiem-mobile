import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeScreen } from '@/screens/home';
import { ProfileScreen } from '@/screens/profile';
import { StatisticsScreen } from '@/screens/statistics';
import { colors, sizes } from '@/theme';

import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICON_SIZE = 26;

const TAB_ICONS: Record<
  keyof MainTabParamList,
  { focused: keyof typeof Ionicons.glyphMap; idle: keyof typeof Ionicons.glyphMap }
> = {
  HomeTab: { focused: 'home', idle: 'home-outline' },
  StatisticsTab: { focused: 'bar-chart', idle: 'bar-chart-outline' },
  ProfileTab: { focused: 'person', idle: 'person-outline' },
};

export function MainTabNavigator() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = Math.max(sizes.controlLg + 6, 56) + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        safeAreaInsets: { bottom: 0 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          minHeight: tabBarHeight,
          height: tabBarHeight,
          paddingBottom: insets.bottom,
          paddingTop: 4,
        },
        tabBarItemStyle: {
          minHeight: 48,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color }) => {
          const icons = TAB_ICONS[route.name];
          return (
            <Ionicons
              name={focused ? icons.focused : icons.idle}
              size={TAB_ICON_SIZE}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: t('navigation.home'),
          tabBarAccessibilityLabel: t('navigation.home'),
        }}
      />
      <Tab.Screen
        name="StatisticsTab"
        component={StatisticsScreen}
        options={{
          title: t('navigation.statistics'),
          tabBarAccessibilityLabel: t('navigation.statistics'),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: t('navigation.profile'),
          tabBarAccessibilityLabel: t('navigation.profile'),
        }}
      />
    </Tab.Navigator>
  );
}
