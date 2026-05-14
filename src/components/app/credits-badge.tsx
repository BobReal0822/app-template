'use client';

import { Coins } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';

interface CreditsBadgeProps {
  credits: number;
  onUpgradeClick?: () => void;
  className?: string;
}

export function CreditsBadge({
  credits,
  onUpgradeClick,
  className,
}: CreditsBadgeProps) {
  const t = useTranslations('appCreditsBadge');
  const isClickable = Boolean(onUpgradeClick);

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        'group min-h-10 min-w-46 justify-start rounded-full bg-primary/10 px-3 py-1.5 hover:bg-primary/10 dark:bg-sidebar-accent dark:hover:bg-sidebar-accent/85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:min-h-9 lg:py-1',
        isClickable && 'cursor-pointer',
        !isClickable &&
          'cursor-default hover:text-foreground disabled:opacity-100',
        className,
      )}
      onClick={isClickable ? onUpgradeClick : undefined}
      disabled={!isClickable}
    >
      {/* Credits */}
      <div className="min-w-0 flex items-center gap-1.5 pr-2">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400">
          <Coins className="h-3 w-3 text-white" />
        </div>
        <span className="truncate text-sm font-medium tabular-nums text-foreground">
          {t('creditsCount', { count: credits })}
        </span>
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-primary/20 dark:bg-foreground/20" />

      {/* Upgrade button */}
      <span className="pl-2 text-sm font-medium text-foreground/90 transition-colors group-hover:text-primary dark:group-hover:text-foreground">
        {t('upgrade')}
      </span>
    </Button>
  );
}
