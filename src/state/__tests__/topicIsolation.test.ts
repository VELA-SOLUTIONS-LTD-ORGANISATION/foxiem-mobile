import { applyActionToDomain } from '@/state/counterLogic';
import {
  createCustomTopic,
  createDefaultTopic,
  DEFAULT_TOPIC_ID,
  eventsForTopic,
  getTopicDisplayName,
  hasLifetimeIncrement,
} from '@/state/topics';
import type { CounterDomainSnapshot } from '@/state/types';
import { incrementEvent, localDate, localIso } from '@/test/factories';
import { groupCounterEventsByLocalDate } from '@/utils/activityHistory';
import { getCurrentStreak } from '@/utils/consistency';
import { getTodayActivity } from '@/utils/statistics';

const REF = localDate(2026, 9, 14, 18);

function domain(overrides?: Partial<CounterDomainSnapshot>): CounterDomainSnapshot {
  const general = createDefaultTopic(47, '2026-09-01T00:00:00.000Z');
  const water = { ...createCustomTopic('Water', '2026-09-02T00:00:00.000Z', 'topic.water'), currentCount: 12 };
  const zikir = { ...createCustomTopic('Zikir', '2026-09-03T00:00:00.000Z', 'topic.zikir'), currentCount: 40 };
  return {
    schemaVersion: 2,
    activeTopicId: DEFAULT_TOPIC_ID,
    topics: [general, water, zikir],
    events: [
      incrementEvent(46, 1, localIso(2026, 9, 12, 10), DEFAULT_TOPIC_ID),
      incrementEvent(11, 1, localIso(2026, 9, 12, 11), 'topic.water'),
      incrementEvent(39, 1, localIso(2026, 9, 12, 12), 'topic.zikir'),
    ],
    ...overrides,
  };
}

function countOf(snapshot: CounterDomainSnapshot, id: string): number {
  return snapshot.topics.find((topic) => topic.id === id)?.currentCount ?? -1;
}

