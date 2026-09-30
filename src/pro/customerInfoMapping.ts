import { PRO_PLANS, type ProPlan } from './config';
import { FREE_ENTITLEMENT, type Entitlement } from './entitlement';

/** The RevenueCat entitlement identifier that unlocks Foxiem Pro. */
export const PRO_ENTITLEMENT_ID = 'pro';

/** The subset of RevenueCat's `EntitlementInfo` this mapping reads. */
export type StoreEntitlementInfo = {
  isActive: boolean;
  willRenew: boolean;
  productIdentifier: string;
  expirationDate: string | null;
  billingIssueDetectedAt: string | null;
  periodType?: string;
};

/** The subset of RevenueCat's `CustomerInfo` this mapping reads. */
export type StoreCustomerInfo = {
  entitlements: {
    active: Record<string, StoreEntitlementInfo | undefined>;
    all: Record<string, StoreEntitlementInfo | undefined>;
  };
  managementURL?: string | null;
};

/**
 * Store product ids to Foxiem plans. Google Play reports subscriptions as
 * `productId:basePlanId`, so a colon suffix is ignored.
 */
export function planForProduct(productId: string): ProPlan | null {
  const base = productId.split(':')[0];
  return PRO_PLANS.find((plan) => plan.productId === base)?.plan ?? null;
}

const BILLING_RETRY_WINDOW_MS = 60 * 86_400_000;

function validIso(value: string | null | undefined): string | null {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null;
}

/**
 * Turn what the store says into the one state the app understands.
 *
 * - active + no expiry → lifetime
 * - active + a billing issue → grace (the store keeps access on during its grace period)
 * - inactive + a billing issue → billing retry (no access until payment is fixed)
 * - inactive otherwise → expired, keeping the plan and date so the paywall can say "welcome back"
 */
export function entitlementFromCustomerInfo(info: StoreCustomerInfo, now: Date = new Date()): Entitlement {
  const active = info.entitlements.active[PRO_ENTITLEMENT_ID];
  const known = active ?? info.entitlements.all[PRO_ENTITLEMENT_ID];
  if (!known) {
    return { ...FREE_ENTITLEMENT, verifiedAt: now.toISOString() };
  }

  const plan = planForProduct(known.productIdentifier);
  const expiresAt = validIso(known.expirationDate);
  const verifiedAt = now.toISOString();
  const billingIssue = validIso(known.billingIssueDetectedAt) !== null;

  if (active?.isActive) {
    if (plan === 'lifetime' || expiresAt === null) {
      return { status: 'lifetime', plan: plan ?? 'lifetime', expiresAt: null, willRenew: false, verifiedAt, source: 'store' };
    }
    return {
      status: billingIssue ? 'grace' : 'active',
      plan,
      expiresAt,
      willRenew: billingIssue ? false : known.willRenew,
      verifiedAt,
      source: 'store',
    };
  }

  // Stores retry a failed renewal for up to ~60 days; past that a lingering flag means the plan is simply over.
  const retrying = billingIssue && expiresAt !== null && now.getTime() - Date.parse(expiresAt) <= BILLING_RETRY_WINDOW_MS;
  return {
    status: retrying ? 'billingRetry' : 'expired',
    plan,
    expiresAt,
    willRenew: false,
    verifiedAt,
    source: 'store',
  };
}
