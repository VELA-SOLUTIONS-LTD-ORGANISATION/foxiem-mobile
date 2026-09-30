/**
 * Text that the operating system shows outside the app (widget gallery, Shortcuts, VoiceOver, the Watch
 * fallback, the Android widget picker) has to be translated too. The native projects cannot be built on
 * this machine, so these tests read the sources and the catalogs and hold them together.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const LANGUAGES = ['en', 'de', 'es', 'fr', 'it', 'tr'];

type Catalog = {
  sourceLanguage: string;
  strings: Record<string, { localizations: Record<string, { stringUnit: { state: string; value: string } }> }>;
};

/** Every literal a SwiftUI / App Intents source hands to the localisation system. */
function localizedLiterals(source: string): string[] {
  const patterns = [
    /String\(localized: "([^"]+)"\)/g,
    /\.configurationDisplayName\("([^"]+)"\)/g,
    /\.description\("([^"]+)"\)/g,
    /IntentDescription\("([^"]+)"\)/g,
    /@Parameter\(title: "([^"]+)"\)/g,
    /static let title: LocalizedStringResource = "([^"]+)"/g,
    /static let typeDisplayRepresentation: TypeDisplayRepresentation = "([^"]+)"/g,
  ];
  const found = new Set<string>();
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      found.add(match[1]);
    }
  }
  return [...found];
}

const swiftFiles = (target: string) =>
  fs
    .readdirSync(path.join(root, 'targets', target))
    .filter((file) => file.endsWith('.swift'))
    .map((file) => read(`targets/${target}/${file}`));

describe.each(['widget', 'watch'])('%s string catalog', (target) => {
  const catalog = JSON.parse(read(`targets/${target}/Localizable.xcstrings`)) as Catalog;
  const literals = swiftFiles(target).flatMap(localizedLiterals);

  it('translates every entry into every supported language', () => {
    expect(catalog.sourceLanguage).toBe('en');
    for (const [key, entry] of Object.entries(catalog.strings)) {
      for (const language of LANGUAGES) {
        const unit = entry.localizations[language]?.stringUnit;
        expect(`${key} [${language}] ${unit?.state}`).toBe(`${key} [${language}] translated`);
        expect(unit?.value.trim().length).toBeGreaterThan(0);
      }
      expect(entry.localizations.en.stringUnit.value).toBe(key);
    }
  });

  it('covers every localisable literal used by the Swift sources', () => {
    expect(literals.length).toBeGreaterThan(0);
    expect(literals.filter((literal) => !(literal in catalog.strings))).toEqual([]);
  });

  it('has no entry the Swift sources no longer use', () => {
    expect(Object.keys(catalog.strings).filter((key) => !literals.includes(key))).toEqual([]);
  });
});

describe('Android widget picker strings', () => {
  const data = JSON.parse(read('plugins/widget-strings.json')) as {
    languages: string[];
    strings: Record<string, Record<string, string>>;
  };
  const config = JSON.parse(read('app.json')) as {
    expo: { plugins: [string, { widgets: { name: string; label: string; description: string }[] }][] };
  };

  it('covers all supported languages for every label and description', () => {
    expect(data.languages).toEqual(LANGUAGES);
    for (const [name, translations] of Object.entries(data.strings)) {
      for (const language of LANGUAGES) {
        expect(`${name} [${language}] ${translations[language]?.trim() ? 'ok' : 'missing'}`).toBe(`${name} [${language}] ok`);
      }
    }
  });

  it('is keyed by exactly the widgets declared in app.json, with matching English text', () => {
    const plugin = config.expo.plugins.find((entry) => Array.isArray(entry) && entry[0] === 'react-native-android-widget');
    const widgets = plugin![1].widgets;
    const expected: Record<string, string> = {};
    for (const widget of widgets) {
      expected[`widget_${widget.name.toLowerCase()}_label`] = widget.label;
      expected[`widget_${widget.name.toLowerCase()}_description`] = widget.description;
    }
    expect(Object.keys(data.strings).sort()).toEqual(Object.keys(expected).sort());
    for (const [name, english] of Object.entries(expected)) {
      expect(data.strings[name].en).toBe(english);
    }
  });

  it('is wired into the Expo config as the last plugin step', () => {
    expect(read('app.config.ts')).toContain('withNativeLocalization(');
    const plugin = read('plugins/withNativeLocalization.js');
    expect(plugin).toContain('withFinalizedMod');
    // iOS extensions only get the languages listed in the project's knownRegions.
    expect(plugin).toContain('knownRegions');
  });
});
