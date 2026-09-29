import { rebuildChain, runningValue, sortEvents } from '@/domain/events';
import { DEFAULT_TRACKER_ICON } from '@/domain/trackers';
import {
  TRACKER_COLORS,
  type CountEvent,
  type EventsByTracker,
  type Tracker,
} from '@/domain/types';

import { LEGACY_DEFAULT_TOPIC_ID, type LegacyDomain, type LegacyTopic } from './legacy';

export type MigrationResult = {
  trackers: Tracker[];
  events: EventsByTracker;
};

function earliest(isoDates: (string | undefined | null)[]): string {
  const times = isoDates
    .filter((value): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value)))
    .map((value) => Date.parse(value))
    .filter((time) => time > 0);
  return new Date(times.length > 0 ? Math.min(...times) : Date.now()).toISOString();
}

function orderedTopics(domain: LegacyDomain): LegacyTopic[] {
  const defaults = domain.topics.filter((topic) => topic.kind === 'default');
  const custom = domain.topics
    .filter((topic) => topic.kind === 'custom')
    .sort((left, right) => {
      const delta = Date.parse(left.createdAt) - Date.parse(right.createdAt);
      return delta !== 0 ? delta : left.id.localeCompare(right.id);
    });
  return [...defaults, ...custom];
}

/**
 * Pure v1/v2 → v3 transform. Deterministic for the same input, so an interrupted
 * migration can simply run again. Every legacy counter becomes a "Just count" tracker
 * over all time (exactly how 1.0.x behaved), keeping ids, events and the visible count.
 */
export function migrateLegacyDomain(
  legacy: LegacyDomain,
  options: { defaultTrackerName: string },
): MigrationResult {
  const trackers: Tracker[] = [];
  const events: EventsByTracker = {};

  const topics = orderedTopics(legacy);
  topics.forEach((topic) => {
    const topicEvents = sortEvents(
      legacy.events
        .filter((event) => event.topicId === topic.id)
        .map<CountEvent>((event) => ({
          id: event.id,
          trackerId: topic.id,
          type: event.type,
          amount: event.type === 'reset' ? 0 : event.amount,
          previousValue: event.previousValue,
          newValue: event.newValue,
          createdAt: event.createdAt,
        })),
    );

    // An untouched default counter carries no user data; do not add an empty tracker.
    if (topic.kind === 'default' && topicEvents.length === 0 && topic.currentCount === 0) {
      return;
    }

    const startingValue = topicEvents.length > 0 ? Math.max(0, topicEvents[0]!.previousValue) : topic.currentCount;
    const createdAt = earliest([topic.createdAt, topicEvents[0]?.createdAt]);
    const index = trackers.length;
    const tracker: Tracker = {
      id: topic.id,
      name: topic.kind === 'default' || !topic.name ? options.defaultTrackerName : topic.name,
      icon: DEFAULT_TRACKER_ICON,
      color: TRACKER_COLORS[index % TRACKER_COLORS.length]!,
      intent: 'count',
      period: 'all',
      target: null,
      baseline: null,
      unit: null,
      step: 1,
      startingValue,
      notes: '',
      sortIndex: index,
      archivedAt: null,
      origin: 'migrated',
      templateId: null,
      createdAt,
      updatedAt: topic.updatedAt ?? createdAt,
    };

    let chain = rebuildChain(startingValue, topicEvents);
    const derived = runningValue(tracker, chain);
    if (derived !== topic.currentCount) {
      // 1.0.0 wrote count and history separately; keep the number the user last saw.
      const last = chain[chain.length - 1];
      const adjustAt = last ? new Date(Date.parse(last.createdAt) + 1).toISOString() : createdAt;
      chain = rebuildChain(startingValue, [
        ...chain,
        {
          id: `${topic.id}.migration-adjust`,
          trackerId: topic.id,
          type: 'adjust',
          amount: topic.currentCount - derived,
          previousValue: derived,
          newValue: topic.currentCount,
          createdAt: adjustAt,
          source: 'migration',
        },
      ]);
    }

    trackers.push(tracker);
    events[tracker.id] = chain;
  });

  // Keep the counter that was open in 1.0.x first on Home.
  const activeIndex = trackers.findIndex((tracker) => tracker.id === legacy.activeTopicId);
  if (activeIndex > 0 && legacy.activeTopicId !== LEGACY_DEFAULT_TOPIC_ID) {
    const [active] = trackers.splice(activeIndex, 1);
    trackers.unshift(active!);
    trackers.forEach((tracker, position) => {
      tracker.sortIndex = position;
    });
  }

  return { trackers, events };
}
