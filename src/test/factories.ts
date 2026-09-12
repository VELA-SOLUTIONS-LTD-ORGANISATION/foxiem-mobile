import type { CounterEvent, CounterEventType } from '@/state/types';

/** Build a local Date. Month is 1–12 (calendar). */
export function localDate(
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0,
  second = 0,
): Date {
  return new Date(year, month - 1, day, hour, minute, second, 0);
}

export function localIso(
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0,
  second = 0,
): string {
  return localDate(year, month, day, hour, minute, second).toISOString();
}

let eventSeq = 0;

export function resetEventSeq(): void {
  eventSeq = 0;
}

export function makeEvent( partial: {
  type: CounterEventType;
  amount: number;
  previousValue: number;
  newValue: number;
  createdAt: string;
  id?: string;
}): CounterEvent {
  eventSeq += 1;
  return {
    id: partial.id ?? `evt-${eventSeq}`,
    type: partial.type,
    amount: partial.amount,
    previousValue: partial.previousValue,
    newValue: partial.newValue,
    createdAt: partial.createdAt,
  };
}

export function incrementEvent(
  previousValue: number,
  amount: number,
  createdAt: string,
): CounterEvent {
  return makeEvent({
    type: 'increment',
    amount,
    previousValue,
    newValue: previousValue + amount,
    createdAt,
  });
}

export function decrementEvent(
  previousValue: number,
  amount: number,
  createdAt: string,
): CounterEvent {
  const newValue = Math.max(0, previousValue - amount);
  return makeEvent({
    type: 'decrement',
    amount: newValue - previousValue,
    previousValue,
    newValue,
    createdAt,
  });
}

export function resetEvent(previousValue: number, createdAt: string): CounterEvent {
  return makeEvent({
    type: 'reset',
    amount: 0,
    previousValue,
    newValue: 0,
    createdAt,
  });
}
