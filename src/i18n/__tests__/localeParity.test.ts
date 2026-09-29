import de from '@/i18n/locales/de.json';
import en from '@/i18n/locales/en.json';
import es from '@/i18n/locales/es.json';
import fr from '@/i18n/locales/fr.json';
import itLocale from '@/i18n/locales/it.json';
import tr from '@/i18n/locales/tr.json';

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function flatten(value: unknown, prefix = ''): [string, string][] {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
      flatten(nested, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [[prefix, String(value)]];
}

function variables(text: string): string {
  return [...new Set([...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1]))].sort().join(',');
}

const canonical = new Map(flatten(en));
const canonicalBases = new Set([...canonical.keys()].map((key) => key.replace(PLURAL_SUFFIX, '')));
const pluralBases = new Set(
  [...canonical.keys()].filter((key) => key.endsWith('_other')).map((key) => key.replace(PLURAL_SUFFIX, '')),
);

function canonicalValue(key: string): string | undefined {
  return canonical.get(key) ?? canonical.get(key.replace(PLURAL_SUFFIX, '_other'));
}

describe('i18n locale parity', () => {
  const locales = { tr, de, fr, es, it: itLocale } as const;

  it.each(Object.entries(locales))('%s has every English key and nothing extra', (_name, locale) => {
    const bases = new Set(flatten(locale).map(([key]) => key.replace(PLURAL_SUFFIX, '')));
    const missing = [...canonicalBases].filter((key) => !bases.has(key));
    const extra = [...bases].filter((key) => !canonicalBases.has(key));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  it.each(Object.entries(locales))('%s has exactly the plural forms its language needs', (name, locale) => {
    const categories = new Intl.PluralRules(name).resolvedOptions().pluralCategories.slice().sort();
    const keys = new Set(flatten(locale).map(([key]) => key));
    const problems: string[] = [];
    for (const base of pluralBases) {
      const present = categories.filter((category) => keys.has(`${base}_${category}`));
      if (present.length !== categories.length) {
        problems.push(`${base}: has ${present.join('/')} needs ${categories.join('/')}`);
      }
    }
    for (const key of keys) {
      const match = PLURAL_SUFFIX.exec(key);
      if (match && !categories.includes(match[1] as Intl.LDMLPluralRule)) {
        problems.push(`${key}: ${name} has no "${match[1]}" plural`);
      }
      if (match && !pluralBases.has(key.replace(PLURAL_SUFFIX, ''))) {
        problems.push(`${key}: not plural in English`);
      }
    }
    expect(problems).toEqual([]);
  });

  it.each(Object.entries(locales))('%s keeps the same interpolation variables as English', (_name, locale) => {
    const mismatches = flatten(locale)
      .map(([key, value]) => ({ key, expected: variables(canonicalValue(key) ?? ''), actual: variables(value) }))
      .filter(({ expected, actual }) => expected !== actual);
    expect(mismatches).toEqual([]);
  });

  it('English has plural pairs for every counted string', () => {
    for (const base of pluralBases) {
      expect(canonical.has(`${base}_one`)).toBe(true);
    }
    expect(canonical.size).toBeGreaterThan(100);
  });
});
