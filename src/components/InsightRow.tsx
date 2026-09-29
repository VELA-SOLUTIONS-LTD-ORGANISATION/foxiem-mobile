import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import { ProBadge } from './Feedback';
import { Text } from './Text';

type InsightRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  detail?: string;
  locked?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
};

/** A deterministic sentence. Locked rows explain the Pro capability instead of showing fake data. */
export function InsightRow({ icon, text, detail, locked = false, onPress, accessibilityHint }: InsightRowProps) {
  const theme = useTheme();
  const body = (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: theme.colors.sunken, borderRadius: theme.radius.sm }]}>
        <Ionicons name={icon} size={18} color={theme.colors.inkSecondary} />
      </View>
      <View style={styles.copy}>
        <Text variant="body" tone={locked ? 'inkSecondary' : 'ink'}>
          {text}
        </Text>
        {detail ? (
          <Text variant="caption" tone="inkTertiary" style={styles.detail}>
            {detail}
          </Text>
        ) : null}
      </View>
      {locked ? <ProBadge small /> : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={theme.colors.inkTertiary} /> : null}
    </View>
  );
  if (!onPress) {
    return <View accessible>{body}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [pressed && { backgroundColor: theme.colors.sunken }]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  icon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  detail: {
    marginTop: 2,
  },
});
