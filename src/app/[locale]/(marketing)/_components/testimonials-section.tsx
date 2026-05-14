'use client';

import { Star } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { DarkImageOverlay } from '@/components/dark-image-overlay';
import { AnimatedSection } from '@/components/ui/animated-section';
import { StaggerChildren } from '@/components/ui/stagger-children';

export function TestimonialsSection() {
  const t = useTranslations('home');
  const testimonials = [
    {
      quote: t('comments.comment1Comment'),
      author: t('comments.comment1Author'),
      role: t('comments.comment1Role'),
      image:
        'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=500&fit=crop&q=80',
    },
    {
      quote: t('comments.comment2Comment'),
      author: t('comments.comment2Author'),
      role: t('comments.comment2Role'),
      image:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=500&fit=crop&q=80',
    },
    {
      quote: t('comments.comment3Comment'),
      author: t('comments.comment3Author'),
      role: t('comments.comment3Role'),
      image:
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=500&fit=crop&q=80',
    },
  ];

  return (
    <section id="reviews" className="scroll-mt-24 bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection animation="fadeUp" className="text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {t('comments.title')}
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t('comments.description')}
          </h2>
        </AnimatedSection>

        <StaggerChildren
          className="mt-12 grid gap-6 md:grid-cols-3"
          staggerDelay={150}
          animation="scaleUp"
        >
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.author}
              className="group relative overflow-hidden rounded-2xl bg-muted"
            >
              <div className="relative aspect-4/5">
                <Image
                  src={testimonial.image || '/placeholder.webp'}
                  alt={testimonial.author}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-[scale] duration-500 group-hover:scale-105"
                />
                <DarkImageOverlay />
              </div>

              {/* Quote Card */}
              <div className="absolute bottom-4 left-4 right-4 min-w-0 rounded-xl border border-border/70 bg-card/95 p-4 shadow-lg transition-[box-shadow,translate] duration-300 group-hover:-translate-y-1 group-hover:shadow-xl dark:shadow-black/30 dark:group-hover:shadow-black/45">
                <p className="wrap-break-word text-sm font-medium text-foreground">
                  &quot;{testimonial.quote}&quot;
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {testimonial.author}, {testimonial.role}
                </p>
              </div>
            </div>
          ))}
        </StaggerChildren>

        {/* Reviews Badge */}
        <AnimatedSection
          animation="fadeUp"
          delay={300}
          className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8"
        >
          <div className="flex items-center gap-2">
            <div className="flex" aria-hidden>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-5 w-5 fill-rating text-rating" />
              ))}
            </div>
            <span className="text-sm font-medium text-foreground">
              {t('comments.reviewsBadge')}
            </span>
          </div>
          <a
            href="#reviews"
            className="text-sm font-medium text-primary hover:underline transition-colors"
          >
            {t('comments.readReviews')} →
          </a>
        </AnimatedSection>
      </div>
    </section>
  );
}
