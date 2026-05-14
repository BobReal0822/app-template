import { AnimatedSection } from '@/components/ui/animated-section';
import { Button } from '@/components/ui/button';

import { Link } from '@/i18n/routing';
import { ENTERPRISE_SALES_MAILTO_HREF } from '@/lib/billing/enterprise-sales-mailto';

interface PricingCtaSectionProps {
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel: string;
}

export function PricingCtaSection({
  title,
  description,
  primaryLabel,
  secondaryLabel,
}: PricingCtaSectionProps) {
  return (
    <section className="bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection animation="fadeUp">
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-primary px-8 py-14 text-center sm:px-16 sm:py-20">
            <div className="absolute right-0 top-0 h-40 w-40 translate-x-1/4 -translate-y-1/4 rounded-full bg-primary-foreground/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-40 w-40 -translate-x-1/4 translate-y-1/4 rounded-full bg-primary-foreground/10 blur-3xl" />

            <h2 className="relative text-balance text-3xl font-bold text-primary-foreground sm:text-4xl">
              {title}
            </h2>
            <p className="relative mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/85">
              {description}
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="h-12 rounded-full bg-primary-foreground px-8 font-semibold text-primary shadow-lg shadow-primary/25 transition-[background-color,box-shadow] hover:bg-primary-foreground/90 hover:shadow-xl hover:shadow-primary/30"
                asChild
              >
                <Link href="/auth/sign-up">{primaryLabel}</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 rounded-full border-primary-foreground/40 bg-transparent px-8 text-primary-foreground transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
                asChild
              >
                <a href={ENTERPRISE_SALES_MAILTO_HREF}>{secondaryLabel}</a>
              </Button>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
