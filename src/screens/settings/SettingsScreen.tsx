import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog, Group, Header, ProBadge, Row, Screen, Section, Segmented, Sheet, Text, useToast } from '@/components';
import { buildSampleTrackers } from '@/dev/sampleData';
import { archivedTrackers, buildEventsCsv, buildWeeklySummaryCsv, exportFileName } from '@/domain';
import { addDays, startOfDay } from '@/domain/periods';
import { formatShortDate, weekdayName } from '@/format';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { trackEvent } from '@/lib/telemetry/analytics';
import { resetToWelcome } from '@/navigation/ref';
import type { TabScreenProps } from '@/navigation/types';
import { usePro } from '@/pro/ProProvider';
import type { SimulatedScenario } from '@/pro/purchaseAdapter';
import { useFeature } from '@/pro/useFeature';
import { deviceWeekStart, usePreferences, useReminders, useResetFoxiem, useTrackerStore } from '@/state';
import { useTheme } from '@/theme';

import { shareCsv } from './shareFile';

function Icon({ name, danger = false }: { name: keyof typeof Ionicons.glyphMap; danger?: boolean }) {
  const theme = useTheme();
  return <Ionicons name={name} size={22} color={danger ? theme.colors.danger : theme.colors.ink} />;
}

export function SettingsScreen({ navigation }: TabScreenProps<'SettingsTab'>) {
  const { t } = useTranslation();
  const toast = useToast();
  const { preferences, language, weekStart, update } = usePreferences();
  const store = useTrackerStore();
  const reminders = useReminders();
  const pro = usePro();
  const reports = useFeature('reports');
  const resetFoxiem = useResetFoxiem();
  const [confirmReset, setConfirmReset] = useState(false);
  const [weekSheet, setWeekSheet] = useState(false);
  const [busy, setBusy] = useState(false);

  const languageLabel = preferences.language
    ? SUPPORTED_LANGUAGES.find((item) => item.code === preferences.language)?.label ?? preferences.language
    : t('language.device');
  const appearanceLabel = t(`appearance.${preferences.appearance}`);
  const weekLabel = weekdayName(preferences.weekStart ?? deviceWeekStart(), language, 'long');
  const archivedCount = archivedTrackers(store.trackers).length;
  const notificationsValue =
    reminders.permission === 'granted'
      ? t('notifications.statusGranted')
      : reminders.permission === 'undetermined'
        ? t('notifications.statusUndetermined')
        : t('notifications.statusOff');

  const exportEntries = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    const result = await shareCsv(exportFileName('foxiem-entries'), buildEventsCsv(store.trackers, store.events), t('settings.export'));
    setBusy(false);
    if (result === 'shared') {
      void trackEvent('data_exported', { kind: 'entries' });
    } else {
      toast.show({ message: result === 'unavailable' ? t('settings.shareUnavailable') : t('settings.exportFailed') });
    }
  };

  const exportReport = async () => {
    if (!reports.allowed) {
      reports.request();
      return;
    }
    if (busy) {
      return;
    }
    setBusy(true);
    const end = addDays(startOfDay(new Date()), 1);
    const csv = buildWeeklySummaryCsv(store.trackers, store.events, { start: addDays(end, -7 * 26), end }, weekStart);
    const result = await shareCsv(exportFileName('foxiem-weekly-report'), csv, t('settings.report'));
    setBusy(false);
    if (result === 'shared') {
      void trackEvent('data_exported', { kind: 'report' });
    } else {
      toast.show({ message: result === 'unavailable' ? t('settings.shareUnavailable') : t('settings.exportFailed') });
    }
  };

  const restore = async () => {
    const outcome = await pro.restore();
    toast.show({
      message:
        outcome.status === 'restored'
          ? t('pro.restored')
          : outcome.status === 'nothingToRestore'
            ? t('pro.nothingToRestore')
            : t('pro.restoreFailed'),
    });
  };

  const entitlement = pro.entitlement;
  const now = new Date();
  const expiry = entitlement.expiresAt ? formatShortDate(new Date(entitlement.expiresAt), language, now) : '';
  const proTitle =
    entitlement.status === 'lifetime'
      ? t('pro.status.lifetime')
      : pro.isPro && entitlement.plan
        ? t('pro.status.active', { plan: t(`pro.plans.${entitlement.plan}`) })
        : t('pro.name');
  const proSubtitle =
    entitlement.status === 'grace'
      ? t('pro.status.grace', { date: expiry })
      : entitlement.status === 'billingRetry'
        ? t('pro.status.billingRetry')
        : entitlement.status === 'expired'
          ? `${t('pro.status.expired', { date: expiry })} · ${t('pro.status.expiredBody')}`
          : pro.isPro && entitlement.status === 'active'
            ? entitlement.willRenew
              ? t('pro.status.renews', { date: expiry })
              : t('pro.status.ends', { date: expiry })
            : pro.isPro
              ? undefined
              : t('pro.status.freeBody');

  return (
    <Screen>
      <Header large title={t('settings.title')} />

      {pro.available ? (
        <Section title={t('settings.pro')} style={styles.first}>
          <Group>
            <Row
              testID="settings-pro"
              title={proTitle}
              subtitle={proSubtitle}
              leading={<Icon name="sparkles-outline" />}
              trailing={pro.isPro ? undefined : <ProBadge small />}
              onPress={
                entitlement.status === 'billingRetry' && pro.manageUrl
                  ? () => void Linking.openURL(pro.manageUrl!)
                  : pro.isPro
                    ? undefined
                    : () => navigation.navigate('Paywall', undefined)
              }
            />
            <Row testID="settings-restore" title={t('pro.restore')} leading={<Icon name="refresh-outline" />} onPress={() => void restore()} />
            {pro.manageUrl && entitlement.plan && entitlement.plan !== 'lifetime' ? (
              <Row
                title={t('pro.manage')}
                leading={<Icon name="card-outline" />}
                onPress={() => void Linking.openURL(pro.manageUrl!)}
              />
            ) : null}
          </Group>
        </Section>
      ) : null}

      <Section title={t('settings.preferences')} style={pro.available ? undefined : styles.first}>
        <Group>
          <Row title={t('settings.language')} value={languageLabel} leading={<Icon name="language-outline" />} onPress={() => navigation.navigate('Language')} />
          <Row title={t('settings.appearance')} value={appearanceLabel} leading={<Icon name="contrast-outline" />} onPress={() => navigation.navigate('Appearance')} />
          <Row
            title={t('settings.haptics')}
            subtitle={t('settings.hapticsBody')}
            leading={<Icon name="phone-portrait-outline" />}
            switchValue={preferences.haptics}
            onSwitch={(haptics) => void update({ haptics })}
          />
          <Row title={t('settings.weekStart')} value={weekLabel} leading={<Icon name="calendar-outline" />} onPress={() => setWeekSheet(true)} />
        </Group>
      </Section>

      <Section title={t('settings.notifications')}>
        <Group>
          <Row
            testID="settings-notifications"
            title={t('settings.reminders')}
            value={notificationsValue}
            leading={<Icon name="notifications-outline" />}
            onPress={() => navigation.navigate('Notifications')}
          />
        </Group>
      </Section>

      <Section title={t('settings.data')}>
        <Group>
          <Row testID="settings-export" title={t('settings.export')} subtitle={t('settings.exportBody')} leading={<Icon name="download-outline" />} onPress={() => void exportEntries()} />
          {reports.visible ? (
            <Row
              title={t('settings.report')}
              subtitle={t('settings.reportBody')}
              leading={<Icon name="document-text-outline" />}
              trailing={reports.allowed ? undefined : <ProBadge small />}
              onPress={() => void exportReport()}
            />
          ) : null}
          <Row
            title={t('settings.archived')}
            value={archivedCount > 0 ? String(archivedCount) : undefined}
            leading={<Icon name="archive-outline" />}
            onPress={() => navigation.navigate('Archived')}
          />
          <Row testID="settings-reset" title={t('settings.reset')} destructive leading={<Icon name="trash-outline" danger />} onPress={() => setConfirmReset(true)} />
        </Group>
      </Section>

      <Section>
        <Group>
          <Row title={t('settings.privacy')} leading={<Icon name="shield-checkmark-outline" />} onPress={() => navigation.navigate('Privacy')} />
          <Row title={t('settings.about')} leading={<Icon name="information-circle-outline" />} onPress={() => navigation.navigate('About')} />
        </Group>
      </Section>

      {__DEV__ ? <DeveloperSection /> : null}

      <Sheet visible={weekSheet} title={t('settings.weekStart')} onClose={() => setWeekSheet(false)}>
        <Group>
          <Row
            title={t('settings.weekStartDevice', { day: weekdayName(deviceWeekStart(), language, 'long') })}
            selected={preferences.weekStart === null}
            onPress={() => {
              void update({ weekStart: null });
              setWeekSheet(false);
            }}
          />
          {([1, 0] as const).map((day) => (
            <Row
              key={day}
              title={weekdayName(day, language, 'long')}
              selected={preferences.weekStart === day}
              onPress={() => {
                void update({ weekStart: day });
                setWeekSheet(false);
              }}
            />
          ))}
        </Group>
      </Sheet>

      <ConfirmDialog
        visible={confirmReset}
        destructive
        title={t('reset.title')}
        message={t('reset.body')}
        confirmLabel={t('reset.confirm')}
        secondary={{
          label: t('reset.exportFirst'),
          onPress: () => {
            setConfirmReset(false);
            void exportEntries();
          },
        }}
        onCancel={() => setConfirmReset(false)}
        onConfirm={async () => {
          await resetFoxiem();
          setConfirmReset(false);
          resetToWelcome();
        }}
      />
    </Screen>
  );
}

