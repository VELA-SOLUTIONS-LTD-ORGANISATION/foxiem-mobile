import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';
import { initSentry, wrapRoot } from '@/lib/telemetry/sentry';

initSentry();

if (Platform.OS === 'android') {
  // Home-screen widgets run their tap handler headlessly, so it has to be registered before the app mounts.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (require('./src/widgets/android/register') as typeof import('./src/widgets/android/register')).registerAndroidWidgets();
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(wrapRoot(App));
