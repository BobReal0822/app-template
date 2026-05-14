'use client';

import { type LucideIcon } from 'lucide-react';
import Image from 'next/image';

import { DarkImageOverlay } from '@/components/dark-image-overlay';
import { AnimatedSection } from '@/components/ui/animated-section';
import { StaggerChildren, StaggerItem } from '@/components/ui/stagger-children';

import { cn } from '@/lib/utils';

interface FeatureCardItem {
  key: string;
  title: string;
  description: string;
  image: string;
  icon: LucideIcon;
}

interface FeatureCardsSectionProps {
  heading: string;
  subheading: string;
  items: FeatureCardItem[];
  sectionClassName?: string;
  gridClassName?: string;
  cardVariant?: 'bordered' | 'elevated';
}

export function FeatureCardsSection({
  heading,
  subheading,
  items,
  sectionClassName,
  gridClassName,
  cardVariant = 'bordered',
}: FeatureCardsSectionProps) {
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

        <StaggerChildren
          className={cn(
            'mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3',
            gridClassName,
          )}
          staggerDelay={100}
        >
          {items.map((item) => (
            <StaggerItem key={item.key}>
              <div
                className={cn(
                  'group flex h-full flex-col overflow-hidden rounded-2xl transition-[border-color,box-shadow,translate]',
                  cardVariant === 'bordered'
                    ? 'border border-border bg-card hover:border-primary/50 hover:shadow-lg dark:hover:shadow-black/35'
                    : 'bg-card shadow-sm shadow-foreground/5 duration-300 hover:-translate-y-1 hover:shadow-lg dark:shadow-black/25 dark:hover:shadow-black/40',
                )}
              >
                <div className="relative aspect-4/3 w-full shrink-0 overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-[scale] duration-500 group-hover:scale-110"
                  />
                  <DarkImageOverlay />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {item.title}
                    </h3>
                  </div>
                  <p className="min-h-12 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
