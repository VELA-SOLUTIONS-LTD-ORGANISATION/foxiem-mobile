import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme';

import { Button } from './Button';
import { IconButton } from './IconButton';
import { Text } from './Text';

export function ProBadge({ small = false }: { small?: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={t('a11y.proBadge')}
      style={[
        styles.badge,
        small && styles.badgeSmall,
        { backgroundColor: theme.colors.ink, borderRadius: theme.radius.xs },
      ]}
    >
      <Text variant="micro" color={theme.colors.canvas}>
        {t('pro.badge')}
      </Text>
    </View>
  );
}

type BannerProps = {
  title: string;
  body?: string;
  tone?: 'neutral' | 'caution' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  action?: { label: string; onPress: () => void };
  /** A second, equally weighted choice (for example "No thanks" beside "Allow"). */
  secondaryAction?: { label: string; onPress: () => void };
  onDismiss?: () => void;
};

export function Banner({ title, body, tone = 'neutral', icon, action, secondaryAction, onDismiss }: BannerProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const background =
    tone === 'caution' ? theme.colors.cautionSoft : tone === 'danger' ? theme.colors.dangerSoft : theme.colors.surface;
  const ink = tone === 'caution' ? theme.colors.caution : tone === 'danger' ? theme.colors.danger : theme.colors.ink;
  return (
    <View
      accessibilityRole="summary"
      style={[
        styles.banner,
        {
          backgroundColor: background,
          borderColor: tone === 'neutral' ? theme.colors.line : 'transparent',
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <View style={styles.bannerRow}>
        {icon ? <Ionicons name={icon} size={22} color={ink} style={styles.bannerIcon} /> : null}
        <View style={styles.bannerCopy}>
          <Text variant="bodyStrong" color={ink}>
            {title}
          </Text>
          {body ? (
            <Text variant="caption" tone="inkSecondary" style={styles.bannerBody}>
              {body}
            </Text>
          ) : null}
        </View>
        {onDismiss ? (
          <IconButton icon="close" size={20} accessibilityLabel={t('common.close')} onPress={onDismiss} style={styles.bannerClose} />
        ) : null}
      </View>
      {action || secondaryAction ? (
        <View style={styles.bannerAction}>
          {action ? <Button title={action.label} onPress={action.onPress} variant="secondary" compact /> : null}
          {secondaryAction ? (
            <Button title={secondaryAction.label} onPress={secondaryAction.onPress} variant="secondary" compact />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

type EmptyStateProps = {
  title: string;
  body?: string;
  image?: ImageSourcePropType;
  imageAlt?: string;
  action?: { label: string; onPress: () => void };
  children?: ReactNode;
};

export function EmptyState({ title, body, image, imageAlt, action, children }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      {image ? (
        <Image source={image} style={styles.emptyImage} resizeMode="contain" accessibilityLabel={imageAlt} accessible={Boolean(imageAlt)} />
      ) : null}
      <Text variant="titleSmall" align="center">
        {title}
      </Text>
      {body ? (
        <Text variant="body" tone="inkSecondary" align="center" style={{ marginTop: theme.space[2] }}>
          {body}
        </Text>
      ) : null}
      {action ? (
        <View style={styles.emptyAction}>
          <Button title={action.label} onPress={action.onPress} />
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  banner: {
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bannerIcon: {
    marginRight: 12,
    marginTop: 1,
  },
  bannerCopy: {
    flex: 1,
    minWidth: 0,
  },
  bannerBody: {
    marginTop: 4,
  },
  bannerClose: {
    marginTop: -12,
    marginRight: -12,
  },
  bannerAction: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 8,
  },
  emptyImage: {
    width: 180,
    height: 140,
    marginBottom: 16,
  },
  emptyAction: {
    marginTop: 20,
    alignSelf: 'stretch',
  },
});
