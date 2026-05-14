'use client';

import { Shield, Award, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AnimatedSection } from '@/components/ui/animated-section';
import { Button } from '@/components/ui/button';
import { StaggerChildren } from '@/components/ui/stagger-children';

import { Link } from '@/i18n/routing';

const logos = [
  {
    name: 'Shopify',
    svg: (
      <svg viewBox="0 0 109 40" className="h-6 sm:h-7" fill="currentColor">
        <path d="M25.9 8.8c0-.2-.2-.3-.3-.3s-.3 0-.5.1l-2.1.6c-.2-.7-.6-1.4-1.1-2-.7-.8-1.6-1.2-2.7-1.2h-.3c-.4-.5-.9-.7-1.3-.7-3.2 0-4.8 4-5.3 6-.4.1-.7.2-1.1.3-.7.2-.7.2-.8.9-.1.5-1.8 13.8-1.8 13.8l13.5 2.5 7.3-1.6S26 9 25.9 8.8z" />
      </svg>
    ),
  },
  {
    name: 'Amazon',
    svg: (
      <svg viewBox="0 0 120 36" className="h-5 sm:h-6" fill="currentColor">
        <path d="M74.5 28.5c-6.9 5.1-16.9 7.8-25.5 7.8-12.1 0-22.9-4.5-31.1-11.9-.6-.6-.1-1.4.7-.9 8.9 5.2 19.8 8.3 31.1 8.3 7.6 0 16-1.6 23.8-4.9 1.2-.5 2.2.8 1 1.6z" />
        <path d="M77.1 25.5c-.9-1.1-5.8-.5-8.1-.3-.7.1-.8-.5-.2-.9 3.9-2.8 10.4-2 11.1-1 .7.9-.2 7.4-3.9 10.5-.6.5-1.1.2-.9-.4.8-2.1 2.9-6.8 2-7.9z" />
      </svg>
    ),
  },
  {
    name: 'Stripe',
    svg: (
      <svg viewBox="0 0 60 25" className="h-6 sm:h-7" fill="currentColor">
        <path d="M5 10.2c0-.7.6-1 1.5-1 1.3 0 3 .4 4.3 1.1V6.5c-1.4-.6-2.9-.8-4.3-.8C3.2 5.7.5 7.7.5 11c0 5.1 7 4.3 7 6.5 0 .8-.7 1.1-1.7 1.1-1.5 0-3.4-.6-4.9-1.4v3.8c1.7.7 3.3 1 4.9 1 3.4 0 5.7-1.7 5.7-5 0-5.5-7-4.5-7-6.8z" />
      </svg>
    ),
  },
  {
    name: 'Slack',
    svg: (
      <svg viewBox="0 0 54 54" className="h-6 sm:h-7" fill="currentColor">
        <path d="M11.4 31c0 3.1-2.5 5.7-5.7 5.7S0 34.1 0 31s2.5-5.7 5.7-5.7h5.7V31zm2.8 0c0-3.1 2.5-5.7 5.7-5.7s5.7 2.5 5.7 5.7v14.2c0 3.1-2.5 5.7-5.7 5.7s-5.7-2.5-5.7-5.7V31z" />
        <path d="M19.9 11.4c-3.1 0-5.7-2.5-5.7-5.7S16.8 0 19.9 0s5.7 2.5 5.7 5.7v5.7h-5.7zm0 2.8c3.1 0 5.7 2.5 5.7 5.7s-2.5 5.7-5.7 5.7-5.7-2.5-5.7-5.7 2.5-5.7 5.7-5.7z" />
      </svg>
    ),
  },
  {
    name: 'Zoom',
    svg: (
      <svg viewBox="0 0 100 23" className="h-4 sm:h-5" fill="currentColor">
        <path d="M24.1 8.3c4 0 7.3 3.3 7.3 7.3s-3.3 7.3-7.3 7.3-7.3-3.3-7.3-7.3 3.3-7.3 7.3-7.3zm0 11.4c2.3 0 4.1-1.8 4.1-4.1s-1.8-4.1-4.1-4.1-4.1 1.8-4.1 4.1 1.8 4.1 4.1 4.1z" />
        <path d="M39.4 8.3c4 0 7.3 3.3 7.3 7.3s-3.3 7.3-7.3 7.3-7.3-3.3-7.3-7.3 3.3-7.3 7.3-7.3zm0 11.4c2.3 0 4.1-1.8 4.1-4.1s-1.8-4.1-4.1-4.1-4.1 1.8-4.1 4.1 1.8 4.1 4.1 4.1z" />
        <path d="M8.1 5.5v9.5c0 3.5 4.7 2.2 4.7 2.2v3.1s-7.2 1.7-7.9-4.4V5.5H2.8V2.4h2.1V-.5l3.2-1v3.9h4.7v3.1H8.1z" />
      </svg>
    ),
  },
  {
    name: 'HubSpot',
    svg: (
      <svg viewBox="0 0 100 28" className="h-5 sm:h-6" fill="currentColor">
        <path d="M12 5.8v7.9h7.8V5.8h2.8v20h-2.8v-9.4H12v9.4H9.2V5.8H12z" />
        <path d="M30.6 21.1c0 1.2-.4 2.2-1.2 2.9-.8.7-1.8 1.1-3.1 1.1-.9 0-1.7-.2-2.4-.5s-1.2-.8-1.6-1.4l2-1.4c.4.7 1.1 1 2 1 .6 0 1-.1 1.3-.4.3-.3.5-.6.5-1.1v-9.4h2.5v9.2z" />
      </svg>
    ),
  },
];

