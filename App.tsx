import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

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

function ThemedApp({ children }: { children: ReactNode }) {
  const { preferences } = usePreferences();
  return <ThemeProvider appearance={preferences.appearance}>{children}</ThemeProvider>;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts(APP_FONT_MAP);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
