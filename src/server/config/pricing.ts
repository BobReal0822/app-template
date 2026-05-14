/**
 * Pricing config — source of truth for plan rows, credit allocations, and the
 * Stripe price IDs used by the checkout / portal flows.
 *
 * Stripe price IDs are read from `process.env.STRIPE_PRICE_*` so non-prod
 * environments can point at sandbox prices without code changes.
 */

export type PlanCode =
  | 'free'
  | 'starter'
  | 'pro_s'
  | 'pro_m'
  | 'pro_l'
  | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';

export interface PricingPlanConfig {
  code: PlanCode;
  /** null = custom / unlimited (e.g. enterprise) */
  monthlyCredits: number | null;
  monthlyPriceUsd: number | null;
  /** Per-month price when billed annually; null = free or custom pricing */
  yearlyMonthlyPriceUsd: number | null;
  popular?: boolean;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
}

export interface PublicPricingConfig {
  plans: PricingPlanConfig[];
}

interface StripePriceIdsByPlan {
  starter: { monthly: string; yearly: string };
  pro_s: { monthly: string; yearly: string };
  pro_m: { monthly: string; yearly: string };
  pro_l: { monthly: string; yearly: string };
}

function getRequiredEnv(name: string): string {
  const raw = process.env[name];
  const value = raw?.trim();
  if (!value) {
    throw new Error(`[Billing:pricing] Missing required env var: ${name}`);
  }
  return value;
}

function getStripePriceIdsByPlan(): StripePriceIdsByPlan {
  return {
    starter: {
      monthly: getRequiredEnv('STRIPE_PRICE_STARTER_MONTHLY'),
      yearly: getRequiredEnv('STRIPE_PRICE_STARTER_YEARLY'),
    },
    pro_s: {
      monthly: getRequiredEnv('STRIPE_PRICE_PRO_S_MONTHLY'),
      yearly: getRequiredEnv('STRIPE_PRICE_PRO_S_YEARLY'),
    },
    pro_m: {
      monthly: getRequiredEnv('STRIPE_PRICE_PRO_M_MONTHLY'),
      yearly: getRequiredEnv('STRIPE_PRICE_PRO_M_YEARLY'),
    },
    pro_l: {
      monthly: getRequiredEnv('STRIPE_PRICE_PRO_L_MONTHLY'),
      yearly: getRequiredEnv('STRIPE_PRICE_PRO_L_YEARLY'),
    },
  };
}

/** Single source for free-tier monthly credits (scheduler, webhooks, `getPricingPlans`). */
export const FREE_PLAN_MONTHLY_CREDITS = 15;

let cachedPlans: PricingPlanConfig[] | null = null;

function getPlansInternal(): PricingPlanConfig[] {
  if (cachedPlans) {
    return cachedPlans;
  }

  const stripePriceIds = getStripePriceIdsByPlan();
  cachedPlans = [
    {
      code: 'free',
      monthlyCredits: FREE_PLAN_MONTHLY_CREDITS,
      monthlyPriceUsd: 0,
      yearlyMonthlyPriceUsd: null,
    },
    {
      code: 'starter',
      monthlyCredits: 150,
      monthlyPriceUsd: 27,
      yearlyMonthlyPriceUsd: 19,
      stripePriceIdMonthly: stripePriceIds.starter.monthly,
      stripePriceIdYearly: stripePriceIds.starter.yearly,
    },
    {
      code: 'pro_s',
      monthlyCredits: 500,
      monthlyPriceUsd: 79,
      yearlyMonthlyPriceUsd: 56,
      popular: true,
      stripePriceIdMonthly: stripePriceIds.pro_s.monthly,
      stripePriceIdYearly: stripePriceIds.pro_s.yearly,
    },
    {
      code: 'pro_m',
      monthlyCredits: 1000,
      monthlyPriceUsd: 149,
      yearlyMonthlyPriceUsd: 105,
      stripePriceIdMonthly: stripePriceIds.pro_m.monthly,
      stripePriceIdYearly: stripePriceIds.pro_m.yearly,
    },
    {
      code: 'pro_l',
      monthlyCredits: 2000,
      monthlyPriceUsd: 279,
      yearlyMonthlyPriceUsd: 199,
      stripePriceIdMonthly: stripePriceIds.pro_l.monthly,
      stripePriceIdYearly: stripePriceIds.pro_l.yearly,
    },
    {
      code: 'enterprise',
      monthlyCredits: null,
      monthlyPriceUsd: null,
      yearlyMonthlyPriceUsd: null,
    },
  ];
  return cachedPlans;
}

export function getPricingPlans(): PricingPlanConfig[] {
  return [...getPlansInternal()];
}

export function getPublicPricingConfig(): PublicPricingConfig {
  return { plans: getPlansInternal() };
}

export function getStripePriceIdForSubscription(
  planCode: PlanCode,
  cycle: BillingCycle,
): string | null {
  const plan = getPlansInternal().find((item) => item.code === planCode);
  if (!plan) return null;
  if (cycle === 'monthly') return plan.stripePriceIdMonthly || null;
  return plan.stripePriceIdYearly || null;
}

export function getPlanByPriceId(priceId: string): PricingPlanConfig | null {
  return (
    getPlansInternal().find(
      (item) =>
        item.stripePriceIdMonthly === priceId ||
        item.stripePriceIdYearly === priceId,
    ) || null
  );
}

export function getBillingCycleByPriceId(priceId: string): BillingCycle | null {
  const plan = getPlanByPriceId(priceId);
  if (!plan) return null;
  return plan.stripePriceIdYearly === priceId ? 'yearly' : 'monthly';
}