export function TrustSection() {
  const t = useTranslations('home');
  const trustPoints = [
    {
      icon: Users,
      title: t('trust.point1Title'),
      description: t('trust.point1Description'),
      link: `${t('trust.point1Link')} →`,
      linkHref: '#features',
    },
    {
      icon: Shield,
      title: t('trust.point2Title'),
      description: t('trust.point2Description'),
      link: `${t('trust.point2Link')} →`,
      linkHref: '#security',
    },
    {
      icon: Award,
      title: t('trust.point3Title'),
      description: t('trust.point3Description'),
      link: `${t('trust.point3Link')} →`,
      linkHref: '#pricing',
    },
  ];

  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <AnimatedSection animation="fadeUp" className="text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {t('trust.eyebrow')}
          </p>
          <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t('trust.titleLine1')} <br className="hidden sm:block" />
            {t('trust.titleLine2')}
          </h2>
        </AnimatedSection>

        {/* Trust Points */}
        <StaggerChildren
          className="mt-12 grid gap-8 md:grid-cols-3"
          staggerDelay={150}
          animation="scaleUp"
        >
          {trustPoints.map((point) => (
            <div
              key={point.title}
              className="group rounded-2xl bg-card p-6 shadow-sm shadow-black/5 transition-[box-shadow,translate] duration-300 hover:shadow-lg hover:-translate-y-1 dark:shadow-black/25 dark:hover:shadow-black/40"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-[scale] group-hover:scale-110">
                <point.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {point.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {point.description}
              </p>
              <Button
                variant="link"
                className="mt-4 h-auto p-0 text-primary transition-[translate] group-hover:translate-x-1"
                asChild
              >
                <Link href={point.linkHref}>{point.link}</Link>
              </Button>
            </div>
          ))}
        </StaggerChildren>

        {/* Logo Bar */}
        <AnimatedSection animation="fadeIn" delay={300}>
          <div className="mt-16 pt-12">
            <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground/60 sm:gap-12">
              {logos.map((logo, index) => (
                <div
                  key={logo.name}
                  className="flex items-center justify-center transition-[color,scale] duration-300 hover:text-muted-foreground hover:scale-110"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {logo.svg}
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
