import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, Header, IconButton, Text } from '@/components';
import { dayKey, isActivityEvent, type CountEvent } from '@/domain';
import { formatNumber, relativeDay } from '@/format';
import { useResponsiveLayout } from '@/hooks';
import type { RootScreenProps } from '@/navigation/types';
import { usePreferences, useTracker } from '@/state';
import { contentMaxWidth, useTheme } from '@/theme';

import { EntrySheet } from '../shared/EntrySheet';
import { EntryRow } from './EntryRow';

type DaySection = { key: string; title: string; total: number; data: CountEvent[] };

export function HistoryScreen({ route }: RootScreenProps<'History'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { language } = usePreferences();
  const { horizontalPadding } = useResponsiveLayout();
  const { tracker, events } = useTracker(route.params.trackerId);
  const [entry, setEntry] = useState<{ event: CountEvent | null } | null>(null);

  const sections = useMemo<DaySection[]>(() => {
    const now = new Date();
    const groups = new Map<string, DaySection>();
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index]!;
      const date = new Date(event.createdAt);
      const key = dayKey(date);
      let group = groups.get(key);
      if (!group) {
        const when = relativeDay(date, now, language);
        group = {
          key,
          title: when.kind === 'today' ? t('common.today') : when.kind === 'yesterday' ? t('common.yesterday') : when.label,
          total: 0,
          data: [],
        };
        groups.set(key, group);
      }
      group.data.push(event);
      if (isActivityEvent(event)) {
        group.total += event.amount;
      }
    }
    return [...groups.values()];
  }, [events, language, t]);

  if (!tracker) {
    return null;
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.fill, { backgroundColor: theme.colors.canvas }]}>
      <View style={[styles.headerWrap, { paddingHorizontal: horizontalPadding }]}>
        <Header
          title={t('history.title')}
          subtitle={tracker.name}
          right={
            <IconButton
              testID="history-add"
              icon="add"
              accessibilityLabel={t('detail.addEntry')}
              onPress={() => setEntry({ event: null })}
              style={styles.add}
            />
          }
        />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(event) => event.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth }]}
        ListEmptyComponent={
          <EmptyState
            title={t('history.empty')}
            action={{ label: t('detail.addEntry'), onPress: () => setEntry({ event: null }) }}
          />
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader} accessibilityRole="header">
            <Text variant="heading">{section.title}</Text>
            <Text variant="label" tone="inkSecondary" style={styles.total}>
              {formatNumber(Math.max(0, section.total), language)}
            </Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.item,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.line,
                borderTopLeftRadius: index === 0 ? theme.radius.lg : 0,
                borderTopRightRadius: index === 0 ? theme.radius.lg : 0,
                borderBottomLeftRadius: index === section.data.length - 1 ? theme.radius.lg : 0,
                borderBottomRightRadius: index === section.data.length - 1 ? theme.radius.lg : 0,
                borderTopWidth: index === 0 ? StyleSheet.hairlineWidth : 0,
                borderBottomWidth: index === section.data.length - 1 ? StyleSheet.hairlineWidth : 0,
              },
            ]}
          >
            {index > 0 ? <View style={[styles.separator, { backgroundColor: theme.colors.line }]} /> : null}
            <EntryRow event={item} tracker={tracker} locale={language} onPress={(event) => setEntry({ event })} />
          </View>
        )}
      />
      <EntrySheet tracker={tracker} event={entry?.event ?? null} visible={entry !== null} onClose={() => setEntry(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  headerWrap: {
    width: '100%',
    maxWidth: contentMaxWidth,
    alignSelf: 'center',
  },
  add: {
    marginRight: -12,
  },
  content: {
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 40,
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 8,
  },
  total: {
    fontVariant: ['tabular-nums'],
  },
  item: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 58,
  },
});
