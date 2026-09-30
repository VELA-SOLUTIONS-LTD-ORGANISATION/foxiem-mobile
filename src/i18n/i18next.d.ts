import 'i18next';

/**
 * Keys are intentionally not typed from the English catalogue: at this catalogue size the
 * compiler gives up ("type instantiation is excessively deep") on plural + interpolation calls.
 * `src/i18n/__tests__/keyUsage.test.ts` checks every literal key used in source exists instead.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    returnNull: false;
  }
}
