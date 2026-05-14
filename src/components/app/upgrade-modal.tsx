'use client';

import { useEffect, useMemo, useState } from 'react';

import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { useBillingActions } from '@/hooks/use-billing-actions';
import { usePricingConfig } from '@/hooks/use-pricing-config';
import { useProTierPlanSelection } from '@/hooks/use-pro-tier-plan-selection';
import { ENTERPRISE_SALES_MAILTO_HREF } from '@/lib/billing/enterprise-sales-mailto';
import { planTierIcon } from '@/lib/billing/plan-tier-icon';
import { BillingCycle, PlanCode } from '@/lib/billing/types';
import { cn } from '@/lib/utils';

// Numeric order for tier comparison
const PLAN_ORDER: Record<PlanCode, number> = {
  free: 0,
  starter: 1,
  pro_s: 2,
  pro_m: 3,
  pro_l: 4,
  enterprise: 5,
};

const UPGRADE_MODAL_PLAN_SKELETON_COUNT = 3;
const VALID_PLAN_CODES: PlanCode[] = [
  'free',
  'starter',
  'pro_s',
  'pro_m',
  'pro_l',
  'enterprise',
];

function normalizePlanCode(plan: string): PlanCode {
  const normalized = plan.toLowerCase();
  return VALID_PLAN_CODES.includes(normalized as PlanCode)
    ? (normalized as PlanCode)
    : 'free';
}

function UpgradeModalPlanCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-border/70 bg-card p-6">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="mt-1.5 h-3 w-full max-w-[200px]" />
      </div>
      <div className="mb-5">
        <div className="mb-2 flex items-end gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-4 w-14" />
        </div>
        <Skeleton className="h-3 w-4/5" />
      </div>
      <div className="mb-5 flex-1 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <Skeleton className="h-11 w-full rounded-full" />
    </div>
  );
}

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan?: string;
  /** Synced from `users.subscription_billing_cycle` (Stripe webhook). */
  currentSubscriptionBillingCycle?: BillingCycle | null;
}

