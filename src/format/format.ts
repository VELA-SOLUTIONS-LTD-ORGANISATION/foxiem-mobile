import { getCalendars, getLocales } from 'expo-localization';

import { daysBetween } from '@/domain/periods';

const regionalLocales = new Map<string, string>();

/**
 * Screens pass the app language ("en"); formatting also needs the device region so an
 * en-GB phone keeps "29 September" and de-CH keeps its own number grouping.
 */
function regional(language: string): string {
  let resolved = regionalLocales.get(language);
  if (!resolved) {
    resolved = language;
    try {
      const device = getLocales()[0]?.languageTag;
      if (device && device.toLowerCase().startsWith(`${language.toLowerCase()}-`)) {
        resolved = device;
      }
    } catch {
      // Keep the bare language.
    }
    regionalLocales.set(language, resolved);
  }
  return resolved;
}

function deviceUses24HourClock(): boolean | undefined {
  try {
    const value = getCalendars()[0]?.uses24hourClock;
    return typeof value === 'boolean' ? value : undefined;
  } catch {
    return undefined;
  }
}

const numberFormats = new Map<string, Intl.NumberFormat>();

function numberFormat(locale: string, options: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = numberFormats.get(key);
  if (!format) {
    try {
      format = new Intl.NumberFormat(regional(locale), options);
    } catch {
      format = new Intl.NumberFormat('en', options);
    }
    numberFormats.set(key, format);
  }
  return format;
}

export function formatNumber(value: number, locale: string): string {
  return numberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

export function formatDecimal(value: number, locale: string): string {
  const digits = Math.abs(value) >= 10 ? 0 : 1;
  return numberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);
}

/** Whole-number percentage of a ratio (0.17 → "17%"), locale formatted. */
export function formatPercent(ratio: number, locale: string): string {
  return numberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(Math.abs(ratio));
}

function dateFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(regional(locale), options);
  } catch {
    return new Intl.DateTimeFormat('en', options);
  }
}

export function formatTime(date: Date, locale: string): string {
  const uses24 = deviceUses24HourClock();
  return dateFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    ...(uses24 === undefined ? {} : { hour12: !uses24 }),
  }).format(date);
}

export function formatLongDate(date: Date, locale: string, now: Date = new Date()): string {
  return dateFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  }).format(date);
}

export function formatShortDate(date: Date, locale: string, now: Date = new Date()): string {
  return dateFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  }).format(date);
}

export function formatDayWithWeekday(date: Date, locale: string, now: Date = new Date()): string {
  return dateFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  }).format(date);
}

export function formatMonthYear(date: Date, locale: string): string {
  return dateFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}

export function formatMonth(date: Date, locale: string): string {
  return dateFormat(locale, { month: 'long' }).format(date);
}

/** Weekday name for a JS weekday index (0 = Sunday). */
export function weekdayName(weekday: number, locale: string, style: 'long' | 'short' | 'narrow' = 'long'): string {
  // 2023-01-01 was a Sunday.
  return dateFormat(locale, { weekday: style }).format(new Date(2023, 0, 1 + weekday));
}

export function formatRange(start: Date, endExclusive: Date, locale: string, now: Date = new Date()): string {
  const end = new Date(endExclusive.getTime() - 1);
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    const month = dateFormat(locale, { month: 'short' }).format(start);
    return `${start.getDate()}–${end.getDate()} ${month}`;
  }
  return `${formatShortDate(start, locale, now)} – ${formatShortDate(end, locale, now)}`;
}

export type RelativeDay = { kind: 'today' } | { kind: 'yesterday' } | { kind: 'date'; label: string };

export function relativeDay(date: Date, now: Date, locale: string): RelativeDay {
  const diff = daysBetween(date, now);
  if (diff === 0) {
    return { kind: 'today' };
  }
  if (diff === 1) {
    return { kind: 'yesterday' };
  }
  return { kind: 'date', label: formatDayWithWeekday(date, locale, now) };
}
