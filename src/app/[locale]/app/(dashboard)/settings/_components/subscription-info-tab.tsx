'use client';

import { useState } from 'react';

import { Coins, CreditCard, Crown, Loader2, ReceiptText } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { UpgradeModal } from '@/components/app/upgrade-modal';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import { useBillingActions } from '@/hooks/use-billing-actions';
import { useUserData } from '@/hooks/use-user-data';
import { ApiError } from '@/lib/api/client';
import { getSubscriptionPlanDisplayParts } from '@/lib/billing/plan-subscription-info-name-keys';
import { planTierIcon } from '@/lib/billing/plan-tier-icon';
import {
  BILLING_ERROR_STRIPE_CUSTOMER_REQUIRED,
  planCodeFromDbPlanId,
  type BillingPortalFlow,
} from '@/lib/billing/types';
import { cn } from '@/lib/utils';

import { SettingsSectionTitle } from './settings-section-title';

const SETTINGS_RETURN = '/app/settings?tab=subscription';

export function SubscriptionInfoTab() {
  const t = useTranslations('account.subscriptionInfo');
  const format = useFormatter();
  const { userData } = useUserData();
  const { loadingKey, openBillingPortal } = useBillingActions();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const currentPlanCode = planCodeFromDbPlanId(userData?.plan);
  const PlanTierIcon = planTierIcon(currentPlanCode);
  const { primary: planPrimary, tierShort: planTierShort } =
    getSubscriptionPlanDisplayParts(currentPlanCode, t);
  const isPaidPlan = currentPlanCode !== 'free';
  const isCancelAtPeriodEnd =
    isPaidPlan && Boolean(userData?.cancelAtPeriodEnd);

  const credits = userData?.credits ?? 0;
  const planCredits = userData?.planCredits ?? 0;
  const used = planCredits > 0 ? Math.max(0, planCredits - credits) : 0;
  const usedPercent =
    planCredits > 0 ? Math.min(100, Math.round((used / planCredits) * 100)) : 0;

  const formatPlanDate = (iso: string) =>
    format.dateTime(new Date(iso), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const openPortal = async (flow: BillingPortalFlow, actionKey: string) => {
    try {
      await openBillingPortal({
        returnPath: SETTINGS_RETURN,
        flow,
        loadingKey: actionKey,
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Billing:subscriptionSettings] portal failed', error);
      }
      if (
        error instanceof ApiError &&
        error.code === BILLING_ERROR_STRIPE_CUSTOMER_REQUIRED
      ) {
        toast.error(t('toast.noStripeCustomer'));
        setUpgradeModalOpen(true);
        return;
      }
      toast.error(t('toast.portalFailed'));
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="space-y-1.5 pb-4">
          <CardTitle>
            <SettingsSectionTitle icon={Crown}>
              {t('subscription.title')}
            </SettingsSectionTitle>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
                isPaidPlan
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              <PlanTierIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="inline-flex min-w-0 items-center gap-1">
                <span>{planPrimary}</span>
                {planTierShort != null ? (
                  <>
                    <span className="text-muted-foreground/90" aria-hidden>
                      ·
                    </span>
                    <span className="font-medium text-muted-foreground">
                      {planTierShort}
                    </span>
                  </>
                ) : null}
              </span>
            </span>
            {isPaidPlan ? (
              userData?.planExpiredAt ? (
                <span className="text-xs text-muted-foreground">
                  {isCancelAtPeriodEnd
                    ? t('subscription.endsOn', {
                        date: formatPlanDate(userData.planExpiredAt),
                      })
                    : t('subscription.renewsOn', {
                        date: formatPlanDate(userData.planExpiredAt),
                      })}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t('subscription.noExpiry')}
                </span>
              )
            ) : (
              <span className="text-xs text-muted-foreground">
                {t('subscription.notSubscribedHint')}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full shrink-0 sm:w-auto"
            disabled={loadingKey !== null}
            onClick={() => {
              if (!isPaidPlan) {
                setUpgradeModalOpen(true);
                return;
              }
              void openPortal('subscription_update', 'portal:settings:manage');
            }}
          >
            {loadingKey === 'portal:settings:manage' && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            )}
            {t(
              isPaidPlan
                ? 'subscription.manageButtonPaid'
                : 'subscription.manageButtonFree',
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1.5 pb-4">
          <CardTitle>
            <SettingsSectionTitle icon={Coins}>
              {t('creditsBalance.title')}
            </SettingsSectionTitle>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {planCredits > 0 ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                  {credits}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('creditsBalance.available', { count: credits })}
                </p>
              </div>
              <Progress
                value={usedPercent}
                className="h-2"
                aria-label={t('creditsBalance.usedAria', {
                  percent: usedPercent,
                })}
              />
              <p className="text-xs text-muted-foreground">
                {t('creditsBalance.used', { percent: usedPercent })}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
              <div className="min-w-0 space-y-1.5">
                <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                  {credits}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('creditsBalance.upgradePrompt')}
                </p>
              </div>
              {!isPaidPlan && (
                <Button
                  size="sm"
                  className="w-full shrink-0 sm:w-auto"
                  disabled={loadingKey !== null}
                  onClick={() => setUpgradeModalOpen(true)}
                >
                  {t('creditsBalance.upgradeButton')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-1.5">
            <CardTitle>
              <SettingsSectionTitle icon={CreditCard}>
                {t('payment.title')}
              </SettingsSectionTitle>
            </CardTitle>
            <CardDescription className="text-pretty text-xs">
              {isPaidPlan
                ? t('payment.descriptionPaid')
                : t('payment.descriptionFree')}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full shrink-0 sm:w-auto"
            disabled={loadingKey !== null}
            onClick={() =>
              void openPortal(
                'payment_method_update',
                'portal:settings:payment',
              )
            }
          >
            {loadingKey === 'portal:settings:payment' && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            )}
            {t('payment.button')}
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-1.5">
            <CardTitle>
              <SettingsSectionTitle icon={ReceiptText}>
                {t('invoices.title')}
              </SettingsSectionTitle>
            </CardTitle>
            <CardDescription className="text-pretty text-xs">
              {isPaidPlan
                ? t('invoices.descriptionPaid')
                : t('invoices.descriptionFree')}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full shrink-0 sm:w-auto"
            disabled={loadingKey !== null}
            onClick={() =>
              void openPortal('default', 'portal:settings:invoices')
            }
          >
            {loadingKey === 'portal:settings:invoices' && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            )}
            {t('invoices.button')}
          </Button>
        </CardHeader>
      </Card>

      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        currentPlan={currentPlanCode}
        currentSubscriptionBillingCycle={
          userData?.subscriptionBillingCycle ?? null
        }
      />
    </div>
  );
}
