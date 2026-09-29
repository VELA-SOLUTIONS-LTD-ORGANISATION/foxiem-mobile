import { useNavigation } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';

type HeaderProps = {
  title?: string;
  subtitle?: string;
  /** Large left-aligned title for top-level screens. */
  large?: boolean;
  back?: boolean | 'close';
  onBack?: () => void;
  right?: ReactNode;
};

export function Header({ title, subtitle, large = false, back = true, onBack, right }: HeaderProps) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();
  const canGoBack = navigation.canGoBack();
  const goBack = onBack ?? (() => navigation.goBack());

  if (large) {
    return (
      <View style={styles.largeRow}>
        <View style={styles.largeTitle}>
          {title ? (
            <Text variant="title" accessibilityRole="header" numberOfLines={2}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text variant="caption" tone="inkSecondary" style={{ marginTop: theme.space[1] }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {back && (canGoBack || onBack) ? (
          <IconButton
            icon={back === 'close' ? 'close' : 'chevron-back'}
            accessibilityLabel={back === 'close' ? t('common.close') : t('common.back')}
            onPress={goBack}
            style={styles.backButton}
          />
        ) : null}
      </View>
      <View style={styles.center}>
        {title ? (
          <Text variant="heading" align="center" numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" tone="inkTertiary" align="center" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    minWidth: 48,
    alignItems: 'flex-start',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  backButton: {
    marginLeft: -12,
  },
  center: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  largeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  largeTitle: {
    flex: 1,
    minWidth: 0,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
