import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { LinearProgress } from '@/components/display/LinearProgress';
import { AppText } from '@/components/typography/AppText';
import { colors, space } from '@/theme';

type LoadingStateProps = {
  title?: string;
  body?: string;
  illustration?: ReactNode;
  progress?: number;
  fullScreen?: boolean;
};

export function LoadingState({
  title = 'Loading',
  body,
  illustration,
  progress,
  fullScreen = false,
}: LoadingStateProps) {
  return (
    <View style={[styles.wrap, fullScreen && styles.full]}>
      {illustration ?? <ActivityIndicator size="large" color={colors.primary} />}
      <AppText variant="h3" align="center">
        {title}
      </AppText>
      {body ? (
        <AppText variant="body" color="textSecondary" align="center">
          {body}
        </AppText>
      ) : null}
      {progress !== undefined ? <LinearProgress progress={progress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: space[3],
    padding: space[6],
  },
  full: {
    flex: 1,
    justifyContent: 'center',
  },
});
