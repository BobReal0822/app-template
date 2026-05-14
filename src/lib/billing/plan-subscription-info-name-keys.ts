import type { PlanCode } from './types';
import type { useTranslations } from 'next-intl';

type SubscriptionInfoT = ReturnType<
  typeof useTranslations<'account.subscriptionInfo'>
>;

/**
 * Subscription / app chrome: use the same umbrella name as pricing ("Pro"), with a
 * short tier suffix (S/M/L) so it matches upgrade modal + pricing cards without
 * repeating full "Pro S" product names in the primary label.
 */
export function getSubscriptionPlanLabelKeys(planCode: PlanCode): {
  primaryKey: string;
  tierShortKey?: string;
} {
  if (planCode === 'pro_s' || planCode === 'pro_m' || planCode === 'pro_l') {
    return {
      primaryKey: 'plans.pro.displayName',
      tierShortKey: `plans.pro.tierShort.${planCode}`,
    };
  }
  return { primaryKey: `plans.${planCode}.name` };
}

/** Pass `t` from `useTranslations('account.subscriptionInfo')`. */
export function getSubscriptionPlanDisplayParts(
  planCode: PlanCode,
  t: SubscriptionInfoT,
): { primary: string; tierShort?: string } {
  const { primaryKey, tierShortKey } = getSubscriptionPlanLabelKeys(planCode);
  return {
    primary: t(primaryKey as never),
    tierShort: tierShortKey ? t(tierShortKey as never) : undefined,
  };
}