function DeveloperSection() {
  const { t } = useTranslation();
  const toast = useToast();
  const pro = usePro();
  const store = useTrackerStore();
  const [scenario, setScenario] = useState<SimulatedScenario>('success');

  return (
    <Section title={t('settings.developer')}>
      <View style={styles.dev}>
        {pro.simulator ? (
          <>
            <Text variant="label" tone="inkSecondary">
              {t('settings.devScenario')}
            </Text>
            <Segmented
              value={scenario}
              onChange={(next) => {
                setScenario(next);
                void pro.simulator?.setScenario(next);
              }}
              options={[
                { value: 'success', label: 'OK' },
                { value: 'cancelled', label: 'Cancel' },
                { value: 'failed', label: 'Fail' },
                { value: 'pending', label: 'Pending' },
              ]}
            />
          </>
        ) : null}
        <Group>
          {pro.simulator ? (
            <Row
              title={t('settings.devExpire')}
              onPress={() => {
                void (async () => {
                  await pro.simulator?.expireNow();
                  await pro.refresh();
                })();
              }}
            />
          ) : null}
          {pro.simulator ? (
            <Row
              title={t('settings.devClear')}
              onPress={() => {
                void (async () => {
                  await pro.simulator?.clear();
                  await pro.refresh();
                })();
              }}
            />
          ) : null}
          <Row
            title={t('settings.devSeed')}
            onPress={() => {
              store.importTrackers(buildSampleTrackers(store.trackers, 'core'));
              toast.show({ message: t('settings.devSeeded') });
            }}
          />
          <Row
            title={`${t('settings.devSeed')} ×20`}
            onPress={() => {
              store.importTrackers(buildSampleTrackers(store.trackers, 'many'));
              toast.show({ message: t('settings.devSeeded') });
            }}
          />
        </Group>
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  first: {
    marginTop: 12,
  },
  dev: {
    gap: 10,
  },
});
