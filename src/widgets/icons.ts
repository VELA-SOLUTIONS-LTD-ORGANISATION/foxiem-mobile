/**
 * Tracker icons are MaterialCommunityIcons names. SwiftUI surfaces need SF Symbols, so every icon
 * in `TRACKER_ICONS` maps to a symbol that exists on iOS 17 and later. Unknown names fall back to a
 * neutral counter symbol, never to a blank image.
 */
export const DEFAULT_SF_SYMBOL = 'number.circle';

const SF_SYMBOLS: Record<string, string> = {
  'tally-mark-5': 'number.circle',
  'coffee-outline': 'cup.and.saucer',
  'cup-water': 'drop',
  'water-outline': 'drop',
  'bottle-soda-outline': 'takeoutbag.and.cup.and.straw',
  'beer-outline': 'wineglass',
  'glass-wine': 'wineglass',
  'food-apple-outline': 'fork.knife',
  'food-outline': 'fork.knife',
  'candy-outline': 'fork.knife',
  'cookie-outline': 'fork.knife',
  'book-open-page-variant-outline': 'book',
  'pencil-outline': 'pencil',
  translate: 'textformat',
  'lightbulb-on-outline': 'lightbulb',
  'music-note-outline': 'music.note',
  piano: 'music.note',
  'guitar-acoustic': 'music.note',
  'arm-flex-outline': 'figure.strengthtraining.traditional',
  dumbbell: 'dumbbell',
  'weight-lifter': 'figure.strengthtraining.traditional',
  run: 'figure.run',
  walk: 'figure.walk',
  bike: 'bicycle',
  swim: 'figure.pool.swim',
  yoga: 'figure.yoga',
  meditation: 'figure.mind.and.body',
  'shoe-sneaker': 'figure.walk',
  'dog-side': 'pawprint',
  paw: 'pawprint',
  bird: 'bird',
  'sprout-outline': 'leaf',
  'flower-outline': 'leaf',
  leaf: 'leaf',
  'hands-pray': 'hands.sparkles',
  'heart-outline': 'heart',
  'bed-outline': 'bed.double',
  pill: 'pills',
  'tooth-outline': 'mouth',
  smoking: 'smoke',
  cellphone: 'iphone',
  television: 'tv',
  controller: 'gamecontroller',
  laptop: 'laptopcomputer',
  'briefcase-outline': 'briefcase',
  'phone-outline': 'phone',
  'email-outline': 'envelope',
  'message-outline': 'message',
  'handshake-outline': 'person.2',
  'account-group-outline': 'person.3',
  'cart-outline': 'cart',
  cash: 'banknote',
  'car-outline': 'car',
  bus: 'bus',
  sheep: 'pawprint',
  needle: 'scissors',
  'baby-bottle-outline': 'heart',
  'star-outline': 'star',
  'check-circle-outline': 'checkmark.circle',
  repeat: 'repeat',
  counter: 'number.circle',
};

export function sfSymbolFor(icon: string): string {
  return SF_SYMBOLS[icon] ?? DEFAULT_SF_SYMBOL;
}

/** Exposed for tests: every catalogue icon must have an explicit symbol. */
export const MAPPED_ICONS: readonly string[] = Object.keys(SF_SYMBOLS);
