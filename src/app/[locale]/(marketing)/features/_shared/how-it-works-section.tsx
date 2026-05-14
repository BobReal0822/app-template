'use client';

import { useState, type ReactNode } from 'react';

import { type LucideIcon } from 'lucide-react';
import Image from 'next/image';

import { DarkImageOverlay } from '@/components/dark-image-overlay';
import { AnimatedSection } from '@/components/ui/animated-section';
import { StaggerChildren, StaggerItem } from '@/components/ui/stagger-children';

import { cn } from '@/lib/utils';

interface HowItWorksStep {
  number: number;
  title: string;
  description: string;
  icon: LucideIcon;
  /**
   * Preferred: a fully composed React visual (UI shell + AI-generated content).
   * When provided, it fills the entire visual area of the active step.
   */
  visual?: ReactNode;
  /** Optional flat image when `visual` is omitted. */
  image?: string;
}

interface HowItWorksSectionProps {
  heading: string;
  subheading: string;
  steps: HowItWorksStep[];
  getStepLabel: (number: number) => string;
  sectionClassName?: string;
}

export function HowItWorksSection({
  heading,
  subheading,
  steps,
  getStepLabel,
  sectionClassName,
}: HowItWorksSectionProps) {
  const [activeStep, setActiveStep] = useState(0);
  const currentStep = steps[activeStep];

  return (
    <section className={cn('py-20 sm:py-28', sectionClassName)}>
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection animation="fadeUp">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {heading}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">{subheading}</p>
          </div>
        </AnimatedSection>

        <div className="mt-16 grid gap-8 lg:grid-cols-[1.45fr_1fr] lg:items-stretch">
          <AnimatedSection animation="scaleUp">
            <div
              className={cn(
                'relative h-full',
                currentStep.visual
                  ? // Lighter than drop-shadow-lg (BrowserFrame already has a shadow); dark: halo so lift reads on near-black
                    'drop-shadow-[0_10px_28px_rgb(0_0_0/0.06)] dark:drop-shadow-none dark:filter-[drop-shadow(0_14px_40px_rgb(0_0_0/0.55))_drop-shadow(0_0_24px_rgb(255_255_255/0.05))]'
                  : 'overflow-hidden rounded-2xl bg-card shadow-lg shadow-foreground/5 dark:shadow-black/30',
              )}
            >
              <div className="relative aspect-16/10 lg:aspect-auto lg:min-h-[460px]">
                {currentStep.visual ? (
                  <div key={activeStep} className="absolute inset-0">
                    {currentStep.visual}
                  </div>
                ) : currentStep.image ? (
                  <>
                    <Image
                      src={currentStep.image}
                      alt={currentStep.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      className="object-cover transition-opacity duration-300"
                    />
                    <DarkImageOverlay />
                  </>
                ) : null}
              </div>
            </div>
          </AnimatedSection>

          <StaggerChildren className="space-y-3" staggerDelay={100}>
            {steps.map((step, index) => (
              <StaggerItem key={step.number}>
                <button
                  type="button"
                  onClick={() => setActiveStep(index)}
                  className={cn(
                    'w-full rounded-xl border bg-card px-5 py-4 text-left transition-[border-color,background-color,box-shadow]',
                    activeStep === index
                      ? 'border-primary/40 bg-primary/5 shadow-md shadow-primary/10'
                      : 'border-transparent hover:border-primary/40 hover:bg-card/80 dark:hover:shadow-black/25',
                  )}
                >
                  <p
                    className={cn(
                      'text-xs font-semibold uppercase tracking-wide',
                      activeStep === index
                        ? 'text-primary'
                        : 'text-muted-foreground',
                    )}
                  >
                    {getStepLabel(step.number)}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <step.icon
                      className={cn(
                        'h-4 w-4',
                        activeStep === index
                          ? 'text-primary'
                          : 'text-muted-foreground',
                      )}
                    />
                    <h3 className="text-2xl font-semibold text-foreground">
                      {step.title}
                    </h3>
                  </div>
                  <p className="mt-2 min-h-12 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                    {step.description}
                  </p>
                </button>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </div>
    </section>
  );
}
