'use client';

import { ArrowUpRight, Calendar, Coins, Mail, Wallet, Zap } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { ENTERPRISE_SALES_MAILTO_HREF } from '@/lib/billing/enterprise-sales-mailto';
import { cn } from '@/lib/utils';

interface InsufficientCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  required: number;
  available: number;
  onUpgrade: () => void;
  isMaxTier?: boolean;
  resetDate?: string | null;
}

export function InsufficientCreditsModal({
  open,
  onOpenChange,
  required,
  available,
  onUpgrade,
  isMaxTier = false,
  resetDate,
}: InsufficientCreditsModalProps) {
  const t = useTranslations('pricingPage.insufficientCreditsModal');
  const tCards = useTranslations('pricingPage.cards');
  const format = useFormatter();

  const shortage = Math.max(0, required - available);
  const formattedResetDate =
    resetDate != null && resetDate !== ''
      ? format.dateTime(new Date(resetDate), { dateStyle: 'medium' })
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center gap-0 space-y-3 text-center sm:text-center">
          <div
            className={cn(
              'mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-full',
              'bg-primary/10 ring-1 ring-primary/15',
            )}
            aria-hidden
          >
            <Coins className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-balance text-xl sm:text-2xl">
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isMaxTier ? t('descriptionMaxTier') : t('descriptionUpgradePath')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <dl className="space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">
                  {t('summary.required')}
                </dt>
                <dd className="font-semibold tabular-nums text-foreground">
                  {t('creditsAmount', { count: required })}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">
                  {t('summary.available')}
                </dt>
                <dd className="font-semibold tabular-nums text-foreground">
                  {t('creditsAmount', { count: available })}
                </dd>
              </div>
              <div className="border-t border-border pt-2">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">
                    {t('summary.shortBy')}
                  </dt>
                  <dd className="font-semibold tabular-nums text-primary">
                    {t('needAmount', { count: shortage })}
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          {isMaxTier ? (
            <div className="space-y-3">
              {formattedResetDate ? (
                <div className="flex gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <Calendar
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  <div className="min-w-0 text-sm">
                    <p className="font-medium leading-snug">
                      {t('maxTier.resetTitle')}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {t('maxTier.resetDescription', {
                        date: formattedResetDate,
                      })}
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="flex gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <Mail
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />
                <div className="min-w-0 text-sm">
                  <p className="font-medium leading-snug">
                    {t('maxTier.contactPromptTitle')}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {t('maxTier.contactPromptBody')}
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full min-h-11 sm:flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  {t('maxTier.confirm')}
                </Button>
                <Button className="w-full min-h-11 sm:flex-1" asChild>
                  <a href={ENTERPRISE_SALES_MAILTO_HREF}>
                    <Mail className="h-4 w-4 shrink-0" aria-hidden />
                    {tCards('contactSales')}
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2.5">
                <p className="text-sm font-medium leading-snug">
                  {t('upgradePath.benefitsTitle')}
                </p>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex gap-2.5">
                    <Wallet
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span className="leading-snug">
                      {t('upgradePath.benefitCredits')}
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <Zap
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span className="leading-snug">
                      {t('upgradePath.benefitPriority')}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full min-h-11 sm:flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  {t('upgradePath.dismiss')}
                </Button>
                <Button
                  type="button"
                  className="w-full min-h-11 sm:flex-1"
                  onClick={onUpgrade}
                >
                  <ArrowUpRight className="size-4.5 shrink-0" aria-hidden />
                  {tCards('upgradeNow')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
