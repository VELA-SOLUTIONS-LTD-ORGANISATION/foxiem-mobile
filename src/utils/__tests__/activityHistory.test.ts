import { groupCounterEventsByLocalDate } from '@/utils/activityHistory';
import {
  incrementEvent,
  localDate,
  localIso,
  resetEvent,
  resetEventSeq,
} from '@/test/factories';

beforeEach(() => {
  resetEventSeq();
});

describe('activity history grouping', () => {
  const ref = localDate(2026, 9, 12);

  it('groups Today / Yesterday / older and displays newest first without mutating source', () => {
    const source = [
      incrementEvent(0, 1, localIso(2026, 9, 10, 9)),
      incrementEvent(1, 1, localIso(2026, 9, 11, 9)),
      incrementEvent(2, 1, localIso(2026, 9, 12, 8)),
      incrementEvent(3, 1, localIso(2026, 9, 12, 18)),
    ];
    const frozen = source.map((event) => ({ ...event }));
    const sections = groupCounterEventsByLocalDate(source, ref);

    expect(source).toEqual(frozen);
    expect(sections.map((section) => section.kind)).toEqual(['today', 'yesterday', 'date']);
    expect(sections[0]?.data.map((event) => event.newValue)).toEqual([4, 3]);
  });

  it('includes reset events in history sections', () => {
    const events = [
      incrementEvent(0, 5, localIso(2026, 9, 12, 9)),
      resetEvent(5, localIso(2026, 9, 12, 10)),
    ];
    const sections = groupCounterEventsByLocalDate(events, ref);
    expect(sections[0]?.data.some((event) => event.type === 'reset' && event.newValue === 0)).toBe(
      true,
    );
  });
});
