'use client';

import { AnimatedSection } from '@/components/ui/animated-section';
import { Button } from '@/components/ui/button';

import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

interface CtaSectionProps {
  heading: string;
  subheading: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  sectionClassName?: string;
}

export function CtaSection({
  heading,
  subheading,
  primaryCtaLabel,
  primaryCtaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  sectionClassName,
}: CtaSectionProps) {
  return (
    <section className={cn('py-20 sm:py-28', sectionClassName)}>
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection animation="fadeUp">
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-primary px-8 py-16 text-center sm:px-16 sm:py-20">
            <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">
              {heading}
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/80">
              {subheading}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="h-14 cursor-pointer rounded-full bg-primary-foreground px-10 text-lg font-semibold text-primary shadow-lg transition-[background-color,box-shadow,scale] hover:scale-105 hover:bg-primary-foreground/90 hover:shadow-xl"
                asChild
              >
                <Link href={primaryCtaHref}>{primaryCtaLabel}</Link>
              </Button>
              <Button
                size="lg"
                className="h-14 cursor-pointer rounded-full border-2 border-primary-foreground/30 bg-transparent px-10 text-lg font-semibold text-primary-foreground transition-[background-color,color] hover:bg-primary-foreground/10 hover:text-primary-foreground"
                asChild
              >
                <Link href={secondaryCtaHref}>{secondaryCtaLabel}</Link>
              </Button>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
