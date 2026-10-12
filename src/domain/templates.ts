import { emptyDraft, nameKey } from './trackers';
import type { Tracker, TrackerColor, TrackerDraft, TrackerIntent, TrackerPeriod } from './types';

export type TrackerTemplate = {
  id: string;
  icon: string;
  color: TrackerColor;
  intent: TrackerIntent;
  period: TrackerPeriod;
  target: number | null;
  step: number;
  /** i18n key for a unit such as "glasses"; null for plain counts. */
  unitKey: 'units.glasses' | 'units.pages' | 'units.reps' | 'units.rows' | null;
};

/** Templates teach the intent model: every intent appears at least once. */
export const TRACKER_TEMPLATES: readonly TrackerTemplate[] = [
  { id: 'coffee', icon: 'coffee-outline', color: 'cocoa', intent: 'limit', period: 'day', target: 3, step: 1, unitKey: null },
  { id: 'water', icon: 'cup-water', color: 'sky', intent: 'reach', period: 'day', target: 8, step: 1, unitKey: 'units.glasses' },
  { id: 'reading', icon: 'book-open-page-variant-outline', color: 'leaf', intent: 'reach', period: 'day', target: 30, step: 5, unitKey: 'units.pages' },
  { id: 'pushups', icon: 'arm-flex-outline', color: 'fox', intent: 'reach', period: 'day', target: 100, step: 10, unitKey: 'units.reps' },
  { id: 'cigarettes', icon: 'smoking', color: 'slate', intent: 'reduce', period: 'week', target: null, step: 1, unitKey: null },
  { id: 'knitting', icon: 'sheep', color: 'berry', intent: 'count', period: 'all', target: null, step: 1, unitKey: 'units.rows' },
  { id: 'dogWalks', icon: 'dog-side', color: 'honey', intent: 'consistency', period: 'week', target: 7, step: 1, unitKey: null },
  { id: 'prayer', icon: 'hands-pray', color: 'teal', intent: 'count', period: 'day', target: null, step: 1, unitKey: null },
  { id: 'salesCalls', icon: 'phone-outline', color: 'iris', intent: 'count', period: 'day', target: null, step: 1, unitKey: null },
  { id: 'ideas', icon: 'lightbulb-on-outline', color: 'honey', intent: 'count', period: 'all', target: null, step: 1, unitKey: null },
];

export function findTemplate(id: string | null | undefined): TrackerTemplate | null {
  return TRACKER_TEMPLATES.find((template) => template.id === id) ?? null;
}

export function draftFromTemplate(
  template: TrackerTemplate,
  labels: { name: string; unit: string | null },
): TrackerDraft {
  return emptyDraft({
    name: labels.name,
    icon: template.icon,
    color: template.color,
    intent: template.intent,
    period: template.period,
    target: template.target,
    step: template.step,
    unit: labels.unit,
    templateId: template.id,
  });
}

/**
 * Template trackers store the name they were created with ("Water"). When the language changes,
 * the ones still carrying an untouched template name (or unit) in another language move to the
 * new language. Names the person typed or edited never match a template and are left alone, and a
 * rename is skipped if it would collide with another tracker.
 * Returns null when nothing needs to change.
 */
export function relocalizeTemplateTrackers(
  trackers: readonly Tracker[],
  languages: readonly string[],
  label: (language: string, key: string) => string,
  target: string,
  now: Date = new Date(),
): Tracker[] | null {
  const taken = new Set(trackers.filter((tracker) => tracker.archivedAt === null).map((tracker) => nameKey(tracker.name)));
  let changed = false;
  const next = trackers.map((tracker) => {
    // Trackers without template info (older or sample data) still count when their name is exactly
    // a default name in some language.
    const ownKey = nameKey(tracker.name);
    const template =
      findTemplate(tracker.templateId) ??
      TRACKER_TEMPLATES.find((item) =>
        languages.some((language) => nameKey(label(language, `start.templates.${item.id}`)) === ownKey),
      ) ??
      null;
    if (!template) {
      return tracker;
    }
    let name = tracker.name;
    let unit = tracker.unit;

    const targetName = label(target, `start.templates.${template.id}`);
    const currentKey = nameKey(tracker.name);
    const targetKey = nameKey(targetName);
    if (
      currentKey !== targetKey &&
      languages.some((language) => language !== target && nameKey(label(language, `start.templates.${template.id}`)) === currentKey) &&
      !taken.has(targetKey)
    ) {
      taken.delete(currentKey);
      taken.add(targetKey);
      name = targetName;
    }

    if (template.unitKey && tracker.unit) {
      const targetUnit = label(target, template.unitKey);
      const unitKeyNow = nameKey(tracker.unit);
      if (
        unitKeyNow !== nameKey(targetUnit) &&
        languages.some((language) => language !== target && nameKey(label(language, template.unitKey!)) === unitKeyNow)
      ) {
        unit = targetUnit;
      }
    }

    if (name === tracker.name && unit === tracker.unit) {
      return tracker;
    }
    changed = true;
    return { ...tracker, name, unit, updatedAt: now.toISOString() };
  });
  return changed ? next : null;
}

