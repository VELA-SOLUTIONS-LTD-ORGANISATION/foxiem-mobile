import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Group, Row, Section, Segmented, Text, useToast } from '@/components';
import { usePro } from '@/pro/ProProvider';
import { useTrackerStore } from '@/state';

import type { SimulatedScenario } from './simulatedAdapter';
import { buildSampleTrackers } from './sampleData';

/**
 * Development-only tools. This file is only ever required behind `__DEV__`
 * (see SettingsScreen), so its English-only labels never reach a store build
 * and never need translating.
 */
export function DeveloperPanel() {
  const { t } = useTranslation();
  const toast = useToast();
  const pro = usePro();
  const store = useTrackerStore();
  const [scenario, setScenario] = useState<SimulatedScenario>('success');
  const simulator = pro.simulator;

  const seed = (kind: 'core' | 'many') => {
    store.importTrackers(buildSampleTrackers(store.trackers, kind));
    toast.show({ message: t('settings.devSeeded') });
  };

  return (
    <Section title={t('settings.developer')}>
      <View style={styles.dev}>
        {simulator ? (
          <>
            <Text variant="label" tone="inkSecondary">
              {t('settings.devScenario')}
            </Text>
            <Segmented
              value={scenario}
              onChange={(next) => {
                setScenario(next);
                void simulator.setScenario(next);
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
          {simulator ? (
            <Row
              title={t('settings.devExpire')}
              onPress={() => {
                void (async () => {
                  await simulator.expireNow();
                  await pro.refresh();
                })();
              }}
            />
          ) : null}
          {simulator ? (
            <Row
              title={t('settings.devClear')}
              onPress={() => {
                void (async () => {
                  await simulator.clear();
                  await pro.refresh();
                })();
              }}
            />
          ) : null}
          <Row title={t('settings.devSeed')} onPress={() => seed('core')} />
          <Row title={`${t('settings.devSeed')} x20`} onPress={() => seed('many')} />
        </Group>
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  dev: {
    gap: 10,
  },
});
