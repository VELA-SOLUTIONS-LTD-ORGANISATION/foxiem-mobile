import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FOXIEM_LOGO } from '@/constants/brand';
import { captureException } from '@/lib/telemetry/sentry';
import { useTheme } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

type State = { error: Error | null };

/** Last line of defence: never a blank screen, never a raw stack trace, data untouched. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    captureException(error, 'error_boundary');
    if (__DEV__) {
      console.error('Foxiem crashed', error, info.componentStack);
    }
  }

  render() {
    if (this.state.error) {
      return <Fallback onRetry={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}

function Fallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.colors.canvas }]}>
      <View style={styles.body}>
        <Image source={FOXIEM_LOGO} style={styles.logo} accessible={false} />
        <Text variant="title" align="center" accessibilityRole="header">
          {t('errors.boundaryTitle')}
        </Text>
        <Text variant="body" tone="inkSecondary" align="center" style={styles.copy}>
          {t('errors.boundaryBody')}
        </Text>
        <Button title={t('errors.boundaryRetry')} onPress={onRetry} style={styles.button} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 20,
  },
  copy: {
    marginTop: 10,
    maxWidth: 360,
  },
  button: {
    marginTop: 24,
    alignSelf: 'stretch',
  },
});
