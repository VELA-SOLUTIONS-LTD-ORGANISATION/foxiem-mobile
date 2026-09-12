import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAds } from '@/ads';
import { AppText, Card, ProfileStackScreen, SettingsRow, useToast } from '@/components';
import { EXTERNAL_LINKS } from '@/constants/links';
import { LOCAL_DATA_CATEGORY_KEYS } from '@/constants/privacy';
import { getNotificationPermissionState, type NotificationPermissionState } from '@/notifications';
import { space } from '@/theme';

import { ExternalLinkRow } from './ExternalLinkRow';

export function PrivacySecurityScreen() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { privacyOptionsRequired, openPrivacyOptions } = useAds();
  const [permission, setPermission] = useState<NotificationPermissionState | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return;
    }

    void getNotificationPermissionState().then(setPermission);
  }, []);

  const permissionLabel =
    permission === 'granted'
      ? t('privacy.permission.allowed')
      : permission === 'denied'
        ? t('privacy.permission.denied')
        : permission === 'undetermined'
          ? t('privacy.permission.undetermined')
          : null;

  const onPrivacyChoices = async () => {
    try {
      await openPrivacyOptions();
    } catch {
      showToast({ type: 'error', title: t('privacy.adChoicesUnavailable') });
    }
  };

  return (
    <ProfileStackScreen title={t('privacy.title')} subtitle={t('privacy.subtitle')}>
        <Card variant="default" style={styles.card}>
          <AppText variant="h3">{t('privacy.yourData.title')}</AppText>
          <AppText variant="body" color="textSecondary">
            {t('privacy.yourData.body')}
          </AppText>
          <View style={styles.list}>
            {LOCAL_DATA_CATEGORY_KEYS.map((key) => (
              <AppText key={key} variant="body">
                {`• ${t(key)}`}
              </AppText>
            ))}
          </View>
          <AppText variant="caption" color="textSecondary">
            {t('privacy.yourData.derived')}
          </AppText>
        </Card>

        <Card variant="default" style={styles.card}>
          <AppText variant="h3">{t('privacy.storage.title')}</AppText>
          <AppText variant="body" color="textSecondary">
            {t('privacy.storage.body')}
          </AppText>
        </Card>

        <Card variant="default" style={styles.card}>
          <AppText variant="h3">{t('privacy.notifications.title')}</AppText>
          <AppText variant="body" color="textSecondary">
            {t('privacy.notifications.body')}
          </AppText>
          {permissionLabel ? (
            <AppText variant="caption" color="textSecondary">
              {`${t('privacy.permission.label')}: ${permissionLabel}`}
            </AppText>
          ) : null}
        </Card>

        <Card variant="default" style={styles.card}>
          <AppText variant="h3">{t('privacy.cloud.title')}</AppText>
          <AppText variant="body" color="textSecondary">
            {t('privacy.cloud.body')}
          </AppText>
        </Card>

        <Card variant="default" style={styles.card}>
          <AppText variant="h3">{t('privacy.advertising.title')}</AppText>
          <AppText variant="body" color="textSecondary">
            {t('privacy.advertising.body')}
          </AppText>
          {privacyOptionsRequired ? (
            <SettingsRow
              title={t('privacy.adChoices')}
              onPress={() => {
                void onPrivacyChoices();
              }}
              accessibilityLabel={t('privacy.adChoices')}
            />
          ) : null}
        </Card>

        <Card variant="default" style={styles.card}>
          <AppText variant="h3">{t('privacy.reset.title')}</AppText>
          <AppText variant="body" color="textSecondary">
            {t('privacy.reset.body')}
          </AppText>
        </Card>

        <Card variant="default" style={styles.card}>
          <ExternalLinkRow
            title={t('privacy.policy')}
            url={EXTERNAL_LINKS.privacyPolicy}
            missingMessage={t('privacy.policyNotConfigured')}
          />
        </Card>
    </ProfileStackScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[2],
  },
  list: {
    gap: space[1],
  },
});
