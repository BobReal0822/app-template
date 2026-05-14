/** Aligns with `ErrorCode` in `@/lib/api/response` (e.g. `STRIPE_CUSTOMER_REQUIRED`). */
export const BILLING_ERROR_STRIPE_CUSTOMER_REQUIRED = 4010;

export type PlanCode =
  | 'free'
  | 'starter'
  | 'pro_s'
  | 'pro_m'
  | 'pro_l'
  | 'enterprise';

/** DB `users.plan` → `PlanCode` (nullish or unknown → `free`). */
export function planCodeFromDbPlanId(
  planCode: string | null | undefined,
): PlanCode {
  if (planCode == null || planCode === '') {
    return 'free';
  }
  switch (planCode) {
    case 'free':
    case 'starter':
    case 'pro_s':
    case 'pro_m':
    case 'pro_l':
    case 'enterprise':
      return planCode;
    default:
      return 'free';
  }
}

export type BillingCycle = 'monthly' | 'yearly';

/** DB `users.subscription_billing_cycle` → typed interval; invalid/null → null */
export function subscriptionBillingCycleFromDb(
  raw: string | null | undefined,
): BillingCycle | null {
  if (raw === 'monthly' || raw === 'yearly') return raw;
  return null;
}

/** Stripe Customer Portal entry flow (see Stripe `flow_data` docs). */
export type BillingPortalFlow =
  | 'default'
  | 'payment_method_update'
  | 'subscription_update';

export interface PricingPlan {
  code: PlanCode;
  /** null = custom / unlimited (e.g. enterprise) */
  monthlyCredits: number | null;
  monthlyPriceUsd: number | null;
  /** Per-month price when billed annually; null = free or custom pricing */
  yearlyMonthlyPriceUsd: number | null;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  popular?: boolean;
}

export interface PricingConfigData {
  plans: PricingPlan[];
}
