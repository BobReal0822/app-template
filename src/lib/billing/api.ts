'use client';

import { callApi } from '@/lib/api/client';

import {
  BillingCycle,
  BillingPortalFlow,
  PlanCode,
  PricingConfigData,
} from './types';

interface RawPricingConfigData {
  plans: Array<{
    code: PlanCode;
    monthlyCredits: number | null;
    monthlyPriceUsd: number | null;
    yearlyMonthlyPriceUsd: number | null;
    stripePriceIdMonthly?: string;
    stripePriceIdYearly?: string;
    popular?: boolean;
  }>;
}

export async function getPricingConfig(): Promise<PricingConfigData> {
  const response = await callApi<RawPricingConfigData>(
    '/billing/pricing-config',
    undefined,
    {
      method: 'GET',
      requireAuth: false,
    },
  );

  return {
    plans: response.data.plans,
  };
}

export async function createCheckoutSession(payload: {
  purchaseType: 'subscription';
  planCode?: PlanCode;
  billingCycle?: BillingCycle;
  successPath?: string;
  cancelPath?: string;
}): Promise<string> {
  const response = await callApi<{ url: string }>(
    '/billing/create-checkout-session',
    payload,
  );
  return response.data.url;
}

export async function createPortalSession(options?: {
  returnPath?: string;
  flow?: BillingPortalFlow;
}): Promise<string> {
  const response = await callApi<{ url: string }>(
    '/billing/create-portal-session',
    {
      returnPath: options?.returnPath,
      flow: options?.flow ?? 'default',
    },
  );
  return response.data.url;
}
