import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AdsProvider } from '@/ads';
import { ToastProvider } from '@/components';
import '@/i18n';
import { AppNavigation } from '@/navigation';
import { NotificationBootstrap } from '@/notifications/NotificationBootstrap';
import { AppStateProvider } from '@/state';
import { APP_FONT_MAP, ThemeProvider, colors } from '@/theme';

void SystemUI.setBackgroundColorAsync(colors.background);

export default function App() {
  const [fontsLoaded] = useFonts(APP_FONT_MAP);

  if (!fontsLoaded) {
    return <View style={styles.boot} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppStateProvider>
            <AdsProvider>
              <ToastProvider>
                <NotificationBootstrap />
                <StatusBar style="dark" />
                <AppNavigation />
              </ToastProvider>
            </AdsProvider>
          </AppStateProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  boot: {
    flex: 1,
    backgroundColor: colors.splashBackground,
  },
});
