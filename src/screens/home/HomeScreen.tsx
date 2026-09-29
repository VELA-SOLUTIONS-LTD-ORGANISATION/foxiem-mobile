import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Banner, EmptyState, IconButton, Text, TrackerIcon } from '@/components';
import { FOXIEM_HOME_IMAGE } from '@/constants/brand';
import { activeTrackers, archivedTrackers, findTemplate, TRACKER_TEMPLATES, type Tracker } from '@/domain';
import { trackerSnapshot, type TrackerSnapshot } from '@/domain/analysis';
import { formatLongDate } from '@/format';
import { useResponsiveLayout } from '@/hooks';
import type { TabScreenProps } from '@/navigation/types';
import { NOTICE_IDS, useCountFeedback, useNotices, usePreferences, useTrackerStore } from '@/state';
import { contentMaxWidth, useTheme } from '@/theme';

import { AmountSheet } from '../shared/AmountSheet';
import { useAnalysisContext } from '../shared/useAnalysisContext';
import { useCounting } from '../shared/useCounting';
import { TrackerRow } from './TrackerRow';

const QUICK_TEMPLATES = ['water', 'coffee', 'reading'] as const;

export function HomeScreen({ navigation }: TabScreenProps<'HomeTab'>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { language, reduceMotion } = usePreferences();
  const { horizontalPadding, isCompact } = useResponsiveLayout();
  const store = useTrackerStore();
  const feedback = useCountFeedback();
  const notices = useNotices();
  const count = useCounting();
  const context = useAnalysisContext();
  const [reordering, setReordering] = useState(false);
  const [amountFor, setAmountFor] = useState<Tracker | null>(null);

  const trackers = useMemo(() => activeTrackers(store.trackers), [store.trackers]);
  const archivedCount = useMemo(() => archivedTrackers(store.trackers).length, [store.trackers]);
  const migrated = store.trackers.some((tracker) => tracker.origin === 'migrated');

  const onCount = useCallback(
    (tracker: Tracker, snapshot: TrackerSnapshot, direction: 'up' | 'down') => {
      count(tracker, snapshot, direction);
    },
    [count],
  );
  const onOpen = useCallback(
    (tracker: Tracker) => navigation.navigate('TrackerDetail', { trackerId: tracker.id }),
    [navigation],
  );
  const onMove = useCallback((tracker: Tracker, direction: -1 | 1) => store.moveTracker(tracker.id, direction), [store]);
  const onUndo = useCallback(() => {
    feedback.undo();
  }, [feedback]);

  const header = (
    <View>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text variant="wordmark" accessibilityRole="header">
            Foxiem
          </Text>
          <Text variant="caption" tone="inkSecondary" style={styles.date}>
            {formatLongDate(context.now, language, context.now)}
          </Text>
        </View>
        <IconButton
          testID="home-add"
          icon="add"
          variant="outlined"
          accessibilityLabel={t('home.addTracker')}
          onPress={() => navigation.navigate('CreateTracker')}
        />
      </View>
      <View style={styles.banners}>
        {store.saveFailed ? (
          <Banner tone="caution" icon="warning-outline" title={t('home.saveFailedTitle')} body={t('home.saveFailedBody')} />
        ) : null}
        {store.loadSource === 'recovered' ? (
          <Banner tone="caution" icon="refresh-outline" title={t('home.recoveredTitle')} body={t('home.recoveredBody')} />
        ) : null}
        {store.unreadableTrackerIds.length > 0 ? (
          <Banner tone="caution" icon="alert-circle-outline" title={t('home.unreadableTitle')} body={t('home.unreadableBody')} />
        ) : null}
        {migrated && notices.hydrated && !notices.isDismissed(NOTICE_IDS.whatsNewV3) ? (
          <Banner
            icon="sparkles-outline"
            title={t('home.whatsNewTitle')}
            body={t('home.whatsNewBody')}
            onDismiss={() => notices.dismiss(NOTICE_IDS.whatsNewV3)}
          />
        ) : null}
      </View>
    </View>
  );

  const usedTemplates = new Set(trackers.map((tracker) => tracker.templateId));
  const suggestions = TRACKER_TEMPLATES.filter(
    (template) => !usedTemplates.has(template.id) && !trackers.some((tracker) => tracker.intent === template.intent),
  ).slice(0, 3);

  const footer =
    trackers.length > 0 ? (
      <View style={styles.footer}>
        {notices.hydrated && !notices.isDismissed(NOTICE_IDS.homeHint) && !reordering ? (
          <Text variant="caption" tone="inkTertiary" align="center" style={styles.hint}>
            {t('home.hint')}
          </Text>
        ) : null}
        {trackers.length <= 2 && suggestions.length > 0 && !reordering ? (
          <View style={styles.suggest}>
            <Text variant="label" tone="inkSecondary" align="center">
              {t('home.tryNext')}
            </Text>
            <View style={styles.quick}>
              {suggestions.map((template) => (
                <Pressable
                  key={template.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${t(`start.templates.${template.id}` as 'start.templates.coffee')}, ${t(`intents.${template.intent}.title`)}`}
                  onPress={() => navigation.navigate('CreateTracker', { templateId: template.id })}
                  style={({ pressed }) => [
                    styles.quickChip,
                    {
                      borderRadius: theme.radius.md,
                      borderColor: theme.colors.line,
                      backgroundColor: pressed ? theme.colors.sunken : theme.colors.surface,
                    },
                  ]}
                >
                  <TrackerIcon icon={template.icon} color={template.color} size={28} />
                  <View>
                    <Text variant="label">{t(`start.templates.${template.id}` as 'start.templates.coffee')}</Text>
                    <Text variant="micro" tone="inkTertiary">
                      {t(`intents.${template.intent}.short`)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        <View style={styles.footerLinks}>
          {trackers.length > 1 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setReordering((value) => !value)}
              style={({ pressed }) => [styles.link, pressed && { backgroundColor: theme.colors.sunken }]}
            >
              <Text variant="label">{reordering ? t('home.reorderDone') : t('home.reorder')}</Text>
            </Pressable>
          ) : null}
          {archivedCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('Archived')}
              style={({ pressed }) => [styles.link, pressed && { backgroundColor: theme.colors.sunken }]}
            >
              <Text variant="label" tone="inkSecondary">
                {t('home.archivedCount', { count: archivedCount })}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    ) : (
      <EmptyState
        image={FOXIEM_HOME_IMAGE}
        title={t('home.emptyTitle')}
        body={t('home.emptyBody')}
        action={{ label: t('home.emptyCta'), onPress: () => navigation.navigate('CreateTracker') }}
      >
        <View style={styles.quick}>
          {QUICK_TEMPLATES.map((id) => {
            const template = findTemplate(id)!;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                onPress={() => navigation.navigate('CreateTracker', { templateId: id })}
                style={({ pressed }) => [
                  styles.quickChip,
                  {
                    borderRadius: theme.radius.md,
                    borderColor: theme.colors.line,
                    backgroundColor: pressed ? theme.colors.sunken : theme.colors.surface,
                  },
                ]}
              >
                <TrackerIcon icon={template.icon} color={template.color} size={28} />
                <Text variant="label">{t(`start.templates.${id}`)}</Text>
              </Pressable>
            );
          })}
        </View>
      </EmptyState>
    );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.fill, { backgroundColor: theme.colors.canvas }]}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <FlatList
        testID="home-list"
        data={trackers}
        keyExtractor={(tracker) => tracker.id}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth },
        ]}
        initialNumToRender={12}
        windowSize={7}
        renderItem={({ item, index }) => (
          <TrackerRow
            tracker={item}
            events={store.events[item.id] ?? EMPTY}
            context={context}
            locale={language}
            reduceMotion={reduceMotion}
            first={index === 0}
            last={index === trackers.length - 1}
            pendingDelta={feedback.pending?.trackerId === item.id ? feedback.pending.delta : null}
            compact={isCompact}
            reordering={reordering}
            canMoveUp={index > 0}
            canMoveDown={index < trackers.length - 1}
            onCount={onCount}
            onAmount={setAmountFor}
            onOpen={onOpen}
            onUndo={onUndo}
            onMove={onMove}
          />
        )}
      />
      <AmountSheet
        tracker={amountFor}
        onClose={() => setAmountFor(null)}
        onAdd={(amount) => {
          const tracker = amountFor;
          setAmountFor(null);
          if (tracker) {
            count(tracker, trackerSnapshot(tracker, store.events[tracker.id] ?? EMPTY, context), 'up', amount);
          }
        }}
      />
    </SafeAreaView>
  );
}

const EMPTY: never[] = [];

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 32,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  date: {
    marginTop: 2,
  },
  banners: {
    gap: 10,
    marginBottom: 12,
  },
  footer: {
    paddingTop: 16,
  },
  hint: {
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  suggest: {
    marginTop: 20,
    marginBottom: 8,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  link: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 10,
  },
  quick: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  quickChip: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
