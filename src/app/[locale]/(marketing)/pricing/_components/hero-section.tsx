import { AnimatedSection } from '@/components/ui/animated-section';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { cn } from '@/lib/utils';

interface PricingHeroSectionProps {
  titlePrefix: string;
  titleHighlight: string;
  description: string;
  monthlyLabel: string;
  yearlyLabel: string;
  isYearly: boolean;
  onToggleYearly: (isYearly: boolean) => void;
  yearlyDiscountPercent: number | null;
  isPricingLoading: boolean;
}

export function PricingHeroSection({
  titlePrefix,
  titleHighlight,
  description,
  monthlyLabel,
  yearlyLabel,
  isYearly,
  onToggleYearly,
  yearlyDiscountPercent,
  isPricingLoading,
}: PricingHeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-linear-to-b from-primary/5 via-background to-background pb-12 pt-20 sm:pb-16 sm:pt-28">
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection
          animation="fadeUp"
          className="mx-auto max-w-3xl text-center"
        >
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {titlePrefix} <span className="text-primary">{titleHighlight}</span>
          </h1>
          <p className="mt-6 text-pretty text-lg text-muted-foreground sm:text-xl">
            {description}
          </p>

          <div
            role="radiogroup"
            aria-label={`${monthlyLabel} / ${yearlyLabel}`}
            className="mt-10 inline-flex items-center rounded-full bg-muted p-1.5"
          >
            <Button
              variant="ghost"
              onClick={() => onToggleYearly(false)}
              role="radio"
              aria-checked={!isYearly}
              className={cn(
                'h-11 rounded-full px-6 py-2.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-300',
                !isYearly
                  ? 'bg-background text-foreground shadow-sm hover:bg-background'
                  : 'text-muted-foreground hover:bg-transparent hover:text-foreground',
              )}
            >
              {monthlyLabel}
            </Button>
            <Button
              variant="ghost"
              onClick={() => onToggleYearly(true)}
              role="radio"
              aria-checked={isYearly}
              className={cn(
                'h-11 rounded-full px-6 py-2.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-300',
                isYearly
                  ? 'bg-background text-foreground shadow-sm hover:bg-background'
                  : 'text-muted-foreground hover:bg-transparent hover:text-foreground',
              )}
            >
              {yearlyLabel}
              {isPricingLoading ? (
                <Skeleton className="ml-2 h-5 w-12 rounded-full" />
              ) : (
                typeof yearlyDiscountPercent === 'number' && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    -{yearlyDiscountPercent}%
                  </span>
                )
              )}
            </Button>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
