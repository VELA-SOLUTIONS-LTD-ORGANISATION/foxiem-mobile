import { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Group, Header, ProBadge, Row, Screen, Section, Text, TrackerIcon } from '@/components';
import { orderTrackers } from '@/domain';
import type { RootScreenProps } from '@/navigation/types';
import { usePro } from '@/pro/ProProvider';
import { useFeature } from '@/pro/useFeature';
import { usePreferences, useTrackerStore } from '@/state';
import { readWatchStatus } from '@/widgets';

/** Settings › Widgets: which tracker the widgets show, how to add one, and what Pro adds. */
export function WidgetsScreen({ navigation }: RootScreenProps<'Widgets'>) {
  const { t } = useTranslation();
  const { preferences, update } = usePreferences();
  const store = useTrackerStore();
  const pro = usePro();
  const widgets = useFeature('widgets');
  const watchFeature = useFeature('watch');
  const isIos = Platform.OS === 'ios';
  const trackers = useMemo(() => orderTrackers(store.trackers.filter((tracker) => tracker.archivedAt === null)), [store.trackers]);
  const chosen = trackers.some((tracker) => tracker.id === preferences.widgetTrackerId) ? preferences.widgetTrackerId : null;
  const watch = useMemo(() => (isIos ? readWatchStatus() : null), [isIos]);

  const watchStatus = !watch
    ? null
    : !watch.supported
      ? t('watch.notSupported')
      : !watch.paired
        ? t('watch.notPaired')
        : !watch.appInstalled
          ? t('watch.notInstalled')
          : t('watch.ready');

  return (
    <Screen>
      <Header large title={t('widgets.title')} />
      <Text variant="body" tone="inkSecondary" style={styles.intro}>
        {t('widgets.intro')}
      </Text>

      <Section title={t('widgets.trackerTitle')} description={t('widgets.trackerBody')}>
        {trackers.length === 0 ? (
          <Text variant="body" tone="inkSecondary">
            {t('widgets.noTrackers')}
          </Text>
        ) : (
          <Group inset={68}>
            <Row
              testID="widget-tracker-automatic"
              title={t('widgets.automatic')}
              selected={chosen === null}
              onPress={() => void update({ widgetTrackerId: null })}
            />
            {trackers.map((tracker) => (
              <Row
                key={tracker.id}
                testID={`widget-tracker-${tracker.id}`}
                title={tracker.name}
                leading={<TrackerIcon icon={tracker.icon} color={tracker.color} size={36} />}
                selected={chosen === tracker.id}
                onPress={() => void update({ widgetTrackerId: tracker.id })}
              />
            ))}
          </Group>
        )}
      </Section>

      <Section title={t('widgets.addTitle')}>
        <Text variant="body" tone="inkSecondary">
          {isIos ? t('widgets.addIos') : t('widgets.addAndroid')}
        </Text>
      </Section>

      {pro.available && !widgets.allowed ? (
        <Section title={t('widgets.proTitle')}>
          <Text variant="body" tone="inkSecondary" style={styles.proBody}>
            {isIos ? t('widgets.proBodyIos') : t('widgets.proBodyAndroid')}
          </Text>
          <Group>
            <Row
              testID="widgets-unlock"
              title={t('widgets.unlock')}
              trailing={<ProBadge small />}
              onPress={() => navigation.navigate('Paywall', { feature: 'widgets' })}
            />
          </Group>
        </Section>
      ) : null}

      {isIos && watchStatus ? (
        <Section title={t('watch.title')} description={t('watch.body')}>
          {watchFeature.allowed ? (
            <Text variant="body" tone="inkSecondary" testID="watch-status">
              {watchStatus}
            </Text>
          ) : pro.available ? (
            <Group>
              <Row title={t('watch.proBody')} trailing={<ProBadge small />} onPress={() => navigation.navigate('Paywall', { feature: 'watch' })} />
            </Group>
          ) : null}
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginTop: 4,
  },
  proBody: {
    marginBottom: 12,
  },
});
