import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Dimensions, LogBox, Platform, StyleSheet } from 'react-native';

import { AccountProvider, AccountSync } from '@/account';
import { ToastProvider } from '@/components';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import '@/i18n';
import { AppNavigation } from '@/navigation';
import { ProProvider } from '@/pro/ProProvider';
import {
  CountFeedbackProvider,
  NoticesProvider,
  PreferencesProvider,
  ReminderProvider,
  TrackerStoreProvider,
  usePreferences,
} from '@/state';
import { APP_FONT_MAP, ThemeProvider } from '@/theme';
import { WidgetSync } from '@/widgets';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

if (__DEV__ && process.env.EXPO_PUBLIC_STORE_SCREENSHOTS === '1') {
  LogBox.ignoreAllLogs(true);
}

function ThemedApp({ children }: { children: ReactNode }) {
  const { preferences } = usePreferences();
  return <ThemeProvider appearance={preferences.appearance}>{children}</ThemeProvider>;
}

function screenshotSafeAreaMetrics() {
  if (Platform.OS !== 'web' || process.env.EXPO_PUBLIC_STORE_SCREENSHOTS !== '1') {
    return undefined;
  }
  const { width, height } = Dimensions.get('window');
  const tablet = Math.min(width, height) >= 768;
  return {
    frame: { x: 0, y: 0, width, height },
    insets: tablet
      ? { top: 24, left: 0, right: 0, bottom: 20 }
      : { top: 59, left: 0, right: 0, bottom: 34 },
  };
}

function AppTree() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={screenshotSafeAreaMetrics()}>
        <PreferencesProvider>
          <ThemedApp>
            <ErrorBoundary>
              <TrackerStoreProvider>
                <ProProvider>
                  <AccountProvider>
                    <ReminderProvider>
                      <NoticesProvider>
                        <CountFeedbackProvider>
                          <ToastProvider>
                            <WidgetSync />
                            <AccountSync />
                            <AppNavigation />
                          </ToastProvider>
                        </CountFeedbackProvider>
                      </NoticesProvider>
                    </ReminderProvider>
                  </AccountProvider>
                </ProProvider>
              </TrackerStoreProvider>
            </ErrorBoundary>
          </ThemedApp>
        </PreferencesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts(APP_FONT_MAP);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (__DEV__ && process.env.EXPO_PUBLIC_STORE_SCREENSHOTS === '1') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ScreenshotFixtureGate } = require('@/dev/storeScreenshotGate') as typeof import('@/dev/storeScreenshotGate');
    return (
      <ScreenshotFixtureGate>
        <AppTree />
      </ScreenshotFixtureGate>
    );
  }

  return <AppTree />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
