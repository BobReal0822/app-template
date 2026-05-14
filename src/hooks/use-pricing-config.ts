'use client';

import { useQuery } from '@tanstack/react-query';

import { getPricingConfig } from '@/lib/billing/api';

interface UsePricingConfigOptions {
  enabled?: boolean;
}

export function usePricingConfig(options?: UsePricingConfigOptions) {
  return useQuery({
    queryKey: ['billing', 'pricing-config'],
    queryFn: getPricingConfig,
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled,
  });
}
