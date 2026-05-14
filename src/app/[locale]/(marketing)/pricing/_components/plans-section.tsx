import type { ReactNode } from 'react';

import { AlertTriangle, Check, Loader2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StaggerChildren } from '@/components/ui/stagger-children';

import { useProTierPlanSelection } from '@/hooks/use-pro-tier-plan-selection';
import { Link } from '@/i18n/routing';
import { ENTERPRISE_SALES_MAILTO_HREF } from '@/lib/billing/enterprise-sales-mailto';
import { planTierIcon } from '@/lib/billing/plan-tier-icon';
import type { PricingPlan } from '@/lib/billing/types';
import { cn } from '@/lib/utils';

import type { PlanTextMap } from './types';

interface PricingPlansSectionProps {
  plans: PricingPlan[];
  planText: PlanTextMap;
  isYearly: boolean;
  isLoading: boolean;
  /** Pricing config request failed and there is no cached data to show. */
  loadError?: boolean;
  onRetryLoad?: () => void;
  loadingKey: string | null;
  labels: {
    mostPopular: string;
    customPrice: string;
    perMonth: string;
    billedAnnually: string;
    billedMonthly: string;
    billedYearlySaving: (yearlySaving: number) => ReactNode;
    yearlyVsMonthlyPriceAria: (
      monthlyPrice: string,
      yearlyPrice: string,
    ) => string;
    billedCustom: string;
    billedFree: string;
    getStartedFree: string;
    contactSales: string;
    upgradeNow: string;
    proPlanName: string;
    pricingLoadFailedTitle: string;
    pricingLoadFailedDescription: string;
    retryPricingLoad: string;
  };
  onSubscribe: (
    planCode: Exclude<PricingPlan['code'], 'free' | 'enterprise'>,
  ) => void;
}

