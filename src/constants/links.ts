export const EXTERNAL_LINKS = {
  privacyPolicy: '',
  termsOfUse: '',
} as const;

export type ExternalLinkKey = keyof typeof EXTERNAL_LINKS;
