import { formatTimeString, parseTimeString } from './reminders';

/**
 * A daily window (local time) in which Foxiem does not send reminders. The window may cross
 * midnight (22:00 to 07:00). A reminder that would land inside it is skipped, not moved, and the
 * next one outside the window is delivered as usual.
 */
export type QuietHours = {
  enabled: boolean;
  /** "HH:MM", inclusive. */
  start: string;
  /** "HH:MM", exclusive. */
  end: string;
};

export const DEFAULT_QUIET_HOURS: QuietHours = { enabled: false, start: '22:00', end: '07:00' };

function minutesOf(time: string): number | null {
  const parsed = parseTimeString(time);
  return parsed ? parsed.hour * 60 + parsed.minute : null;
}

/** Whether `minuteOfDay` falls inside the window. Equal start and end mean an empty window. */
export function minuteIsQuiet(minuteOfDay: number, quiet: QuietHours): boolean {
  if (!quiet.enabled) {
    return false;
  }
  const start = minutesOf(quiet.start);
  const end = minutesOf(quiet.end);
  if (start === null || end === null || start === end) {
    return false;
  }
  return start < end ? minuteOfDay >= start && minuteOfDay < end : minuteOfDay >= start || minuteOfDay < end;
}

export function isQuietTime(date: Date, quiet: QuietHours): boolean {
  return minuteIsQuiet(date.getHours() * 60 + date.getMinutes(), quiet);
}

/** A repeating reminder at a fixed clock time is silenced for every day when that time is quiet. */
export function timeIsQuiet(time: string, quiet: QuietHours): boolean {
  const minutes = minutesOf(time);
  return minutes !== null && minuteIsQuiet(minutes, quiet);
}

/** The first moment at or after `from` when the window ends, or null when it is not currently quiet. */
export function quietEndsAt(from: Date, quiet: QuietHours): Date | null {
  if (!isQuietTime(from, quiet)) {
    return null;
  }
  const end = parseTimeString(quiet.end);
  if (!end) {
    return null;
  }
  const candidate = new Date(from.getFullYear(), from.getMonth(), from.getDate(), end.hour, end.minute);
  return candidate.getTime() > from.getTime()
    ? candidate
    : new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1, end.hour, end.minute);
}

export function parseQuietHours(value: unknown): QuietHours {
  if (typeof value !== 'object' || value === null) {
    return { ...DEFAULT_QUIET_HOURS };
  }
  const record = value as Record<string, unknown>;
  const valid = (time: unknown, fallback: string) => (typeof time === 'string' && parseTimeString(time) ? time : fallback);
  return {
    enabled: record.enabled === true,
    start: valid(record.start, DEFAULT_QUIET_HOURS.start),
    end: valid(record.end, DEFAULT_QUIET_HOURS.end),
  };
}

export function withQuietTime(quiet: QuietHours, edge: 'start' | 'end', hour: number, minute: number): QuietHours {
  return { ...quiet, [edge]: formatTimeString(hour, minute) };
}
