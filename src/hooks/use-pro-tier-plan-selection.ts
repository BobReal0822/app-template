import { useEffect, useMemo, useRef, useState } from 'react';

import type { PlanCode, PricingPlan } from '@/lib/billing/types';

const PRO_TIER_CODES = ['pro_s', 'pro_m', 'pro_l'] as const;
export type ProTierCode = (typeof PRO_TIER_CODES)[number];

function isProTierCode(code: string): code is ProTierCode {
  return (PRO_TIER_CODES as readonly string[]).includes(code);
}

export interface UseProTierPlanSelectionOptions {
  /** When user is on a Pro tier, sync the dropdown to this tier (e.g. current subscription). */
  preferredProTierCode?: PlanCode | null;
  /**
   * When `true` (e.g. upgrade modal open), apply `preferredProTierCode` whenever the dialog opens.
   * Omit on marketing pricing — there is no dialog `open` signal.
   */
  open?: boolean;
}

/**
 * Collapses pro_s / pro_m / pro_l into one "row" for pricing UIs: one card uses
 * `selectedProTierCode` to pick the active `PricingPlan` for price/features/CTA.
 */
export function useProTierPlanSelection(
  plans: PricingPlan[],
  options?: UseProTierPlanSelectionOptions,
) {
  const proTierPlans = useMemo(
    () =>
      plans.filter((plan) =>
        (PRO_TIER_CODES as readonly string[]).includes(plan.code),
      ),
    [plans],
  );

  const [selectedProTierCode, setSelectedProTierCode] =
    useState<ProTierCode>('pro_s');

  const wasModalOpenRef = useRef(false);

  useEffect(() => {
    const isOpen = options?.open === true;
    if (!isOpen) {
      wasModalOpenRef.current = false;
      return;
    }

    const justOpened = !wasModalOpenRef.current;
    wasModalOpenRef.current = true;

    if (!justOpened) {
      return;
    }

    const preferred = options?.preferredProTierCode;
    if (preferred && isProTierCode(preferred)) {
      setSelectedProTierCode(preferred);
      return;
    }

    const fallback =
      proTierPlans.find((p) => p.popular)?.code ??
      proTierPlans[0]?.code ??
      'pro_s';
    setSelectedProTierCode(isProTierCode(fallback) ? fallback : 'pro_s');
  }, [options?.open, options?.preferredProTierCode, proTierPlans]);

  useEffect(() => {
    if (proTierPlans.length === 0) return;
    const hasSelected = proTierPlans.some(
      (plan) => plan.code === selectedProTierCode,
    );
    if (!hasSelected) {
      const preferredCode = proTierPlans.find((plan) => plan.popular)?.code;
      setSelectedProTierCode((preferredCode as ProTierCode) || 'pro_s');
    }
  }, [proTierPlans, selectedProTierCode]);

  const displayPlans = useMemo(
    () =>
      plans.filter((plan) => plan.code !== 'pro_m' && plan.code !== 'pro_l'),
    [plans],
  );

  return {
    proTierPlans,
    selectedProTierCode,
    setSelectedProTierCode,
    displayPlans,
  };
}
