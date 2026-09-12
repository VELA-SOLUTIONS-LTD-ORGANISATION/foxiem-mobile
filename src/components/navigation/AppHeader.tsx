import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/buttons/IconButton';
import { AppText } from '@/components/typography/AppText';
import { colors, sizes, space } from '@/theme';

type AppHeaderProps = {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  bordered?: boolean;
  align?: 'left' | 'center';
};

export function AppHeader({
  title,
  subtitle,
  showBack = true,
  onBackPress,
  leftAction,
  rightAction,
  bordered = false,
  align = 'left',
}: AppHeaderProps) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const handleBack = onBackPress ?? (() => navigation.goBack());

  return (
    <View style={[styles.row, bordered && styles.bordered]}>
      <View style={styles.side}>
        {showBack && canGoBack ? (
          <IconButton accessibilityLabel={t('common.back')} onPress={handleBack}>
            <Ionicons name="chevron-back" size={sizes.iconLg} color={colors.textPrimary} />
          </IconButton>
        ) : (
          leftAction
        )}
      </View>
      <View style={[styles.titleWrap, align === 'center' && styles.centered]}>
        {title ? (
          <AppText variant="h2" numberOfLines={2} align={align === 'center' ? 'center' : 'left'}>
            {title}
          </AppText>
        ) : null}
        {subtitle ? (
          <AppText
            variant="caption"
            color="textSecondary"
            numberOfLines={2}
            align={align === 'center' ? 'center' : 'left'}
          >
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.side, styles.right]}>{rightAction}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: sizes.controlLg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space[2],
    gap: space[2],
  },
  bordered: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  side: {
    width: sizes.touchMin,
    alignItems: 'flex-start',
  },
  right: {
    alignItems: 'flex-end',
  },
  titleWrap: {
    flex: 1,
    gap: space[1],
  },
  centered: {
    alignItems: 'center',
  },
});
