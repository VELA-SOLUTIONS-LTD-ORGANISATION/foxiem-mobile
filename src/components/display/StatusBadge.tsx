import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/typography/AppText';
import { colors, radius, space } from '@/theme';

type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'error';

const VARIANT_STYLES: Record<
  BadgeVariant,
  { background: keyof typeof colors; text: keyof typeof colors }
> = {
  neutral: { background: 'surfaceSecondary', text: 'textSecondary' },
  info: { background: 'infoSoft', text: 'info' },
  success: { background: 'successSoft', text: 'success' },
  warning: { background: 'warningSoft', text: 'warning' },
  error: { background: 'errorSoft', text: 'error' },
};

type StatusBadgeProps = {
  label: string;
  variant?: BadgeVariant;
};

export function StatusBadge({ label, variant = 'neutral' }: StatusBadgeProps) {
  const tone = VARIANT_STYLES[variant];

  return (
    <View style={[styles.base, { backgroundColor: colors[tone.background] }]}>
      <AppText variant="captionSmall" color={tone.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: space[2],
    paddingVertical: space[1],
  },
});
