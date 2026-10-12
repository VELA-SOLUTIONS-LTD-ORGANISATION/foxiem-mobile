import fs from 'node:fs';
import path from 'node:path';

const config = JSON.parse(fs.readFileSync('store.config.json', 'utf8'));

const SCENE = ['01-home.png', '02-counter.png', '03-insights.png', '04-reminders.png', '05-widgets.png', '06-pro.png'];

const locales = [
  { dir: 'en-GB', apple: 'en-GB', shot: 'en-GB' },
  { dir: 'tr', apple: 'tr', shot: 'tr-TR' },
  { dir: 'de-DE', apple: 'de-DE', shot: 'de-DE' },
  { dir: 'fr-FR', apple: 'fr-FR', shot: 'fr-FR' },
  { dir: 'es-ES', apple: 'es-ES', shot: 'es-ES' },
  { dir: 'it-IT', apple: 'it', shot: 'it-IT' },
];

function txt(localeDir, name) {
  return fs.readFileSync(path.join('store/app-store', localeDir, `${name}.txt`), 'utf8').replace(/\r\n/g, '\n').trim();
}

function shots(shotLocale) {
  return {
    APP_IPHONE_69: SCENE.map((file) => `store-assets/raw/${shotLocale}/ios/iphone-6.9/${file}`),
    APP_IPAD_PRO_3GEN_129: SCENE.map((file) => `store-assets/raw/${shotLocale}/ios/ipad-13/${file}`),
  };
}

const ALLOWED_ADVISORY = new Set([
  'alcoholTobaccoOrDrugUseOrReferences',
  'contests',
  'gamblingSimulated',
  'medicalOrTreatmentInformation',
  'profanityOrCrudeHumor',
  'sexualContentGraphicAndNudity',
  'sexualContentOrNudity',
  'horrorOrFearThemes',
  'matureOrSuggestiveThemes',
  'violenceCartoonOrFantasy',
  'violenceRealisticProlongedGraphicOrSadistic',
  'violenceRealistic',
  'unrestrictedWebAccess',
  'gambling',
  'kidsAgeBand',
  'seventeenPlus',
  'ageRatingOverride',
  'koreaAgeRatingOverride',
  'lootBox',
]);

config.apple.version = '2.0.0';
config.apple.release = { automaticRelease: false };
config.apple.advisory = Object.fromEntries(
  Object.entries(config.apple.advisory ?? {}).filter(([key]) => ALLOWED_ADVISORY.has(key)),
);
config.apple.review.demoRequired = false;
config.apple.review.notes = fs
  .readFileSync('store/app-store/reviewer-notes.md', 'utf8')
  .replace(/^#.*\n+/, '')
  .trim()
  .slice(0, 4000);

const problems = [];
for (const loc of locales) {
  const info = config.apple.info[loc.apple];
  if (!info) {
    problems.push(`missing locale ${loc.apple}`);
    continue;
  }
  info.title = txt(loc.dir, 'title');
  info.subtitle = txt(loc.dir, 'subtitle');
  info.keywords = txt(loc.dir, 'keywords')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  info.promoText = txt(loc.dir, 'promotional-text');
  info.description = txt(loc.dir, 'description');
  info.releaseNotes = txt(loc.dir, 'whats-new');
  info.marketingUrl = 'https://foxiem.com';
  info.supportUrl = 'https://foxiem.com';
  info.privacyPolicyUrl = 'https://foxiem.com/privacy';
  delete info.screenshots;

  const keywordStr = info.keywords.join(',');
  if (info.title.length < 2 || info.title.length > 30) problems.push(`${loc.apple} title ${info.title.length}`);
  if (info.subtitle.length > 30) problems.push(`${loc.apple} subtitle ${info.subtitle.length}`);
  if (keywordStr.length > 100) problems.push(`${loc.apple} keywords ${keywordStr.length}`);
  if (info.promoText.length > 170) problems.push(`${loc.apple} promo ${info.promoText.length}`);
  if (info.description.length < 10 || info.description.length > 4000) {
    problems.push(`${loc.apple} description ${info.description.length}`);
  }
  for (const file of [...shots(loc.shot).APP_IPHONE_69, ...shots(loc.shot).APP_IPAD_PRO_3GEN_129]) {
    if (!fs.existsSync(file)) problems.push(`missing ${file}`);
  }
  console.log(
    loc.apple,
    'title',
    info.title.length,
    'subtitle',
    info.subtitle.length,
    'keywords',
    keywordStr.length,
    'promo',
    info.promoText.length,
    'desc',
    info.description.length,
  );
}

if (config.apple.info['ar-SA']) {
  config.apple.info['ar-SA'].supportUrl = 'https://foxiem.com';
  config.apple.info['ar-SA'].privacyPolicyUrl = 'https://foxiem.com/privacy';
  config.apple.info['ar-SA'].marketingUrl = 'https://foxiem.com';
  delete config.apple.info['ar-SA'].screenshots;
}

config.apple.categories = ['UTILITIES', 'PRODUCTIVITY'];

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

fs.writeFileSync('store.config.json', JSON.stringify(config, null, 2) + '\n');
console.log('updated store.config.json for 2.0.0');
