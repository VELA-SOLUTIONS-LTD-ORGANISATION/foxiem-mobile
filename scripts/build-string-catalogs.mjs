// Regenerates the native string catalogs (Localizable.xcstrings) and the Android widget strings from one
// table, so every language stays in step. Run: node scripts/build-string-catalogs.mjs
//
// Only text the operating system itself shows lives here: widget gallery names and descriptions, the
// intent parameter titles, VoiceOver verbs and the Watch fallback. Everything inside a widget or on the
// Watch that comes from the app (tracker names, "Goal reached", "Open Foxiem", ...) is translated by the
// app and travels in the snapshot, in the person's chosen app language.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGUAGES = ['en', 'de', 'es', 'fr', 'it', 'tr'];

const ADD = { de: 'Hinzufügen', es: 'Añadir', fr: 'Ajouter', it: 'Aggiungi', tr: 'Ekle' };
const SUBTRACT = { de: 'Abziehen', es: 'Restar', fr: 'Retirer', it: 'Sottrai', tr: 'Çıkar' };

const IOS_WIDGET = {
  Counter: { de: 'Zähler', es: 'Contador', fr: 'Compteur', it: 'Contatore', tr: 'Sayaç' },
  Trackers: { de: 'Alle Zähler', es: 'Contadores', fr: 'Compteurs', it: 'Contatori', tr: 'Sayaçlar' },
  'Count one tracker from your Home Screen or Lock Screen.': {
    de: 'Zähle einen Zähler direkt vom Home- oder Sperrbildschirm.',
    es: 'Cuenta un contador desde la pantalla de inicio o de bloqueo.',
    fr: "Comptez un compteur depuis l'écran d'accueil ou l'écran verrouillé.",
    it: 'Conta un contatore dalla schermata Home o dalla schermata di blocco.',
    tr: "Ana Ekran'dan veya Kilit Ekranı'ndan bir sayacı say.",
  },
  'Your trackers in one list, each with a + button.': {
    de: 'Alle deine Zähler in einer Liste, jeweils mit einer +-Taste.',
    es: 'Todos tus contadores en una lista, cada uno con un botón +.',
    fr: 'Tous vos compteurs dans une liste, chacun avec un bouton +.',
    it: 'Tutti i tuoi contatori in un elenco, ognuno con un pulsante +.',
    tr: 'Tüm sayaçların tek listede, her birinde + düğmesi.',
  },
  'Change count': {
    de: 'Zählstand ändern',
    es: 'Cambiar la cuenta',
    fr: 'Modifier le compte',
    it: 'Cambia il conteggio',
    tr: 'Sayıyı değiştir',
  },
  Tracker: { de: 'Zähler', es: 'Contador', fr: 'Compteur', it: 'Contatore', tr: 'Sayaç' },
  Direction: { de: 'Richtung', es: 'Dirección', fr: 'Sens', it: 'Direzione', tr: 'Yön' },
  'Choose the tracker this widget shows.': {
    de: 'Wähle den Zähler, den dieses Widget zeigt.',
    es: 'Elige el contador que muestra este widget.',
    fr: 'Choisissez le compteur affiché par ce widget.',
    it: 'Scegli il contatore mostrato da questo widget.',
    tr: "Bu widget'ın göstereceği sayacı seç.",
  },
  Add: ADD,
  Subtract: SUBTRACT,
};

const IOS_WATCH = {
  'Open Foxiem on your iPhone to get started.': {
    de: 'Öffne Foxiem auf deinem iPhone, um loszulegen.',
    es: 'Abre Foxiem en tu iPhone para empezar.',
    fr: 'Ouvrez Foxiem sur votre iPhone pour commencer.',
    it: 'Apri Foxiem sul tuo iPhone per iniziare.',
    tr: "Başlamak için iPhone'unda Foxiem'i aç.",
  },
  Add: ADD,
  Subtract: SUBTRACT,
};

/** Android widget picker name and description, keyed by the resource name (see plugins/withNativeLocalization.js). */
const ANDROID_WIDGET = {
  widget_foxiemcounter_label: {
    en: 'Foxiem counter',
    de: 'Foxiem-Zähler',
    es: 'Contador de Foxiem',
    fr: 'Compteur Foxiem',
    it: 'Contatore Foxiem',
    tr: 'Foxiem sayacı',
  },
  widget_foxiemcounter_description: {
    en: 'Count one tracker from your Home Screen.',
    de: 'Zähle einen Zähler direkt vom Home-Bildschirm.',
    es: 'Cuenta un contador desde la pantalla de inicio.',
    fr: "Comptez un compteur depuis l'écran d'accueil.",
    it: 'Conta un contatore dalla schermata Home.',
    tr: "Ana Ekran'dan bir sayacı say.",
  },
  widget_foxiemtrackers_label: {
    en: 'Foxiem trackers',
    de: 'Foxiem-Zähler (Liste)',
    es: 'Contadores de Foxiem',
    fr: 'Compteurs Foxiem',
    it: 'Contatori Foxiem',
    tr: 'Foxiem sayaçları',
  },
  widget_foxiemtrackers_description: {
    en: 'Your trackers in one list, each with a + button.',
    de: 'Alle deine Zähler in einer Liste, jeweils mit einer +-Taste.',
    es: 'Todos tus contadores en una lista, cada uno con un botón +.',
    fr: 'Tous vos compteurs dans une liste, chacun avec un bouton +.',
    it: 'Tutti i tuoi contatori in un elenco, ognuno con un pulsante +.',
    tr: 'Tüm sayaçların tek listede, her birinde + düğmesi.',
  },
};

function catalog(table) {
  const strings = {};
  for (const [source, translations] of Object.entries(table)) {
    const localizations = {};
    for (const language of LANGUAGES) {
      const value = language === 'en' ? source : translations[language];
      if (!value) {
        throw new Error(`Missing ${language} for "${source}"`);
      }
      localizations[language] = { stringUnit: { state: 'translated', value } };
    }
    strings[source] = { extractionState: 'manual', localizations };
  }
  return { sourceLanguage: 'en', strings, version: '1.0' };
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  console.log('wrote', path.relative(root, file));
}

write(path.join(root, 'targets/widget/Localizable.xcstrings'), JSON.stringify(catalog(IOS_WIDGET), null, 2) + '\n');
write(path.join(root, 'targets/watch/Localizable.xcstrings'), JSON.stringify(catalog(IOS_WATCH), null, 2) + '\n');

const androidOut = { languages: LANGUAGES, strings: ANDROID_WIDGET };
write(path.join(root, 'plugins/widget-strings.json'), JSON.stringify(androidOut, null, 2) + '\n');
