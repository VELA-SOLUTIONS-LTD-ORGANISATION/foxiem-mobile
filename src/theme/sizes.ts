export const sizes = {
  touchMin: 44,
  controlSm: 40,
  controlMd: 48,
  controlLg: 52,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  iconXl: 32,
  inputHeight: 52,
  buttonHeight: 52,
  buttonHeightSm: 44,
  avatarSm: 32,
  avatarMd: 48,
  avatarLg: 72,
  avatarXl: 96,
  illustrationSm: 72,
  illustrationMd: 120,
  illustrationLg: 160,
  illustrationXl: 220,
} as const;

export type SizeToken = keyof typeof sizes;