export function PricingPlansSection({
  plans,
  planText,
  isYearly,
  isLoading,
  loadError = false,
  onRetryLoad,
  loadingKey,
  labels,
  onSubscribe,
}: PricingPlansSectionProps) {
  const {
    proTierPlans,
    selectedProTierCode,
    setSelectedProTierCode,
    displayPlans,
  } = useProTierPlanSelection(plans);

  if (isLoading) {
    return (
      <section className="relative -mt-4 pb-20 sm:pb-24">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={`plan-skeleton-${index}`}
                className="rounded-3xl bg-card p-6 shadow-sm shadow-foreground/5 dark:shadow-black/25"
              >
                <div className="mb-5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <div className="mt-4 flex items-end gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                  <Skeleton className="mt-3 h-4 w-3/4" />
                </div>

                <div className="mb-6 space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>

                <Skeleton className="h-10 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="relative -mt-4 pb-20 sm:pb-24">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <Alert
            variant="destructive"
            className="mx-auto max-w-lg border-destructive/40 bg-destructive/5"
          >
            <AlertTriangle className="h-4 w-4" aria-hidden />
            <AlertTitle>{labels.pricingLoadFailedTitle}</AlertTitle>
            <AlertDescription className="mt-2 space-y-4 text-muted-foreground">
              <p>{labels.pricingLoadFailedDescription}</p>
              {onRetryLoad ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-destructive/30"
                  onClick={() => onRetryLoad()}
                >
                  {labels.retryPricingLoad}
                </Button>
              ) : null}
            </AlertDescription>
          </Alert>
        </div>
      </section>
    );
  }

  return (
    <section className="relative -mt-4 pb-20 sm:pb-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <StaggerChildren
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
          staggerDelay={100}
          animation="scaleUp"
        >
          {displayPlans.map((basePlan) => {
            const activePlan =
              basePlan.code === 'pro_s'
                ? proTierPlans.find(
                    (plan) => plan.code === selectedProTierCode,
                  ) || basePlan
                : basePlan;
            const text = planText[activePlan.code];
            const priceFromPeriod = isYearly
              ? activePlan.yearlyMonthlyPriceUsd
              : activePlan.monthlyPriceUsd;
            const price =
              priceFromPeriod === null && activePlan.code === 'free'
                ? (activePlan.monthlyPriceUsd ?? 0)
                : priceFromPeriod;
            const isCustom = price === null;
            const isFree = activePlan.code === 'free';
            const isProFamilyCard = basePlan.code === 'pro_s';
            const PlanTierIcon = planTierIcon(basePlan.code);
            const hasCheckoutPrice = Boolean(
              isYearly
                ? activePlan.stripePriceIdYearly
                : activePlan.stripePriceIdMonthly,
            );
            const showYearlyPriceCompare =
              isYearly &&
              !isCustom &&
              !isFree &&
              typeof activePlan.monthlyPriceUsd === 'number' &&
              typeof activePlan.yearlyMonthlyPriceUsd === 'number' &&
              activePlan.monthlyPriceUsd > activePlan.yearlyMonthlyPriceUsd;

            return (
              <div
                key={basePlan.code}
                className={cn(
                  'group relative flex flex-col rounded-3xl border p-6',
                  'transition-[translate,box-shadow,border-color] duration-300 ease-out',
                  'hover:-translate-y-2 has-data-[state=open]:-translate-y-2',
                  'motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:has-data-[state=open]:translate-y-0',
                  basePlan.popular
                    ? 'border-primary/25 bg-card shadow-xl shadow-primary/10 ring-1 ring-primary/20 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/20 dark:shadow-black/35 dark:hover:shadow-black/50 has-data-[state=open]:border-primary/40 has-data-[state=open]:shadow-2xl has-data-[state=open]:shadow-primary/20 dark:has-data-[state=open]:shadow-black/50'
                    : 'border-border/70 bg-card shadow-sm shadow-foreground/5 hover:border-border hover:shadow-xl dark:shadow-black/25 dark:hover:shadow-black/40 has-data-[state=open]:border-border has-data-[state=open]:shadow-xl dark:has-data-[state=open]:shadow-black/40',
                )}
              >
                {basePlan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-lg">
                    {labels.mostPopular}
                  </div>
                )}

                <div className="mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl',
                        basePlan.popular ? 'bg-primary/10' : 'bg-muted',
                      )}
                    >
                      <PlanTierIcon
                        className={cn(
                          'h-5 w-5',
                          basePlan.popular
                            ? 'text-primary'
                            : 'text-muted-foreground',
                        )}
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {isProFamilyCard ? labels.proPlanName : text.name}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {isProFamilyCard
                      ? planText.pro_s.description
                      : text.description}
                  </p>
                </div>
                <div className="mb-5" aria-live="polite">
                  <div
                    className="mb-2 flex flex-wrap items-baseline gap-x-1.5"
                    key={`price-row-${activePlan.code}-${isYearly ? 'yearly' : 'monthly'}`}
                    {...(showYearlyPriceCompare
                      ? {
                          role: 'group' as const,
                          'aria-label': labels.yearlyVsMonthlyPriceAria(
                            `$${activePlan.monthlyPriceUsd}`,
                            `$${price}`,
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
                      className="animate-in fade-in-0 slide-in-from-bottom-1 text-4xl font-bold text-foreground duration-200 motion-reduce:animate-none"
                      aria-hidden={showYearlyPriceCompare ? true : undefined}
                    >
                      {isCustom ? labels.customPrice : `$${price}`}
                    </span>
                    {!isCustom && (
                      <span
                        className="ml-0.5 text-sm text-muted-foreground"
                        aria-hidden={showYearlyPriceCompare ? true : undefined}
                      >
                        {labels.perMonth}
                      </span>
                    )}
                  </div>
                  {(() => {
                    const yearlySaving =
                      !isCustom &&
                      !isFree &&
                      typeof activePlan.monthlyPriceUsd === 'number' &&
                      typeof activePlan.yearlyMonthlyPriceUsd === 'number'
                        ? Math.round(
                            (activePlan.monthlyPriceUsd -
                              activePlan.yearlyMonthlyPriceUsd) *
                              12,
                          )
                        : null;
                    return (
                      <p
                        key={`billing-${activePlan.code}-${isYearly ? 'yearly' : 'monthly'}`}
                        className="animate-in fade-in-0 slide-in-from-bottom-1 text-xs text-muted-foreground duration-200 motion-reduce:animate-none"
                      >
                        {isFree
                          ? labels.billedFree
                          : isCustom
                            ? labels.billedCustom
                            : !isYearly
                              ? labels.billedMonthly
                              : yearlySaving !== null && yearlySaving > 0
                                ? labels.billedYearlySaving(yearlySaving)
                                : labels.billedAnnually}
                      </p>
                    );
                  })()}
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
                        aria-label={labels.proPlanName}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {proTierPlans.map((tierPlan) => (
                          <SelectItem key={tierPlan.code} value={tierPlan.code}>
                            {planText[tierPlan.code].features[0]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <ul className="mb-6 flex-1 space-y-3">
                  {text.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-2.5 w-2.5 text-primary" />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {isCustom || (!isFree && !hasCheckoutPrice) ? (
                  <Button
                    variant={basePlan.popular ? 'default' : 'outline'}
                    size="default"
                    className={cn(
                      'h-11 w-full rounded-full transition-opacity duration-300',
                      basePlan.popular && 'hover:opacity-90',
                    )}
                    asChild
                    disabled={loadingKey !== null}
                  >
                    <a href={ENTERPRISE_SALES_MAILTO_HREF}>
                      {labels.contactSales}
                    </a>
                  </Button>
                ) : (
                  <>
                    {isFree ? (
                      <Button
                        variant={basePlan.popular ? 'default' : 'outline'}
                        size="default"
                        className={cn(
                          'h-11 w-full rounded-full transition-opacity duration-300',
                          basePlan.popular && 'hover:opacity-90',
                        )}
                        disabled={loadingKey !== null}
                        asChild
                      >
                        <Link href="/auth/sign-up">
                          {labels.getStartedFree}
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        variant={basePlan.popular ? 'default' : 'outline'}
                        size="default"
                        className={cn(
                          'h-11 w-full rounded-full transition-opacity duration-300',
                          basePlan.popular && 'hover:opacity-90',
                        )}
                        disabled={loadingKey !== null}
                        onClick={() => {
                          if (
                            activePlan.code === 'starter' ||
                            activePlan.code === 'pro_s' ||
                            activePlan.code === 'pro_m' ||
                            activePlan.code === 'pro_l'
                          ) {
                            onSubscribe(activePlan.code);
                          }
                        }}
                      >
                        {loadingKey === activePlan.code && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {labels.upgradeNow}
                      </Button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </StaggerChildren>
      </div>
    </section>
  );
}
