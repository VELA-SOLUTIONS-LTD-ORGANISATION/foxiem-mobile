import type { ProPlan } from './config';

export type EntitlementStatus = 'free' | 'active' | 'grace' | 'billingRetry' | 'expired' | 'lifetime';

export type Entitlement = {
  status: EntitlementStatus;
  plan: ProPlan | null;
  expiresAt: string | null;
  willRenew: boolean;
  /** Last time the store confirmed this state. */
  verifiedAt: string | null;
  source: 'store' | 'simulated' | 'none';
};

export const FREE_ENTITLEMENT: Entitlement = {
  status: 'free',
  plan: null,
  expiresAt: null,
  willRenew: false,
  verifiedAt: null,
  source: 'none',
};

/** How long a cached subscription stays trusted past its expiry when the store is unreachable. */
export const OFFLINE_GRACE_MS = 3 * 86_400_000;

/**
 * Whether Pro features are available right now. Cached state is trusted offline until
 * expiry plus a short grace window; lifetime never expires. Billing retry without a
 * grace period has no access, matching App Store and Play behaviour.
 */
export function hasProAccess(entitlement: Entitlement, now: Date = new Date()): boolean {
  switch (entitlement.status) {
    case 'lifetime':
      return true;
    case 'active':
    case 'grace': {
      if (!entitlement.expiresAt) {
        return true;
      }
      const expires = Date.parse(entitlement.expiresAt);
      return Number.isFinite(expires) && now.getTime() <= expires + OFFLINE_GRACE_MS;
    }
    default:
      return false;
  }
}

/** Resolve a cached state against the clock (e.g. an expiry passed while offline). */
export function settleEntitlement(entitlement: Entitlement, now: Date = new Date()): Entitlement {
  if ((entitlement.status === 'active' || entitlement.status === 'grace') && !hasProAccess(entitlement, now)) {
    return { ...entitlement, status: 'expired', willRenew: false };
  }
  return entitlement;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const STATUSES: readonly EntitlementStatus[] = ['free', 'active', 'grace', 'billingRetry', 'expired', 'lifetime'];

export function parseEntitlement(value: unknown): Entitlement {
  if (!isRecord(value) || !STATUSES.includes(value.status as EntitlementStatus)) {
    return FREE_ENTITLEMENT;
  }
  const plan = value.plan === 'monthly' || value.plan === 'yearly' || value.plan === 'lifetime' ? value.plan : null;
  const iso = (input: unknown) => (typeof input === 'string' && !Number.isNaN(Date.parse(input)) ? input : null);
  return {
    status: value.status as EntitlementStatus,
    plan,
    expiresAt: iso(value.expiresAt),
    willRenew: value.willRenew === true,
    verifiedAt: iso(value.verifiedAt),
    source: value.source === 'store' || value.source === 'simulated' ? value.source : 'none',
  };
}
