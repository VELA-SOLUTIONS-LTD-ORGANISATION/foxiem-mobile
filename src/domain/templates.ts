import { emptyDraft } from './trackers';
import type { TrackerColor, TrackerDraft, TrackerIntent, TrackerPeriod } from './types';

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
