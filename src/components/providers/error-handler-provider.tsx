'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

import { InsufficientCreditsModal } from '@/components/app/insufficient-credits-modal';
import { UpgradeModal } from '@/components/app/upgrade-modal';

import { useUserData } from '@/hooks/use-user-data';
import { planCodeFromDbPlanId, type PlanCode } from '@/lib/billing/types';

interface ErrorHandlerContextValue {
  showInsufficientCredits: (required: number, available: number) => void;
  showUpgradeModal: () => void;
}

const ErrorHandlerContext = createContext<ErrorHandlerContextValue | null>(
  null,
);

// Plans from which there is no higher paid subscription tier to upgrade to.
const MAX_TIER_PLANS = new Set<PlanCode>(['pro_l', 'enterprise']);

export function ErrorHandlerProvider({ children }: { children: ReactNode }) {
  const { userData } = useUserData();

  const [creditsModal, setCreditsModal] = useState<{
    open: boolean;
    required: number;
    available: number;
  }>({ open: false, required: 0, available: 0 });

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const showInsufficientCredits = useCallback(
    (required: number, available: number) => {
      setCreditsModal({ open: true, required, available });
    },
    [],
  );

  const showUpgradeModal = useCallback(() => {
    setUpgradeModalOpen(true);
  }, []);

  const handleUpgrade = useCallback(() => {
    setCreditsModal({ open: false, required: 0, available: 0 });
    setUpgradeModalOpen(true);
  }, []);

  const isMaxTier = MAX_TIER_PLANS.has(planCodeFromDbPlanId(userData?.plan));

  return (
    <ErrorHandlerContext.Provider
      value={{
        showInsufficientCredits,
        showUpgradeModal,
      }}
    >
      {children}

      <InsufficientCreditsModal
        open={creditsModal.open}
        onOpenChange={(open) => setCreditsModal({ ...creditsModal, open })}
        required={creditsModal.required}
        available={creditsModal.available}
        onUpgrade={handleUpgrade}
        isMaxTier={isMaxTier}
        resetDate={userData?.planExpiredAt}
      />

      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        currentPlan={planCodeFromDbPlanId(userData?.plan)}
        currentSubscriptionBillingCycle={
          userData?.subscriptionBillingCycle ?? null
        }
      />
    </ErrorHandlerContext.Provider>
  );
}

export function useErrorHandler() {
  const context = useContext(ErrorHandlerContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within ErrorHandlerProvider');
  }
  return context;
}
