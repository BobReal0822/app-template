'use client';

import { useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useBillingActions } from '@/hooks/use-billing-actions';
import { usePricingConfig } from '@/hooks/use-pricing-config';
import type { PricingPlan } from '@/lib/billing/types';

import { FaqSection } from '../features/_shared/faq-section';

import { PricingComparisonSection } from './_components/comparison-section';
import { PricingCtaSection } from './_components/cta-section';
import { PricingHeroSection } from './_components/hero-section';
import { PricingPlansSection } from './_components/plans-section';

import type { ComparisonFeature, PlanTextMap } from './_components/types';

function getYearlyDiscountPercent(plans: PricingPlan[]): number | null {
  const paidPlanDiscounts = plans
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
    .filter((discount): discount is number => discount !== null);

  if (paidPlanDiscounts.length === 0) return null;
  // Use the maximum paid-plan discount for hero badge emphasis.
  return Math.round(Math.max(...paidPlanDiscounts));
}

function getPlanByCode(
  plans: PricingPlan[],
  code: PricingPlan['code'],
): PricingPlan | null {
  return plans.find((plan) => plan.code === code) ?? null;
}

export function PricingPageContent() {
  const t = useTranslations('pricingPage');
  const [isYearly, setIsYearly] = useState(true);
  const { data, isError, isFetching, isLoading, refetch } = usePricingConfig();
  const plansSectionLoading = Boolean(isFetching && !data);
  const plansLoadError = Boolean(isError && !data && !isFetching);
  const { loadingKey, startSubscriptionCheckout } = useBillingActions();
  const checkoutLoadingPlanCode = useMemo(() => {
    if (!loadingKey?.startsWith('subscription:')) {
      return null;
    }
    const [, planCode] = loadingKey.split(':');
    if (
      planCode === 'starter' ||
      planCode === 'pro_s' ||
      planCode === 'pro_m' ||
      planCode === 'pro_l'
    ) {
      return planCode;
    }
    return null;
  }, [loadingKey]);
  const yearlyDiscountPercent = useMemo(
    () => getYearlyDiscountPercent(data?.plans || []),
    [data?.plans],
  );

  const comparisonFeatures: ComparisonFeature[] = [
    {
      name: t('comparison.monthlyCredits.name'),
      free: t('comparison.monthlyCredits.free'),
      starter: t('comparison.monthlyCredits.starter'),
      pro_s: t('comparison.monthlyCredits.pro_s'),
      enterprise: t('comparison.monthlyCredits.enterprise'),
    },
    {
      name: t('comparison.priorityQueue.name'),
      free: false,
      starter: false,
      pro_s: true,
      enterprise: true,
    },
    {
      name: t('comparison.teamSupport.name'),
      free: false,
      starter: false,
      pro_s: true,
      enterprise: true,
    },
    {
      name: t('comparison.apiSla.name'),
      free: false,
      starter: false,
      pro_s: true,
      enterprise: true,
    },
  ];

  const starterPlan = getPlanByCode(data?.plans || [], 'starter');
  const proSPlan = getPlanByCode(data?.plans || [], 'pro_s');
  const proMPlan = getPlanByCode(data?.plans || [], 'pro_m');
  const proLPlan = getPlanByCode(data?.plans || [], 'pro_l');

  const starterCreditsFeature = starterPlan
    ? t('plans.dynamicCredits.monthly', {
        credits: starterPlan.monthlyCredits ?? 0,
      })
    : t('plans.starter.features.0');

  const proSCreditsFeature = proSPlan
    ? t('plans.dynamicCredits.monthly', {
        credits: proSPlan.monthlyCredits ?? 0,
      })
    : t('plans.pro_s.features.0');

  const proMCreditsFeature = proMPlan
    ? t('plans.dynamicCredits.monthly', {
        credits: proMPlan.monthlyCredits ?? 0,
      })
    : t('plans.pro_m.features.0');

  const proLCreditsFeature = proLPlan
    ? t('plans.dynamicCredits.monthly', {
        credits: proLPlan.monthlyCredits ?? 0,
      })
    : t('plans.pro_l.features.0');

  const planText: PlanTextMap = {
    free: {
      name: t('plans.free.name'),
      description: t('plans.free.description'),
      features: [
        t('plans.free.features.0'),
        t('plans.free.features.1'),
        t('plans.free.features.2'),
      ],
    },
    starter: {
      name: t('plans.starter.name'),
      description: t('plans.starter.description'),
      features: [
        starterCreditsFeature,
        t('plans.starter.features.1'),
        t('plans.starter.features.2'),
      ],
    },
    pro_s: {
      name: t('plans.pro_s.name'),
      description: t('plans.pro_s.description'),
      features: [
        proSCreditsFeature,
        t('plans.pro_s.features.1'),
        t('plans.pro_s.features.2'),
      ],
    },
    pro_m: {
      name: t('plans.pro_m.name'),
      description: t('plans.pro_m.description'),
      features: [
        proMCreditsFeature,
        t('plans.pro_m.features.1'),
        t('plans.pro_m.features.2'),
      ],
    },
    pro_l: {
      name: t('plans.pro_l.name'),
      description: t('plans.pro_l.description'),
      features: [
        proLCreditsFeature,
        t('plans.pro_l.features.1'),
        t('plans.pro_l.features.2'),
      ],
    },
    enterprise: {
      name: t('plans.enterprise.name'),
      description: t('plans.enterprise.description'),
      features: [
        t('plans.enterprise.features.0'),
        t('plans.enterprise.features.1'),
        t('plans.enterprise.features.2'),
      ],
    },
  };

  const faqs = Array.from({ length: 6 }, (_, index) => ({
    key: `pricing-faq-${index}`,
    question: t(`faq.items.${index}.question`),
    answer: t(`faq.items.${index}.answer`),
  }));

  const handleSubscribe = async (
    planCode: 'starter' | 'pro_s' | 'pro_m' | 'pro_l',
  ) => {
    try {
      await startSubscriptionCheckout(
        planCode,
        isYearly ? 'yearly' : 'monthly',
        {
          successPath: '/app/settings?tab=subscription',
          cancelPath: '/pricing',
        },
      );
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Billing:pricingPage] checkout failed', error);
      }
      toast.error(t('upgradeModal.toast.checkoutFailed'));
    }
  };

  return (
    <div className="min-h-screen">
      <PricingHeroSection
        titlePrefix={t('hero.titlePrefix')}
        titleHighlight={t('hero.titleHighlight')}
        description={t('hero.description')}
        monthlyLabel={t('billing.monthly')}
        yearlyLabel={t('billing.yearly')}
        isYearly={isYearly}
        onToggleYearly={setIsYearly}
        yearlyDiscountPercent={yearlyDiscountPercent}
        isPricingLoading={isLoading}
      />

      <PricingPlansSection
        plans={data?.plans || []}
        planText={planText}
        isYearly={isYearly}
        isLoading={plansSectionLoading}
        loadError={plansLoadError}
        onRetryLoad={() => void refetch()}
        loadingKey={checkoutLoadingPlanCode}
        labels={{
          mostPopular: t('cards.mostPopular'),
          customPrice: t('cards.customPrice'),
          perMonth: t('cards.perMonth'),
          billedAnnually: t('cards.billedAnnually'),
          billedMonthly: t('cards.billedMonthly'),
          billedYearlySaving: (yearlySaving) =>
            t.rich('cards.billedYearlySaving', {
              savings: (chunks) => (
                <span className="font-medium text-primary">{chunks}</span>
              ),
              amountWithSuffix: `$${yearlySaving}${t('cards.billedYearlySavingPerYear')}`,
            }),
          yearlyVsMonthlyPriceAria: (monthlyPrice, yearlyPrice) =>
            t('cards.yearlyVsMonthlyPriceAria', { monthlyPrice, yearlyPrice }),
          billedCustom: t('cards.billedCustom'),
          billedFree: t('cards.billedFree'),
          getStartedFree: t('cards.getStartedFree'),
          contactSales: t('cards.contactSales'),
          upgradeNow: t('cards.upgradeNow'),
          proPlanName: t('cards.proPlanName'),
          pricingLoadFailedTitle: t('pricingConfigError.title'),
          pricingLoadFailedDescription: t('pricingConfigError.description'),
          retryPricingLoad: t('pricingConfigError.retry'),
        }}
        onSubscribe={(planCode) => {
          void handleSubscribe(planCode);
        }}
      />

      <PricingComparisonSection
        title={t('comparison.title')}
        subtitle={t('comparison.subtitle')}
        columns={{
          features: t('comparison.columns.features'),
          free: t('comparison.columns.free'),
          starter: t('comparison.columns.starter'),
          pro_s: t('comparison.columns.pro_s'),
          enterprise: t('comparison.columns.enterprise'),
        }}
        features={comparisonFeatures}
      />

      <FaqSection
        heading={t('faq.title')}
        subheading={t('faq.subtitle')}
        items={faqs}
        sectionClassName="bg-muted/40"
      />

      <PricingCtaSection
        title={t('cta.title')}
        description={t('cta.description')}
        primaryLabel={t('cta.startFree')}
        secondaryLabel={t('cta.talkToSales')}
      />
    </div>
  );
}
