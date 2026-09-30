// Plain CommonJS on purpose: Expo loads app.config.ts through a loader that cannot follow relative
// TypeScript imports, but it can require a .js file.
const fs = require('fs');
const path = require('path');
const { withFinalizedMod } = require('expo/config-plugins');

/** @type {{ languages: string[]; strings: Record<string, Record<string, string>> }} */
const data = require('./widget-strings.json');

function escapeXml(value) {
  // Android resource strings: XML escapes plus an escaped apostrophe.
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, "\\'");
}

function stringsFile(values) {
  const lines = Object.entries(values).map(([name, value]) => `  <string name="${name}">${escapeXml(value)}</string>`);
  return `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${lines.join('\n')}\n</resources>\n`;
}

/**
 * Localises the Android widget picker (name and description) for every supported language.
 *
 * react-native-android-widget writes the English label into the manifest and the description into a
 * `translatable="false"` string. This plugin runs last and points both at real string resources, writes
 * `values-<lang>/widget_strings.xml` for each language, and keeps English in `values/widget_strings.xml`.
 * The strings themselves live in scripts/build-string-catalogs.mjs, next to the iOS catalogs.
 *
 * @type {import('expo/config-plugins').ConfigPlugin}
 */
const withWidgetStrings = (config) =>
  withFinalizedMod(config, [
    'android',
    async (mod) => {
      const main = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main');
      const res = path.join(main, 'res');

      // 1. English defaults in their own file.
      const english = {};
      for (const [name, translations] of Object.entries(data.strings)) {
        english[name] = translations.en;
      }
      fs.mkdirSync(path.join(res, 'values'), { recursive: true });
      fs.writeFileSync(path.join(res, 'values', 'widget_strings.xml'), stringsFile(english));

      // 2. Translations.
      for (const language of data.languages.filter((code) => code !== 'en')) {
        const values = {};
        for (const [name, translations] of Object.entries(data.strings)) {
          values[name] = translations[language] || translations.en;
        }
        fs.mkdirSync(path.join(res, `values-${language}`), { recursive: true });
        fs.writeFileSync(path.join(res, `values-${language}`, 'widget_strings.xml'), stringsFile(values));
      }

      // 3. Drop the duplicate (non-translatable) description strings the widget plugin wrote.
      const stringsPath = path.join(res, 'values', 'strings.xml');
      if (fs.existsSync(stringsPath)) {
        let xml = fs.readFileSync(stringsPath, 'utf8');
        for (const name of Object.keys(data.strings)) {
          xml = xml.replace(new RegExp(`\\s*<string name="${name}"[^>]*>[^<]*</string>`, 'g'), '');
        }
        fs.writeFileSync(stringsPath, xml);
      }

      // 4. Point each widget receiver's label at its string resource.
      const manifestPath = path.join(main, 'AndroidManifest.xml');
      let manifest = fs.readFileSync(manifestPath, 'utf8');
      for (const receiver of ['FoxiemCounter', 'FoxiemTrackers']) {
        const resource = `@string/widget_${receiver.toLowerCase()}_label`;
        manifest = manifest.replace(
          new RegExp(`(<receiver android:name="\\.widget\\.${receiver}"[^>]*?android:label=")[^"]*(")`),
          `$1${resource}$2`,
        );
      }
      fs.writeFileSync(manifestPath, manifest);
      return mod;
    },
  ]);

/**
 * iOS: the widget extension and the Watch app ship their own string catalogs (targets/widget and targets/watch, Localizable.xcstrings).
 * Xcode only builds the languages listed in the project's `knownRegions`, and Expo generates `en, Base`, so
 * every other language would be silently dropped from the extension bundles. List them all.
 *
 * @type {import('expo/config-plugins').ConfigPlugin}
 */
const withKnownRegions = (config) =>
  withFinalizedMod(config, [
    'ios',
    async (mod) => {
      const root = mod.modRequest.platformProjectRoot;
      const project = fs.readdirSync(root).find((name) => name.endsWith('.xcodeproj'));
      if (!project) {
        return mod;
      }
      const file = path.join(root, project, 'project.pbxproj');
      const source = fs.readFileSync(file, 'utf8');
      const regions = ['Base', ...data.languages];
      const next = source.replace(/knownRegions = \(([\s\S]*?)\);/, () => {
        const list = regions.map((region) => `\t\t\t\t${region},`).join('\n');
        return `knownRegions = (\n${list}\n\t\t\t);`;
      });
      if (next !== source) {
        fs.writeFileSync(file, next);
      }
      return mod;
    },
  ]);

/** Everything the operating system shows outside the app, translated. */
const withNativeLocalization = (config) => withKnownRegions(withWidgetStrings(config));

module.exports = { withNativeLocalization, withWidgetStrings, withKnownRegions };