export function UpgradeModal({
  open,
  onOpenChange,
  currentPlan = 'free',
  currentSubscriptionBillingCycle,
}: UpgradeModalProps) {
  const tPricing = useTranslations('pricingPage');
  const tModal = useTranslations('pricingPage.upgradeModal');
  const [isYearly, setIsYearly] = useState(true);
  const { data, isError, isFetching, refetch } = usePricingConfig({
    enabled: open,
  });
  const plansSectionLoading = Boolean(isFetching && !data);
  const plansLoadError = Boolean(isError && !data && !isFetching);
  const { loadingKey, startSubscriptionCheckout, openBillingPortal } =
    useBillingActions();

  const currentPlanCode = normalizePlanCode(currentPlan);
  const currentTierLevel = PLAN_ORDER[currentPlanCode] ?? 0;
  const isPaidUser = currentPlanCode !== 'free';

  const paidPlans = useMemo(
    () => (data?.plans ?? []).filter((plan) => plan.code !== 'free'),
    [data?.plans],
  );

  const preferredProTierCode =
    currentPlanCode === 'pro_s' ||
    currentPlanCode === 'pro_m' ||
    currentPlanCode === 'pro_l'
      ? currentPlanCode
      : null;

  const {
    proTierPlans,
    selectedProTierCode,
    setSelectedProTierCode,
    displayPlans,
  } = useProTierPlanSelection(paidPlans, {
    preferredProTierCode,
    open,
  });

  useEffect(() => {
    if (!open) return;
    if (currentSubscriptionBillingCycle === 'monthly') {
      setIsYearly(false);
    } else if (currentSubscriptionBillingCycle === 'yearly') {
      setIsYearly(true);
    }
  }, [open, currentSubscriptionBillingCycle]);

  const yearlyDiscountPercent = useMemo(() => {
    const plans = data?.plans ?? [];
    const discounts = plans
      .map((plan) => {
        if (
          typeof plan.monthlyPriceUsd !== 'number' ||
          typeof plan.yearlyMonthlyPriceUsd !== 'number' ||
          plan.monthlyPriceUsd <= 0 ||
          plan.yearlyMonthlyPriceUsd <= 0 ||
          plan.yearlyMonthlyPriceUsd >= plan.monthlyPriceUsd
        ) {
          return null;
        }
        return (1 - plan.yearlyMonthlyPriceUsd / plan.monthlyPriceUsd) * 100;
      })
      .filter((d): d is number => d !== null);
    return discounts.length > 0 ? Math.round(Math.max(...discounts)) : null;
  }, [data?.plans]);

  const handleSubscribe = async (planCode: PlanCode) => {
    const billingCycle: BillingCycle = isYearly ? 'yearly' : 'monthly';
    try {
      await startSubscriptionCheckout(planCode, billingCycle);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Billing:upgradeModal] checkout failed', error);
      }
      toast.error(tModal('toast.checkoutFailed'));
    }
  };

  const handleOpenPortal = async (planCode: PlanCode) => {
    try {
      await openBillingPortal({
        returnPath: '/app/settings?tab=subscription',
        flow: 'subscription_update',
        loadingKey: `portal:modal:${planCode}`,
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Billing:upgradeModal] portal failed', error);
      }
      toast.error(tModal('toast.portalFailed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-6xl gap-6 overflow-y-auto p-6 sm:p-8">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-xl">{tModal('title')}</DialogTitle>
          <DialogDescription className="mx-auto max-w-2xl">
            {tModal('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          <div
            role="radiogroup"
            aria-label={`${tPricing('billing.monthly')} / ${tPricing('billing.yearly')}`}
            className="inline-flex items-center rounded-full bg-muted p-1"
          >
            <Button
              variant="ghost"
              onClick={() => setIsYearly(false)}
              role="radio"
              aria-checked={!isYearly}
              className={cn(
                'h-11 rounded-full px-5 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-300',
                !isYearly
                  ? 'bg-background text-foreground shadow-sm hover:bg-background'
                  : 'text-muted-foreground hover:bg-transparent hover:text-foreground',
              )}
            >
              {tPricing('billing.monthly')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsYearly(true)}
              role="radio"
              aria-checked={isYearly}
              className={cn(
                'h-11 rounded-full px-5 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-300',
                isYearly
                  ? 'bg-background text-foreground shadow-sm hover:bg-background'
                  : 'text-muted-foreground hover:bg-transparent hover:text-foreground',
              )}
            >
              {tPricing('billing.yearly')}
              {typeof yearlyDiscountPercent === 'number' && (
                <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  -{yearlyDiscountPercent}%
                </span>
              )}
            </Button>
          </div>
        </div>

        <div
          className={cn(
            'mt-2 gap-5',
            plansLoadError
              ? 'flex min-h-[min(45vh,280px)] items-center justify-center py-4'
              : 'grid md:grid-cols-3',
          )}
          aria-busy={plansSectionLoading}
        >
          {plansSectionLoading
            ? Array.from(
                { length: UPGRADE_MODAL_PLAN_SKELETON_COUNT },
                (_, i) => (
                  <UpgradeModalPlanCardSkeleton key={`plan-skeleton-${i}`} />
                ),
              )
            : null}
          {plansLoadError ? (
            <Alert className="w-full max-w-md border-destructive/40 bg-destructive/5">
              <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />
              <AlertTitle>{tPricing('pricingConfigError.title')}</AlertTitle>
              <AlertDescription className="mt-2 space-y-4 text-muted-foreground">
                <p>{tPricing('pricingConfigError.description')}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-destructive/30"
                  onClick={() => void refetch()}
                >
                  {tPricing('pricingConfigError.retry')}
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          {!plansSectionLoading &&
            !plansLoadError &&
            displayPlans.map((basePlan) => {
              const activePlan =
                basePlan.code === 'pro_s'
                  ? proTierPlans.find(
                      (plan) => plan.code === selectedProTierCode,
                    ) || basePlan
                  : basePlan;
              const isProFamilyCard = basePlan.code === 'pro_s';

              const isSameTier = activePlan.code === currentPlanCode;
              const billingCycleMatchesToggle =
                currentSubscriptionBillingCycle != null &&
                ((isYearly && currentSubscriptionBillingCycle === 'yearly') ||
                  (!isYearly && currentSubscriptionBillingCycle === 'monthly'));
              /** Only when we know interval and it matches the Monthly/Yearly control */
              const showLockedCurrentPlanButton =
                isSameTier && isPaidUser && billingCycleMatchesToggle;
              const isCustom = activePlan.monthlyPriceUsd === null;
              const thisTierLevel = PLAN_ORDER[activePlan.code] ?? 0;
              const isLowerTier = thisTierLevel < currentTierLevel;
              const isHigherTier = thisTierLevel > currentTierLevel;
              const price = isYearly
                ? activePlan.yearlyMonthlyPriceUsd
                : activePlan.monthlyPriceUsd;
              const showMoneyPrice = !isCustom && price !== null;
              const showYearlyPriceCompare =
                isYearly &&
                showMoneyPrice &&
                typeof activePlan.monthlyPriceUsd === 'number' &&
                typeof activePlan.yearlyMonthlyPriceUsd === 'number' &&
                activePlan.monthlyPriceUsd > activePlan.yearlyMonthlyPriceUsd;

              const localizedPlanTitle = isProFamilyCard
                ? tPricing('cards.proPlanName')
                : tPricing(`plans.${activePlan.code}.name`);
              const localizedPlanDescription = isProFamilyCard
                ? tPricing('plans.pro_s.description')
                : tPricing(`plans.${activePlan.code}.description`);
              const switchToPlanLabel = tPricing(
                `plans.${activePlan.code}.name`,
              );

              const yearlySaving =
                !isCustom &&
                typeof activePlan.monthlyPriceUsd === 'number' &&
                typeof activePlan.yearlyMonthlyPriceUsd === 'number'
                  ? Math.round(
                      (activePlan.monthlyPriceUsd -
                        activePlan.yearlyMonthlyPriceUsd) *
                        12,
                    )
                  : null;

              const localizedPlanFeatures = [
                activePlan.code !== 'enterprise' &&
                activePlan.monthlyCredits !== null
                  ? tPricing('plans.dynamicCredits.monthly', {
                      credits: activePlan.monthlyCredits ?? 0,
                    })
                  : tPricing(`plans.${activePlan.code}.features.0`),
                tPricing(`plans.${activePlan.code}.features.1`),
                tPricing(`plans.${activePlan.code}.features.2`),
              ];

              const PlanTierIcon = planTierIcon(basePlan.code);
              const hasCheckoutPrice = Boolean(
                isYearly
                  ? activePlan.stripePriceIdYearly
                  : activePlan.stripePriceIdMonthly,
              );
              const subscriptionLoadingKey = `subscription:${activePlan.code}:${isYearly ? 'yearly' : 'monthly'}`;
              const portalLoadingKey = `portal:modal:${activePlan.code}`;
              const portalBusy = Boolean(loadingKey?.startsWith('portal:'));
              const otherSubscriptionBusy = Boolean(
                loadingKey?.startsWith('subscription:') &&
                loadingKey !== subscriptionLoadingKey,
              );
              const subscribeDisabled =
                !hasCheckoutPrice ||
                loadingKey === subscriptionLoadingKey ||
                otherSubscriptionBusy ||
                portalBusy;

              return (
                <div
                  key={basePlan.code}
                  className={cn(
                    'relative flex flex-col rounded-2xl border p-6',
                    basePlan.popular
                      ? 'border-primary/25 bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/20'
                      : 'border-border/70 bg-card',
                    isSameTier && 'ring-2 ring-primary/40',
                  )}
                >
                  {basePlan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow">
                      {tPricing('cards.mostPopular')}
                    </div>
                  )}

                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg',
                          basePlan.popular ? 'bg-primary/10' : 'bg-muted',
                        )}
                      >
                        <PlanTierIcon
                          className={cn(
                            'h-4 w-4',
                            basePlan.popular
                              ? 'text-primary'
                              : 'text-muted-foreground',
                          )}
                        />
                      </div>
                      <span className="font-semibold">
                        {localizedPlanTitle}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {localizedPlanDescription}
                    </p>
                  </div>
                  <div className="mb-5" aria-live="polite">
                    <div
                      className="mb-2 flex flex-wrap items-baseline gap-x-1.5"
                      key={`price-row-${activePlan.code}-${isYearly ? 'yearly' : 'monthly'}`}
                      {...(showYearlyPriceCompare
                        ? {
                            role: 'group' as const,
                            'aria-label': tPricing(
                              'cards.yearlyVsMonthlyPriceAria',
                              {
                                monthlyPrice: `$${activePlan.monthlyPriceUsd}`,
                                yearlyPrice: `$${price}`,
                              },
                            ),
                          }
                        : {})}
                    >
                      {showYearlyPriceCompare ? (
                        <span
                          className="animate-in fade-in-0 slide-in-from-bottom-1 text-lg font-medium text-muted-foreground line-through duration-200 motion-reduce:animate-none"
                          aria-hidden
                        >
                          ${activePlan.monthlyPriceUsd}
                        </span>
                      ) : null}
                      <span
                        key={`price-${activePlan.code}-${isYearly ? 'yearly' : 'monthly'}`}
                        className="animate-in fade-in-0 slide-in-from-bottom-1 text-3xl font-bold text-foreground duration-200 motion-reduce:animate-none"
                        aria-hidden={showYearlyPriceCompare ? true : undefined}
                      >
                        {showMoneyPrice
                          ? `$${price}`
                          : tPricing('cards.customPrice')}
                      </span>
                      {showMoneyPrice && (
                        <span
                          className="ml-0.5 text-sm font-normal text-muted-foreground"
                          aria-hidden={
                            showYearlyPriceCompare ? true : undefined
                          }
                        >
                          {tPricing('cards.perMonth')}
                        </span>
                      )}
                    </div>
                    <p
                      key={`billing-${activePlan.code}-${isYearly ? 'yearly' : 'monthly'}`}
                      className="animate-in fade-in-0 slide-in-from-bottom-1 text-xs text-muted-foreground duration-200 motion-reduce:animate-none"
                    >
                      {isCustom
                        ? tPricing('cards.billedCustom')
                        : !isYearly
                          ? tPricing('cards.billedMonthly')
                          : yearlySaving !== null && yearlySaving > 0
                            ? tPricing.rich('cards.billedYearlySaving', {
                                savings: (chunks) => (
                                  <span className="font-medium text-primary">
                                    {chunks}
                                  </span>
                                ),
                                amountWithSuffix: `$${yearlySaving}${tPricing('cards.billedYearlySavingPerYear')}`,
                              })
                            : tPricing('cards.billedAnnually')}
                    </p>
                  </div>

                  {isProFamilyCard && proTierPlans.length > 1 && (
                    <div className="mb-4">
                      <Select
                        value={selectedProTierCode}
                        onValueChange={(value) =>
                          setSelectedProTierCode(
                            value as 'pro_s' | 'pro_m' | 'pro_l',
                          )
                        }
                      >
                        <SelectTrigger
                          className="h-10 border-2 border-border"
                          aria-label={tPricing('cards.proPlanName')}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {proTierPlans.map((tierPlan) => (
                            <SelectItem
                              key={tierPlan.code}
                              value={tierPlan.code}
                            >
                              {tPricing('plans.dynamicCredits.monthly', {
                                credits: tierPlan.monthlyCredits ?? 0,
                              })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <ul className="mb-5 flex-1 space-y-3">
                    {localizedPlanFeatures.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Check className="h-2.5 w-2.5 text-primary" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {isCustom ? (
                    <Button
                      className="h-11 w-full rounded-full"
                      variant="outline"
                      asChild
                    >
                      <a href={ENTERPRISE_SALES_MAILTO_HREF}>
                        {tPricing('cards.contactSales')}
                      </a>
                    </Button>
                  ) : showLockedCurrentPlanButton ? (
                    <Button
                      className="h-11 w-full rounded-full border-border/70 bg-muted text-foreground/80 opacity-100"
                      variant="outline"
                      disabled
                    >
                      {tModal('currentPlan')}
                    </Button>
                  ) : isSameTier && isPaidUser ? (
                    <Button
                      className="h-11 w-full rounded-full"
                      variant="outline"
                      disabled={loadingKey !== null}
                      onClick={() => void handleOpenPortal(activePlan.code)}
                    >
                      {loadingKey === portalLoadingKey && (
                        <Loader2
                          className="mr-2 h-4 w-4 animate-spin"
                          aria-hidden
                        />
                      )}
                      {tModal('manageSubscription')}
                    </Button>
                  ) : isLowerTier ? (
                    <Button
                      className="h-11 w-full rounded-full"
                      variant="outline"
                      disabled={loadingKey !== null}
                      onClick={() => void handleOpenPortal(activePlan.code)}
                    >
                      {loadingKey === portalLoadingKey && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {tModal('manageSubscription')}
                    </Button>
                  ) : isHigherTier && isPaidUser ? (
                    <Button
                      className="h-11 w-full rounded-full"
                      variant={basePlan.popular ? 'default' : 'outline'}
                      disabled={loadingKey !== null || !hasCheckoutPrice}
                      onClick={() => void handleOpenPortal(activePlan.code)}
                    >
                      {loadingKey === portalLoadingKey && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {tModal('switchTo', { plan: switchToPlanLabel })}
                    </Button>
                  ) : (
                    <Button
                      className="h-11 w-full rounded-full"
                      variant={basePlan.popular ? 'default' : 'outline'}
                      disabled={subscribeDisabled}
                      onClick={() => handleSubscribe(activePlan.code)}
                    >
                      {loadingKey === subscriptionLoadingKey && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {tPricing('cards.upgradeNow')}
                    </Button>
                  )}
                </div>
              );
            })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
