import de from '@/i18n/locales/de.json';
import en from '@/i18n/locales/en.json';
import es from '@/i18n/locales/es.json';
import fr from '@/i18n/locales/fr.json';
import itLocale from '@/i18n/locales/it.json';
import tr from '@/i18n/locales/tr.json';

function flatten(value: unknown, prefix = ''): string[] {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return flatten(nested, path);
    });
  }
  return [prefix];
}

describe('i18n locale parity', () => {
  const locales = { en, tr, de, fr, es, it: itLocale } as const;
  const canonical = new Set(flatten(en));

  it('all six locales share exact key paths', () => {
    for (const [name, locale] of Object.entries(locales)) {
      if (name === 'en') {
        continue;
      }
      const keys = new Set(flatten(locale));
      const missing = [...canonical].filter((key) => !keys.has(key));
      const extra = [...keys].filter((key) => !canonical.has(key));
      expect({ locale: name, missing, extra }).toEqual({ locale: name, missing: [], extra: [] });
    }
  });

  it('English canonical key count is stable and non-empty', () => {
    expect(canonical.size).toBeGreaterThan(100);
  });
});
