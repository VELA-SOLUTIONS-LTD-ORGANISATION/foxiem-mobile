import { Platform } from 'react-native';

export const EXTERNAL_LINKS = {
  privacyPolicy: 'https://foxiem.com/privacy',
  accountDeletion: 'https://foxiem.com/delete',
  /** Empty until Foxiem publishes its own terms; the store's standard terms apply meanwhile. */
  termsOfUse: '',
  support: 'mailto:support@solutionvela.co.uk',
} as const;

const STORE_STANDARD_TERMS = {
  ios: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  android: 'https://play.google.com/about/play-terms/',
} as const;

export function termsUrl(): string {
  if (EXTERNAL_LINKS.termsOfUse) {
    return EXTERNAL_LINKS.termsOfUse;
  }
  return Platform.OS === 'ios' ? STORE_STANDARD_TERMS.ios : STORE_STANDARD_TERMS.android;
}
