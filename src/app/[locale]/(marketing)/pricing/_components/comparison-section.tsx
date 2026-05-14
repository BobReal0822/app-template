import { Check } from 'lucide-react';

import { AnimatedSection } from '@/components/ui/animated-section';

import type { ComparisonFeature } from './types';

interface PricingComparisonSectionProps {
  title: string;
  subtitle: string;
  columns: {
    features: string;
    free: string;
    starter: string;
    pro_s: string;
    enterprise: string;
  };
  features: ComparisonFeature[];
}

export function PricingComparisonSection({
  title,
  subtitle,
  columns,
  features,
}: PricingComparisonSectionProps) {
  return (
    <section className="bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection animation="fadeUp" className="text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            {subtitle}
          </p>
        </AnimatedSection>

        <AnimatedSection
          animation="fadeUp"
          delay={200}
          className="mt-12 overflow-x-auto rounded-2xl bg-muted/35"
        >
          <table className="w-full min-w-[700px] table-fixed border-collapse">
            <caption className="sr-only">{title}</caption>
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr className="bg-muted/35">
                <th className="px-3 py-4 text-left text-sm font-medium text-muted-foreground sm:px-4">
                  {columns.features}
                </th>
                <th className="px-2 py-4 text-center text-sm font-medium text-muted-foreground">
                  {columns.free}
                </th>
                <th className="px-2 py-4 text-center text-sm font-medium text-muted-foreground">
                  {columns.starter}
                </th>
                <th className="px-2 py-4 text-center text-sm font-semibold text-primary">
                  {columns.pro_s}
                </th>
                <th className="px-2 py-4 text-center text-sm font-medium text-muted-foreground">
                  {columns.enterprise}
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature) => (
                <tr
                  key={String(feature.name)}
                  className="transition-colors hover:bg-muted/25"
                >
                  <td className="px-3 py-4 text-sm text-foreground sm:px-4">
                    {feature.name}
                  </td>
                  <td className="px-2 py-4 text-center">
                    {typeof feature.free === 'boolean' ? (
                      feature.free ? (
                        <Check className="mx-auto h-5 w-5 text-primary" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {feature.free}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-4 text-center">
                    {typeof feature.starter === 'boolean' ? (
                      feature.starter ? (
                        <Check className="mx-auto h-5 w-5 text-primary" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {feature.starter}
                      </span>
                    )}
                  </td>
                  <td className="bg-primary/5 px-2 py-4 text-center">
                    {typeof feature.pro_s === 'boolean' ? (
                      feature.pro_s ? (
                        <Check className="mx-auto h-5 w-5 text-primary" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    ) : (
                      <span className="text-sm font-medium text-foreground">
                        {feature.pro_s}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-4 text-center">
                    {typeof feature.enterprise === 'boolean' ? (
                      feature.enterprise ? (
                        <Check className="mx-auto h-5 w-5 text-primary" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {feature.enterprise}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AnimatedSection>
      </div>
    </section>
  );
}
