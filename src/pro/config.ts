export type ProPlan = 'monthly' | 'yearly' | 'lifetime';

export type PlanConfig = {
  plan: ProPlan;
  productId: string;
  billing: 'month' | 'year' | 'once';
  /**
   * Reference price used only by the development simulator and store listing planning.
   * Real builds must show the localized price returned by the store.
   */
  referencePrice: number;
};

export const PRO_REFERENCE_CURRENCY = 'GBP';

/** The single place plan identifiers and reference prices live. No weekly plan by design. */
export const PRO_PLANS: readonly PlanConfig[] = [
  { plan: 'yearly', productId: 'foxiem_pro_yearly', billing: 'year', referencePrice: 19.99 },
  { plan: 'monthly', productId: 'foxiem_pro_monthly', billing: 'month', referencePrice: 2.99 },
  { plan: 'lifetime', productId: 'foxiem_pro_lifetime', billing: 'once', referencePrice: 44.99 },
];

export const HIGHLIGHTED_PLAN: ProPlan = 'yearly';

export const MANAGE_SUBSCRIPTION_URLS = {
  ios: 'https://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions',
} as const;
