export const EXTERNAL_LINKS = {
  privacyPolicy: 'https://foxiem.com/privacy',
  termsOfUse: '',
} as const;

export type ExternalLinkKey = keyof typeof EXTERNAL_LINKS;
