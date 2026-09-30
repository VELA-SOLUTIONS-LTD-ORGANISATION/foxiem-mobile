import { registerWidgetConfigurationScreen, registerWidgetTaskHandler } from 'react-native-android-widget';

import { WidgetConfigScreen } from './ConfigScreen';
import { widgetTaskHandler } from './handler';

/** Called once from `index.ts` on Android, before the app component is registered. */
export function registerAndroidWidgets(): void {
  registerWidgetTaskHandler(widgetTaskHandler);
  registerWidgetConfigurationScreen(WidgetConfigScreen);
}
