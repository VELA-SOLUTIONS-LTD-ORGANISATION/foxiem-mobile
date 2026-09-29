import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeScreen } from '@/screens/home/HomeScreen';
import { InsightsScreen } from '@/screens/insights/InsightsScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { useTheme } from '@/theme';

import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  HomeTab: ['home', 'home-outline'],
  InsightsTab: ['pulse', 'pulse-outline'],
  SettingsTab: ['settings', 'settings-outline'],
};

export function TabNavigator() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.ink,
        tabBarInactiveTintColor: theme.colors.inkTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.line,
          // The default 49pt bar is sized for 10pt labels; ours are 12pt.
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fontFamily.semibold,
          fontSize: 12,
          lineHeight: 16,
        },
        tabBarAllowFontScaling: true,
        tabBarLabelPosition: 'below-icon',
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={ICONS[route.name][focused ? 0 : 1]} size={size} color={color} />
        ),
        tabBarButtonTestID: `tab-${route.name}`,
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: t('navigation.home') }} />
      <Tab.Screen name="InsightsTab" component={InsightsScreen} options={{ title: t('navigation.insights') }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ title: t('navigation.settings') }} />
    </Tab.Navigator>
  );
}
