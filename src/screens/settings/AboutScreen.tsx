import { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, ProfileStackScreen } from '@/components';
import { FOXIEM_LOGO } from '@/constants/brand';
import { EXTERNAL_LINKS } from '@/constants/links';
import { getNotificationPermissionState } from '@/notifications';
import { FOXIEM_STORAGE_KEYS } from '@/storage';
import { colors, radius, sizes, space } from '@/theme';
import { getAppBuildNumber, getAppIdentifier, getAppVersion } from '@/utils/appMetadata';
import { isConfiguredExternalUrl } from '@/utils/externalLinks';

import { ExternalLinkRow } from './ExternalLinkRow';

export function AboutScreen() {
  const { t, i18n } = useTranslation();
  const version = getAppVersion();
  const build = getAppBuildNumber();
  const showTerms = isConfiguredExternalUrl(EXTERNAL_LINKS.termsOfUse);
  const [devPermission, setDevPermission] = useState<string | null>(null);

  useEffect(() => {
    if (!__DEV__ || (Platform.OS !== 'ios' && Platform.OS !== 'android')) {
      return;
    }

    void getNotificationPermissionState().then(setDevPermission);
  }, []);

  return (
    <ProfileStackScreen title={t('about.title')}>
        <View style={styles.identity}>
          <View style={styles.logoWrap}>
            <Image
              source={FOXIEM_LOGO}
              style={styles.logo}
              resizeMode="contain"
              alt={t('about.appName')}
            />
          </View>
          <AppText variant="h2" align="center">
            {t('about.appName')}
          </AppText>
          <AppText variant="caption" color="textSecondary" align="center">
            {t('about.tagline')}
          </AppText>
        </View>

        {version || build ? (
          <Card variant="default" style={styles.card}>
            <MetadataRow label={t('about.version')} value={version} />
            <MetadataRow label={t('about.build')} value={build} />
          </Card>
        ) : null}

        <Card variant="default" style={styles.card}>
          <AppText variant="body" color="textSecondary">
            {t('about.description')}
          </AppText>
        </Card>

        <Card variant="soft" style={styles.card}>
          <AppText variant="h3">{t('about.localFirst.title')}</AppText>
          <AppText variant="body" color="textSecondary">
            {t('about.localFirst.body')}
          </AppText>
        </Card>

        <Card variant="default" style={styles.card}>
          <ExternalLinkRow
            title={t('about.privacyPolicy')}
            url={EXTERNAL_LINKS.privacyPolicy}
            missingMessage={t('privacy.policyNotConfigured')}
          />
          {showTerms ? (
            <ExternalLinkRow
              title={t('about.terms')}
              url={EXTERNAL_LINKS.termsOfUse}
              missingMessage={t('common.notConfigured')}
            />
          ) : null}
        </Card>

        {__DEV__ ? (
          <Card variant="outlined" style={styles.card}>
            <AppText variant="label" color="textSecondary">
              {t('about.dev.title')}
            </AppText>
            <MetadataRow label={t('about.dev.appId')} value={getAppIdentifier()} />
            <MetadataRow
              label={t('about.dev.storageKeys')}
              value={String(FOXIEM_STORAGE_KEYS.length)}
            />
            <MetadataRow label={t('about.dev.locale')} value={i18n.language} />
            {devPermission ? (
              <MetadataRow label={t('about.dev.notifications')} value={devPermission} />
            ) : null}
          </Card>
        ) : null}
    </ProfileStackScreen>
  );
}

function MetadataRow({ label, value }: { label: string; value: string | null }) {
  if (!value) {
    return null;
  }

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${label}, ${value}`}
      style={styles.metaRow}
    >
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
      <AppText variant="label">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  identity: {
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
  },
  logoWrap: {
    width: sizes.avatarXl,
    height: sizes.avatarXl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
  },
  logo: {
    width: '92%',
    height: '92%',
  },
  card: {
    gap: space[2],
  },
  metaRow: {
    gap: space[1],
  },
});