/** Icons offered in the picker, grouped loosely by theme. */
export const TRACKER_ICONS = [
  'tally-mark-5',
  'coffee-outline',
  'cup-water',
  'water-outline',
  'bottle-soda-outline',
  'beer-outline',
  'glass-wine',
  'food-apple-outline',
  'food-outline',
  'candy-outline',
  'cookie-outline',
  'book-open-page-variant-outline',
  'pencil-outline',
  'translate',
  'lightbulb-on-outline',
  'music-note-outline',
  'piano',
  'guitar-acoustic',
  'arm-flex-outline',
  'dumbbell',
  'weight-lifter',
  'run',
  'walk',
  'bike',
  'swim',
  'yoga',
  'meditation',
  'shoe-sneaker',
  'dog-side',
  'paw',
  'bird',
  'sprout-outline',
  'flower-outline',
  'leaf',
  'hands-pray',
  'heart-outline',
  'bed-outline',
  'pill',
  'tooth-outline',
  'smoking',
  'cellphone',
  'television',
  'controller',
  'laptop',
  'briefcase-outline',
  'phone-outline',
  'email-outline',
  'message-outline',
  'handshake-outline',
  'account-group-outline',
  'cart-outline',
  'cash',
  'car-outline',
  'bus',
  'sheep',
  'needle',
  'baby-bottle-outline',
  'star-outline',
  'check-circle-outline',
  'repeat',
  'counter',
] as const;

