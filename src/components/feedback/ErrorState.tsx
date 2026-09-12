import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/buttons/AppButton';
import { AppText } from '@/components/typography/AppText';
import { space } from '@/theme';

type ErrorStateProps = {
  title: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title,
  message,
  retryLabel = 'Retry',
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.wrap}>
      <AppText variant="h3" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" color="textSecondary" align="center">
          {message}
        </AppText>
      ) : null}
      {onRetry ? <AppButton title={retryLabel} onPress={onRetry} fullWidth={false} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: space[3],
    padding: space[6],
  },
});
