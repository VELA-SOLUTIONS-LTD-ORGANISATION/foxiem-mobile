import { formatLocaleNumber } from '@/utils/number';

describe('formatLocaleNumber', () => {
  const locales = ['en', 'tr', 'de', 'fr', 'es', 'it'] as const;

  it.each(locales)('formats integers for %s without throwing', (locale) => {
    const value = formatLocaleNumber(1234, locale);
    expect(typeof value).toBe('string');
    expect(value.length).toBeGreaterThan(0);
    expect(value).not.toMatch(/NaN|undefined/);
  });
});