const ICON_KEYWORDS: readonly [string, readonly string[]][] = [
  ['coffee-outline', ['coffee', 'espresso', 'latte', 'kahve', 'kaffee', 'café', 'cafe', 'caffè', 'caffe']],
  ['cup-water', ['water', 'drink', ' su', 'su ', 'wasser', 'eau', 'agua', 'acqua', 'hydrat']],
  ['beer-outline', ['beer', 'bira', 'bier', 'bière', 'cerveza', 'birra', 'alcohol', 'alkol']],
  ['glass-wine', ['wine', 'şarap', 'wein', 'vin', 'vino']],
  ['bottle-soda-outline', ['soda', 'cola', 'fizzy', 'soft drink', 'gazoz', 'limonade', 'refresco', 'bibita']],
  ['candy-outline', ['sugar', 'sweet', 'candy', 'şeker', 'tatlı', 'süßigkeit', 'sucre', 'dulce', 'zucchero', 'dolci']],
  ['cookie-outline', ['snack', 'cookie', 'biscuit', 'atıştır', 'keks', 'galleta', 'biscott']],
  ['food-apple-outline', ['fruit', 'apple', 'meyve', 'obst', 'fruta', 'frutta', 'veg']],
  ['book-open-page-variant-outline', ['read', 'book', 'page', 'okuma', 'kitap', 'sayfa', 'lesen', 'buch', 'seite', 'lire', 'livre', 'leer', 'libro', 'leggere', 'pagin']],
  ['translate', ['language', 'duolingo', 'vocab', 'dil', 'sprache', 'langue', 'idioma', 'lingua', 'kelime']],
  ['lightbulb-on-outline', ['idea', 'fikir', 'idee', 'idée']],
  ['music-note-outline', ['music', 'song', 'müzik', 'musik', 'musique', 'música', 'musica']],
  ['piano', ['piano', 'piyano', 'klavier']],
  ['guitar-acoustic', ['guitar', 'gitar', 'gitarre', 'guitare', 'guitarra', 'chitarra']],
  ['arm-flex-outline', ['push', 'pull-up', 'pullup', 'squat', 'rep', 'şınav', 'liegestütz', 'pompe', 'flexion', 'lagartija', 'flession']],
  ['dumbbell', ['gym', 'workout', 'lift', 'weights', 'spor', 'antrenman', 'training', 'entraîn', 'entren', 'allenam', 'palestra']],
  ['run', ['run', 'jog', 'koşu', 'laufen', 'joggen', 'course', 'correr', 'corsa']],
  ['walk', ['walk', 'steps', 'yürü', 'adım', 'spazier', 'gehen', 'marche', 'caminar', 'passeggia', 'passi']],
  ['bike', ['bike', 'cycl', 'bisiklet', 'fahrrad', 'vélo', 'velo', 'bici']],
  ['swim', ['swim', 'yüz', 'schwimm', 'nage', 'nadar', 'nuot']],
  ['yoga', ['yoga', 'stretch', 'esneme', 'dehn', 'étire', 'estira']],
  ['meditation', ['medit', 'breath', 'mindful', 'nefes', 'atem', 'respir']],
  ['dog-side', ['dog', 'köpek', 'hund', 'chien', 'perro', 'cane']],
  ['paw', ['cat', 'pet', 'kedi', 'katze', 'chat', 'gato', 'gatto']],
  ['bird', ['bird', 'kuş', 'vogel', 'oiseau', 'pájaro', 'ave', 'uccell']],
  ['sprout-outline', ['plant', 'garden', 'bitki', 'bahçe', 'pflanz', 'garten', 'plante', 'jardin', 'planta', 'pianta', 'giardin']],
  ['hands-pray', ['pray', 'prayer', 'dua', 'namaz', 'tesbih', 'zikir', 'gebet', 'prière', 'priere', 'oración', 'oracion', 'rosary', 'preghiera', 'rosario']],
  ['bed-outline', ['sleep', 'nap', 'uyku', 'schlaf', 'sommeil', 'sueño', 'sonno']],
  ['pill', ['pill', 'vitamin', 'medic', 'ilaç', 'tablet', 'medikament', 'médicament', 'medicina', 'pastill']],
  ['tooth-outline', ['floss', 'teeth', 'tooth', 'diş', 'zahn', 'dent', 'diente', 'dente']],
  ['smoking', ['cigarette', 'smok', 'sigara', 'zigarette', 'rauch', 'cigarro', 'fumer', 'fumar', 'fumo', 'vape']],
  ['cellphone', ['phone pickup', 'screen', 'social media', 'instagram', 'tiktok', 'ekran', 'bildschirm', 'écran', 'pantalla', 'schermo']],
  ['television', ['tv', 'episode', 'series', 'dizi', 'serie', 'série', 'episod', 'bölüm']],
  ['controller', ['game', 'gaming', 'oyun', 'spiel', 'jeu', 'juego', 'gioco']],
  ['phone-outline', ['call', 'arama', 'anruf', 'appel', 'llamada', 'chiamat', 'telefon']],
  ['email-outline', ['email', 'mail', 'e-posta']],
  ['handshake-outline', ['sale', 'deal', 'client', 'satış', 'müşteri', 'verkauf', 'kunde', 'vente', 'venta', 'cliente', 'vendit']],
  ['account-group-outline', ['customer', 'visitor', 'people', 'guest', 'ziyaret', 'kişi', 'besucher', 'personen', 'visiteur', 'visitante', 'visitator', 'persone']],
  ['cart-outline', ['purchase', 'shopping', 'buy', 'takeaway', 'alışveriş', 'einkauf', 'achat', 'compra', 'acquist']],
  ['cash', ['money', 'spend', '£', '$', '€', 'para', 'harcama', 'geld', 'argent', 'dinero', 'soldi']],
  ['sheep', ['knit', 'sew', 'yarn', 'wool', 'örgü', 'dikiş', 'strick', 'näh', 'tricot', 'couture', 'tejer', 'punto', 'maglia', 'cuci']],
  ['needle', ['injection', 'insulin', 'shot', 'iğne', 'enjeksiyon', 'spritze', 'piqûre', 'inyección', 'iniezione']],
  ['baby-bottle-outline', ['baby', 'feed', 'bebek', 'mama', 'bébé', 'bebé', 'bambin']],
  ['car-outline', ['drive', 'car', 'araba', 'auto', 'voiture', 'coche', 'macchina']],
];

/** Suggest an icon from a tracker name in any supported language; null when unsure. */
export function suggestIcon(name: string): string | null {
  const haystack = ` ${name.toLocaleLowerCase()} `;
  if (haystack.trim().length < 2) {
    return null;
  }
  for (const [icon, words] of ICON_KEYWORDS) {
    if (words.some((word) => haystack.includes(word))) {
      return icon;
    }
  }
  return null;
}
