export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function startOfLocalWeekMonday(date: Date): Date {
  const start = startOfLocalDay(date);
  const weekday = start.getDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  return addLocalDays(start, -daysFromMonday);
}

export function startOfLocalMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function startOfLocalYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

export function daysInLocalMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function isInLocalRange(date: Date, start: Date, endExclusive: Date): boolean {
  const time = date.getTime();
  return time >= start.getTime() && time < endExclusive.getTime();
}

export function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function getLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function localDateFromKey(key: string): Date | null {
  const parts = key.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  const [year, month, day] = parts;
  return new Date(year, month, day);
}

export function isLocalYesterday(date: Date, referenceDate: Date): boolean {
  const yesterday = addLocalDays(startOfLocalDay(referenceDate), -1);
  return isSameLocalDay(date, yesterday);
}

export function parseTimestamp(value: string): Date | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}
