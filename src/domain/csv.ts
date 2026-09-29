import { sumActivity } from './events';
import { addDays, dayKey, parseInstant, startOfWeek, type DateRange } from './periods';
import { orderTrackers } from './trackers';
import type { EventsByTracker, Tracker, WeekStart } from './types';

function escapeCell(value: string | number | null | undefined, freeText = false): string {
  if (value === null || value === undefined) {
    return '';
  }
  let text = String(value);
  if (freeText && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function row(cells: (string | number | null | undefined)[], freeTextColumns: readonly number[] = []): string {
  return cells.map((cell, index) => escapeCell(cell, freeTextColumns.includes(index))).join(',');
}

function localTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Every entry of every tracker (archived included). Free: the user's data is always portable. */
export function buildEventsCsv(trackers: readonly Tracker[], eventsByTracker: EventsByTracker): string {
  const lines = [
    row([
      'tracker',
      'tracker_id',
      'intent',
      'period',
      'target',
      'unit',
      'entry_id',
      'type',
      'amount',
      'value_after',
      'local_date',
      'local_time',
      'timestamp_utc',
      'note',
    ]),
  ];
  for (const tracker of orderTrackers(trackers)) {
    for (const event of eventsByTracker[tracker.id] ?? []) {
      const at = parseInstant(event.createdAt);
      lines.push(
        row(
          [
            tracker.name,
            tracker.id,
            tracker.intent,
            tracker.period,
            tracker.target,
            tracker.unit,
            event.id,
            event.type,
            event.amount,
            event.newValue,
            at ? dayKey(at) : '',
            at ? localTime(at) : '',
            event.createdAt,
            event.note ?? '',
          ],
          [0, 5, 13],
        ),
      );
    }
  }
  return `${lines.join('\n')}\n`;
}

/** Pro report: weekly totals per tracker inside a date range, with target status. */
export function buildWeeklySummaryCsv(
  trackers: readonly Tracker[],
  eventsByTracker: EventsByTracker,
  range: DateRange,
  weekStart: WeekStart,
): string {
  const lines = [row(['tracker', 'intent', 'week_start', 'total', 'target', 'status', 'unit'])];
  for (const tracker of orderTrackers(trackers)) {
    const events = eventsByTracker[tracker.id] ?? [];
    for (
      let cursor = startOfWeek(range.start, weekStart);
      cursor.getTime() < range.end.getTime();
      cursor = addDays(cursor, 7)
    ) {
      const from = new Date(Math.max(cursor.getTime(), range.start.getTime()));
      const to = new Date(Math.min(addDays(cursor, 7).getTime(), range.end.getTime()));
      const total = Math.max(0, sumActivity(events, from, to));
      let status = '';
      let target: number | null = null;
      if (tracker.period === 'week' && tracker.target) {
        target = tracker.target;
        if (tracker.intent === 'reach') {
          status = total >= tracker.target ? 'reached' : 'not_reached';
        } else if (tracker.intent === 'limit') {
          status = total <= tracker.target ? 'within_limit' : 'over_limit';
        }
      } else if (tracker.period === 'day' && tracker.target) {
        target = tracker.target * 7;
      }
      lines.push(row([tracker.name, tracker.intent, dayKey(cursor), total, target, status, tracker.unit], [0, 6]));
    }
  }
  return `${lines.join('\n')}\n`;
}

export function exportFileName(prefix: string, now: Date = new Date()): string {
  return `${prefix}-${dayKey(now)}.csv`;
}
