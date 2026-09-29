export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export type SpaceToken = keyof typeof space;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  round: 999,
} as const;

export const sizes = {
  touch: 48,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  tile: 40,
  rowKey: 52,
  detailKey: 64,
  inputHeight: 52,
  buttonHeight: 52,
} as const;

export const motion = {
  quick: 140,
  base: 220,
  slow: 360,
} as const;

/** Upper bound for Dynamic Type / font scale so layouts hold at the largest sizes. */
export const MAX_FONT_SCALE = 1.6;
