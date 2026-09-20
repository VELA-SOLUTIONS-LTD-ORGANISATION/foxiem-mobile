import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader, AppText, Card, ConfirmDialog, Screen, SettingsRow } from '@/components';
import { FOXIEM_LOGO } from '@/constants/brand';
import { resetToProfileSetup } from '@/navigation/ref';
import type { MainTabScreenProps } from '@/navigation/types';
import { useAppState } from '@/state';
import { getTopicDisplayName } from '@/state/topics';
import { colors, radius, sizes, space } from '@/theme';
import { formatLocaleNumber } from '@/utils/number';

type Props = MainTabScreenProps<'ProfileTab'>;

export function ProfileScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { profile, counter, activeTopic, resetAppData } = useAppState();
  const [resetVisible, setResetVisible] = useState(false);

  const displayName = profile?.name ?? '';
  const displayUsername = profile?.username ? `@${profile.username}` : '';
  const activeTopicName = getTopicDisplayName(activeTopic, (key) => t(key));
  const totalCount = formatLocaleNumber(counter.currentCount, i18n.language);

  return (
    <Screen
      scroll
      constrained
      maxWidth={520}
      backgroundColor={colors.background}
      edges={['top', 'left', 'right']}
      contentStyle={styles.screenFill}
      scrollContentStyle={styles.scrollFill}
    >
      <View style={styles.container}>
        <AppHeader title={t('profile.title')} showBack={false} align="center" />

        <View style={styles.identitySection}>
          <View style={styles.avatarWrapper}>
            <Image
              source={FOXIEM_LOGO}
              style={styles.avatar}
              resizeMode="contain"
              alt={t('profile.avatarAlt')}
            />
          </View>
          <AppText variant="h2" style={styles.name}>
            {displayName}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {displayUsername}
          </AppText>
        </View>

        <Card variant="soft" style={styles.totalCard}>
          <View>
            <AppText variant="caption" color="textSecondary">
              {t('profile.topicCount', { topic: activeTopicName })}
            </AppText>
            <AppText variant="h1" style={styles.totalValue}>
              {totalCount}
            </AppText>
          </View>
          <View style={styles.chartGraphic} accessible={false} importantForAccessibility="no">
            <View style={[styles.chartBar, styles.chartBarSmall]} />
            <View style={[styles.chartBar, styles.chartBarMedium]} />
            <View style={[styles.chartBar, styles.chartBarLarge]} />
            <View style={[styles.chartBar, styles.chartBarHighest]} />
          </View>
        </Card>

        <Card variant="default" style={styles.menuCard}>
          <SettingsRow
            title={t('profile.editProfile')}
            leading={<ProfileMenuIcon name="person-outline" />}
            onPress={() => navigation.navigate('EditProfile')}
          />
          <View style={styles.divider} />
          <SettingsRow
            title={t('profile.reminders')}
            leading={<ProfileMenuIcon name="notifications-outline" />}
            onPress={() => navigation.navigate('Reminders')}
          />
          <View style={styles.divider} />
          <SettingsRow
            title={t('profile.language')}
            leading={<ProfileMenuIcon name="language-outline" />}
            onPress={() => navigation.navigate('Language')}
          />
          <View style={styles.divider} />
          <SettingsRow
            title={t('profile.privacy')}
            leading={<ProfileMenuIcon name="shield-checkmark-outline" />}
            onPress={() => navigation.navigate('PrivacySecurity')}
          />
          <View style={styles.divider} />
          <SettingsRow
            title={t('profile.resetData')}
            leading={<ProfileMenuIcon name="refresh-outline" tone="danger" />}
            destructive
            onPress={() => setResetVisible(true)}
          />
          <View style={styles.divider} />
          <SettingsRow
            title={t('profile.about')}
            leading={<ProfileMenuIcon name="information-circle-outline" />}
            onPress={() => navigation.navigate('About')}
          />
        </Card>
      </View>

      <ConfirmDialog
        visible={resetVisible}
        title={t('reset.title')}
        message={t('reset.message')}
        confirmLabel={t('reset.confirm')}
        cancelLabel={t('common.cancel')}
        variant="destructive"
        onCancel={() => setResetVisible(false)}
        onConfirm={async () => {
          await resetAppData();
          resetToProfileSetup();
          setResetVisible(false);
        }}
      />
    </Screen>
  );
}

function ProfileMenuIcon({
  name,
  tone = 'default',
}: {
  name: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'danger';
}) {
  return (
    <View style={[styles.menuIcon, tone === 'danger' && styles.menuIconDanger]}>
      <Ionicons
        name={name}
        size={20}
        color={tone === 'danger' ? colors.error : colors.textPrimary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenFill: {
    flexGrow: 1,
  },
  scrollFill: {
    flexGrow: 1,
    paddingBottom: space[8],
  },
  container: {
    width: '100%',
    paddingTop: space[2],
    paddingBottom: space[4],
    gap: space[5],
  },
  identitySection: {
    alignItems: 'center',
  },
  avatarWrapper: {
    width: sizes.avatarXl + space[2],
    height: sizes.avatarXl + space[2],
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
    marginBottom: space[3],
  },
  avatar: {
    width: '92%',
    height: '92%',
  },
  name: {
    marginBottom: space[1],
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingVertical: space[4],
  },
  totalValue: {
    marginTop: space[1],
  },
  chartGraphic: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[1],
  },
  chartBar: {
    width: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.secondary,
  },
  chartBarSmall: {
    height: 20,
    opacity: 0.45,
  },
  chartBarMedium: {
    height: 30,
    opacity: 0.6,
  },
  chartBarLarge: {
    height: 42,
    opacity: 0.78,
  },
  chartBarHighest: {
    height: 52,
  },
  menuCard: {
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    overflow: 'hidden',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSecondary,
  },
  menuIconDanger: {
    backgroundColor: colors.errorSoft,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginStart: 40 + space[3],
    backgroundColor: colors.borderSubtle,
  },
});
