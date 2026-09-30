import { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAccount } from '@/account';
import { Group, Header, Row, Screen, Section, Text, TrackerIcon, useToast } from '@/components';
import { FOXIEM_LOGO } from '@/constants/brand';
import { EXTERNAL_LINKS } from '@/constants/links';
import { archivedTrackers } from '@/domain';
import type { RootScreenProps } from '@/navigation/types';
import { usePreferences, useTrackerStore } from '@/state';
import { useTheme } from '@/theme';
import { getAppBuildNumber, getAppVersion } from '@/utils/appMetadata';
import { openExternalUrl } from '@/utils/externalLinks';

function Paragraph({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.paragraph, { backgroundColor: theme.colors.surface, borderColor: theme.colors.line, borderRadius: theme.radius.lg }]}>
      <Text variant="bodyStrong">{title}</Text>
      <Text variant="body" tone="inkSecondary" style={styles.paragraphBody}>
        {body}
      </Text>
    </View>
  );
}

export function PrivacyScreen(_props: RootScreenProps<'Privacy'>) {
  const { t } = useTranslation();
  const toast = useToast();
  const { preferences, setAnalyticsConsent } = usePreferences();
  const account = useAccount();
  return (
    <Screen>
      <Header title={t('privacy.title')} />
      <View style={styles.stack}>
        <Paragraph title={t('privacy.local')} body={t('privacy.localBody')} />
        {account.available ? <Paragraph title={t('privacy.accountTitle')} body={t('privacy.accountBody')} /> : null}
        <Paragraph title={t('privacy.notifications')} body={t('privacy.notificationsBody')} />
        <Paragraph title={t('privacy.export')} body={t('privacy.exportBody')} />
        <Paragraph title={t('privacy.analytics')} body={t('privacy.analyticsBody')} />
        <Group>
          <Row
            title={t('privacy.analyticsToggle')}
            switchValue={preferences.analyticsConsent === 'granted'}
            onSwitch={(share) => void setAnalyticsConsent(share ? 'granted' : 'denied')}
          />
          <Row
            title={t('privacy.policy')}
            onPress={() => {
              void openExternalUrl(EXTERNAL_LINKS.privacyPolicy).then((opened) => {
                if (!opened) {
                  toast.show({ message: t('about.linkFailed') });
                }
              });
            }}
          />
        </Group>
      </View>
    </Screen>
  );
}

export function AboutScreen(_props: RootScreenProps<'About'>) {
  const { t } = useTranslation();
  const toast = useToast();
  const version = getAppVersion();
  const build = getAppBuildNumber();
  const open = (url: string) => {
    void openExternalUrl(url).then((opened) => {
      if (!opened) {
        toast.show({ message: t('about.linkFailed') });
      }
    });
  };
  return (
    <Screen>
      <Header title={t('about.title')} />
      <View style={styles.identity}>
        <Image source={FOXIEM_LOGO} style={styles.logo} resizeMode="contain" accessible accessibilityLabel={t('about.appName')} />
        <Text variant="title">{t('about.appName')}</Text>
        <Text variant="bodyStrong" tone="inkSecondary">
          {t('about.tagline')}
        </Text>
        {version ? (
          <Text variant="caption" tone="inkTertiary">
            {build ? t('about.version', { version, build }) : t('about.versionOnly', { version })}
          </Text>
        ) : null}
      </View>
      <Text variant="body" tone="inkSecondary" align="center" style={styles.description}>
        {t('about.description')}
      </Text>
      <Group style={styles.group}>
        <Row title={t('about.support')} onPress={() => open(EXTERNAL_LINKS.support)} />
        <Row title={t('about.privacyPolicy')} onPress={() => open(EXTERNAL_LINKS.privacyPolicy)} />
      </Group>
      <Section title={t('about.licenses')}>
        <Text variant="caption" tone="inkSecondary">
          {t('about.licensesBody')}
        </Text>
      </Section>
    </Screen>
  );
}

export function ArchivedScreen(_props: RootScreenProps<'Archived'>) {
  const { t } = useTranslation();
  const toast = useToast();
  const store = useTrackerStore();
  const trackers = useMemo(() => archivedTrackers(store.trackers), [store.trackers]);
  return (
    <Screen>
      <Header title={t('archive.title')} />
      {trackers.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="bodyStrong">{t('archive.empty')}</Text>
          <Text variant="caption" tone="inkSecondary" style={styles.paragraphBody}>
            {t('archive.emptyBody')}
          </Text>
        </View>
      ) : (
        <Group style={styles.group} inset={68}>
          {trackers.map((tracker) => (
            <Row
              key={tracker.id}
              title={tracker.name}
              subtitle={t('archive.entries', { count: store.events[tracker.id]?.length ?? 0 })}
              leading={<TrackerIcon icon={tracker.icon} color={tracker.color} size={36} />}
              value={t('archive.restore')}
              onPress={() => {
                store.restoreTracker(tracker.id);
                toast.show({ message: t('archive.restored', { name: tracker.name }) });
              }}
            />
          ))}
        </Group>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
    marginTop: 12,
  },
  paragraph: {
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  paragraphBody: {
    marginTop: 6,
  },
  identity: {
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  logo: {
    width: 104,
    height: 104,
    marginBottom: 8,
  },
  description: {
    marginTop: 16,
  },
  group: {
    marginTop: 20,
  },
  empty: {
    marginTop: 24,
  },
});
