'use client';

import { useId, useState } from 'react';

import { ChevronDown } from 'lucide-react';

import { AnimatedSection } from '@/components/ui/animated-section';
import { Button } from '@/components/ui/button';
import { StaggerChildren } from '@/components/ui/stagger-children';

import { cn } from '@/lib/utils';

interface FaqItem {
  key: string;
  question: string;
  answer: string;
}

interface FaqSectionProps {
  heading: string;
  subheading: string;
  items: FaqItem[];
  sectionClassName?: string;
}

export function FaqSection({
  heading,
  subheading,
  items,
  sectionClassName,
}: FaqSectionProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const idPrefix = useId();

  return (
    <section className={cn('py-20 sm:py-28', sectionClassName)}>
      <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection animation="fadeUp" className="text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            {heading}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{subheading}</p>
        </AnimatedSection>

        <StaggerChildren
          className="mt-12 space-y-3"
          staggerDelay={100}
          animation="fadeUp"
        >
          {items.map((item, index) => {
            const triggerId = `${idPrefix}-faq-trigger-${index}`;
            const panelId = `${idPrefix}-faq-panel-${index}`;
            const isOpen = openFaq === index;
            return (
              <div
                key={item.key}
                className="overflow-hidden rounded-xl bg-background transition-colors duration-300 hover:bg-background/80"
              >
                <Button
                  id={triggerId}
                  type="button"
                  variant="ghost"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex h-auto w-full items-center justify-between px-6 py-5 text-left hover:bg-transparent"
                >
                  <span className="pr-4 text-base font-medium text-foreground">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-5 w-5 shrink-0 text-muted-foreground transition-[rotate] duration-300',
                      isOpen && 'rotate-180 text-primary',
                    )}
                    aria-hidden
                  />
                </Button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  aria-hidden={!isOpen}
                  className={cn(
                    'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
                    isOpen
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0',
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 leading-relaxed text-muted-foreground">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </StaggerChildren>
      </div>
    </section>
  );
}
