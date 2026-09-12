import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/typography/AppText';
import { space } from '@/theme';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onActionPress,
}: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <AppText variant="h3">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color="textSecondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onActionPress ? (
        <Pressable role="button" onPress={onActionPress} hitSlop={8}>
          <AppText variant="label" color="primary">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
  },
  copy: {
    flex: 1,
    gap: space[1],
  },
});
