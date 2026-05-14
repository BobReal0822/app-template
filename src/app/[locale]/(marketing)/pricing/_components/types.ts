import type { PricingPlan } from '@/lib/billing/types';

export interface PlanText {
  name: string;
  description: string;
  features: string[];
}

export type PlanTextMap = Record<PricingPlan['code'], PlanText>;

export interface ComparisonFeature {
  name: string;
  free: string | boolean;
  starter: string | boolean;
  pro_s: string | boolean;
  pro_m?: string | boolean;
  pro_l?: string | boolean;
  enterprise: string | boolean;
}
