'use client';

import { useCallback, useState } from 'react';

import { createCheckoutSession, createPortalSession } from '@/lib/billing/api';
import { BillingCycle, BillingPortalFlow, PlanCode } from '@/lib/billing/types';

export interface OpenBillingPortalParams {
  returnPath?: string;
  flow?: BillingPortalFlow;
  loadingKey: string;
}

interface CheckoutPathOptions {
  successPath?: string;
  cancelPath?: string;
}

export function useBillingActions() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const startSubscriptionCheckout = useCallback(
    async (
      planCode: PlanCode,
      billingCycle: BillingCycle,
      options?: CheckoutPathOptions,
    ) => {
      const key = `subscription:${planCode}:${billingCycle}`;
      setLoadingKey(key);
      try {
        const url = await createCheckoutSession({
          purchaseType: 'subscription',
          planCode,
          billingCycle,
          successPath: options?.successPath,
          cancelPath: options?.cancelPath,
        });
        // Do not clear loading after assign: `finally` would run before navigation
        // completes, re-enabling buttons during the handoff to Stripe.
        window.location.assign(url);
      } catch (error) {
        setLoadingKey(null);
        throw error;
      }
    },
    [],
  );

  const openBillingPortal = useCallback(
    async (input?: string | OpenBillingPortalParams) => {
      let returnPath: string | undefined;
      let flow: BillingPortalFlow = 'default';
      let key = 'portal';

      if (typeof input === 'string') {
        returnPath = input;
      } else if (input && typeof input === 'object') {
        returnPath = input.returnPath;
        flow = input.flow ?? 'default';
        key = input.loadingKey;
      }

      setLoadingKey(key);
      try {
        const url = await createPortalSession({
          returnPath,
          flow,
        });
        window.location.assign(url);
      } catch (error) {
        setLoadingKey(null);
        throw error;
      }
    },
    [],
  );

  return {
    loadingKey,
    startSubscriptionCheckout,
    openBillingPortal,
  };
}
