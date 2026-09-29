import { makeTracker } from '@/domain/__tests__/helpers';
import { formatLongDate, formatPercent, formatTime, heroCaption, describeGoal, tidy } from '@/format';
import { i18n } from '@/i18n';

// jest.setup mocks the device as en-GB with a 24-hour clock.
const monday = new Date(2026, 2, 2, 14, 4);

describe('regional formatting', () => {
  it('uses the device region when it matches the app language', () => {
    expect(formatTime(monday, 'en')).toBe('14:04');
    expect(formatLongDate(monday, 'en', monday)).toBe('Monday 2 March');
  });

  it('falls back to the language when the device region belongs to another language', () => {
    expect(formatLongDate(monday, 'de', monday)).toBe('Montag, 2. März');
    expect(formatPercent(0.17, 'tr')).toBe('%17');
  });
});

describe('goal and hero copy', () => {
  const t = i18n.getFixedT('en');
  const tr = i18n.getFixedT('tr');

  it('reads naturally with and without a unit', () => {
    const water = makeTracker({ name: 'Water', intent: 'reach', period: 'day', target: 8, unit: 'glasses' });
    const coffee = makeTracker({ name: 'Coffee', intent: 'limit', period: 'day', target: 3 });
    expect(describeGoal(water, t, 'en')).toBe('Reach 8 glasses a day');
    expect(describeGoal(coffee, t, 'en')).toBe('Stay under 3 a day');
    expect(heroCaption(water, t, 'en')).toBe('of 8 glasses today');
    expect(heroCaption(coffee, t, 'en')).toBe('of max 3 today');
    expect(heroCaption(coffee, tr, 'tr')).toBe('/ en fazla 3 · bugün');
  });

  it('tidies templates whose optional unit is empty', () => {
    expect(tidy('of 8  today')).toBe('of 8 today');
    expect(tidy(' · bugün')).toBe('bugün');
    expect(tidy('Reach 8  in total.')).toBe('Reach 8 in total.');
  });
});