describe('topic isolation', () => {
  it('increments only the active topic', () => {
    const next = applyActionToDomain(domain(), 'topic.zikir', { type: 'increment', amount: 1 }, localIso(2026, 9, 14, 10));
    expect(next).not.toBeNull();
    expect(countOf(next!, DEFAULT_TOPIC_ID)).toBe(47);
    expect(countOf(next!, 'topic.water')).toBe(12);
    expect(countOf(next!, 'topic.zikir')).toBe(41);
    expect(eventsForTopic(next!.events, 'topic.zikir').at(-1)).toMatchObject({
      topicId: 'topic.zikir',
      type: 'increment',
      previousValue: 40,
      newValue: 41,
    });
    expect(eventsForTopic(next!.events, DEFAULT_TOPIC_ID)).toHaveLength(1);
    expect(eventsForTopic(next!.events, 'topic.water')).toHaveLength(1);
  });

  it('resets only the active topic', () => {
    const next = applyActionToDomain(domain(), 'topic.zikir', { type: 'reset' }, localIso(2026, 9, 14, 10));
    expect(countOf(next!, DEFAULT_TOPIC_ID)).toBe(47);
    expect(countOf(next!, 'topic.water')).toBe(12);
    expect(countOf(next!, 'topic.zikir')).toBe(0);
    expect(eventsForTopic(next!.events, 'topic.zikir').at(-1)).toMatchObject({
      type: 'reset',
      topicId: 'topic.zikir',
      previousValue: 40,
      newValue: 0,
    });
    expect(eventsForTopic(next!.events, DEFAULT_TOPIC_ID)).toHaveLength(1);
  });

  it('filters statistics and history by topic before aggregation', () => {
    const snapshot = domain({
      events: [
        incrementEvent(0, 5, localIso(2026, 9, 14, 9), 'topic.zikir'),
        incrementEvent(0, 20, localIso(2026, 9, 14, 10), 'topic.water'),
      ],
    });
    const zikirEvents = eventsForTopic(snapshot.events, 'topic.zikir');
    const waterEvents = eventsForTopic(snapshot.events, 'topic.water');
    expect(getTodayActivity(zikirEvents, REF)).toBe(5);
    expect(getTodayActivity(waterEvents, REF)).toBe(20);
    expect(groupCounterEventsByLocalDate(zikirEvents, REF)[0]?.data).toHaveLength(1);
    expect(groupCounterEventsByLocalDate(waterEvents, REF)[0]?.data[0]?.topicId).toBe('topic.water');
  });

  it('calculates streaks independently per topic', () => {
    const snapshot = domain({
      events: [
        incrementEvent(0, 1, localIso(2026, 9, 12, 10), 'topic.water'),
        incrementEvent(1, 1, localIso(2026, 9, 13, 10), 'topic.water'),
        incrementEvent(0, 1, localIso(2026, 9, 14, 10), 'topic.zikir'),
        incrementEvent(1, 1, localIso(2026, 9, 13, 12), 'topic.zikir'),
      ],
    });
    expect(getCurrentStreak(eventsForTopic(snapshot.events, 'topic.water'), REF)).toBe(2);
    expect(getCurrentStreak(eventsForTopic(snapshot.events, 'topic.zikir'), REF)).toBe(2);
    expect(getCurrentStreak(snapshot.events, REF)).toBe(3);
  });

  it('keeps first_count lifetime-scoped across topics', () => {
    const afterGeneral = applyActionToDomain(
      domain({
        topics: [createDefaultTopic(0), { ...createCustomTopic('Water', undefined, 'topic.water'), currentCount: 0 }],
        events: [],
      }),
      DEFAULT_TOPIC_ID,
      { type: 'increment', amount: 1 },
    )!;
    expect(hasLifetimeIncrement(afterGeneral.events)).toBe(true);
    const afterWater = applyActionToDomain(afterGeneral, 'topic.water', { type: 'increment', amount: 1 })!;
    expect(hasLifetimeIncrement(afterWater.events)).toBe(true);
    expect(eventsForTopic(afterWater.events, 'topic.water')).toHaveLength(1);
  });

  it('rename changes only the display name', () => {
    const zikir = createCustomTopic('Zikir', '2026-09-03T00:00:00.000Z', 'topic.zikir');
    const renamed = { ...zikir, name: 'Dhikr' };
    expect(renamed.id).toBe('topic.zikir');
    expect(renamed.currentCount).toBe(0);
    expect(getTopicDisplayName(renamed, () => 'General')).toBe('Dhikr');
  });

  it('rapid cross-topic actions keep independent totals', () => {
    let snapshot = domain({
      topics: [
        createDefaultTopic(0, '2026-09-01T00:00:00.000Z'),
        { ...createCustomTopic('Water', '2026-09-02T00:00:00.000Z', 'topic.water'), currentCount: 0 },
      ],
      events: [],
      activeTopicId: DEFAULT_TOPIC_ID,
    });
    snapshot = applyActionToDomain(snapshot, DEFAULT_TOPIC_ID, { type: 'increment', amount: 1 })!;
    snapshot = applyActionToDomain(snapshot, 'topic.water', { type: 'increment', amount: 1 })!;
    snapshot = applyActionToDomain(snapshot, 'topic.water', { type: 'increment', amount: 5 })!;
    snapshot = applyActionToDomain(snapshot, DEFAULT_TOPIC_ID, { type: 'increment', amount: 1 })!;

    expect(countOf(snapshot, DEFAULT_TOPIC_ID)).toBe(2);
    expect(countOf(snapshot, 'topic.water')).toBe(6);
    expect(snapshot.events.every((event) => event.topicId === DEFAULT_TOPIC_ID || event.topicId === 'topic.water')).toBe(
      true,
    );
    expect(eventsForTopic(snapshot.events, DEFAULT_TOPIC_ID)).toHaveLength(2);
    expect(eventsForTopic(snapshot.events, 'topic.water')).toHaveLength(2);
  });
});
