import { Building2, Gem, Sprout, Zap } from 'lucide-react';

import type { PlanCode } from './types';
import type { LucideIcon } from 'lucide-react';

/**
 * Visual tier: free (sprout), starter (zap), pro tiers (gem), enterprise (building).
 */
export function planTierIcon(planCode: PlanCode): LucideIcon {
  switch (planCode) {
    case 'free':
      return Sprout;
    case 'starter':
      return Zap;
    case 'pro_s':
    case 'pro_m':
    case 'pro_l':
      return Gem;
    case 'enterprise':
      return Building2;
    default: {
      const _exhaustive: never = planCode;
      return _exhaustive;
    }
  }
}
