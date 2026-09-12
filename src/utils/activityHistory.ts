import type { CounterEvent } from '@/state';
import { getLocalDateKey, isLocalYesterday, isSameLocalDay, parseTimestamp } from '@/utils/date';

export type HistorySectionKind = 'today' | 'yesterday' | 'date';

export type HistorySection = {
  key: string;
  kind: HistorySectionKind;
  date: Date;
  data: CounterEvent[];
};

export function groupCounterEventsByLocalDate(
  events: readonly CounterEvent[],
  referenceDate: Date,
): HistorySection[] {
  const grouped = new Map<string, CounterEvent[]>();

  [...events]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .forEach((event) => {
      const date = parseTimestamp(event.createdAt);
      if (!date) {
        return;
      }

      const key = getLocalDateKey(date);
      const existing = grouped.get(key) ?? [];
      existing.push(event);
      grouped.set(key, existing);
    });

  return Array.from(grouped.entries()).map(([key, data]) => {
    const date = parseTimestamp(data[0]?.createdAt) ?? referenceDate;
    const kind: HistorySectionKind = isSameLocalDay(date, referenceDate)
      ? 'today'
      : isLocalYesterday(date, referenceDate)
        ? 'yesterday'
        : 'date';

    return {
      key,
      kind,
      date,
      data,
    };
  });
}

export function formatLocalTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatHistoryDate(date: Date, referenceDate: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() === referenceDate.getFullYear() ? undefined : 'numeric',
  }).format(date);
}
