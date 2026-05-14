import { getTranslations } from 'next-intl/server';

import { BrandLogo } from '@/components/brand/brand-logo';

import { Link, type Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { getCurrentYear } from '@/lib/utils/time';

const footerFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export async function Footer(props: { locale: string }) {
  const { locale: localeRaw } = props;
  const locale = localeRaw as Locale;
  const t = await getTranslations({ locale, namespace: 'marketingFooter' });
  const footerLinks = {
    [t('columns.resources')]: [
      { label: t('links.blog'), href: '/blog' },
      { label: t('links.pricing'), href: '/pricing' },
    ],
    [t('columns.company')]: [
      { label: t('links.about'), href: '/about' },
      { label: t('links.feedback'), href: '/feedback' },
    ],
  };

  const footerColumns = Object.entries(footerLinks);

  const columnHeadingClass =
    'mb-4 text-sm font-semibold text-background dark:text-foreground';

  const bodyLinkClass = cn(
    'text-sm text-background/60 transition-colors duration-200 ease-out hover:text-background dark:text-foreground/60 dark:hover:text-foreground',
    footerFocusRing,
    'inline-flex items-center rounded-sm px-0.5 py-0.5 -mx-0.5',
  );

  const legalLinkClass = cn(
    'text-sm text-background/50 transition-colors duration-200 ease-out hover:text-background dark:text-foreground/50 dark:hover:text-foreground',
    footerFocusRing,
    'inline-flex items-center rounded-sm px-0.5 py-1 -mx-0.5',
  );

  return (
    <footer className="bg-foreground text-background dark:bg-background dark:text-foreground">
      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <BrandLogo
              className={cn('rounded-sm', footerFocusRing)}
              src="/logo/logo-dark-v3.png"
            />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-background/60 dark:text-foreground/60">
              {t('description')}
            </p>
          </div>

          <nav
            aria-label={t('siteLinksNavLabel')}
            className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-3 lg:col-span-4 lg:col-start-3 lg:flex lg:justify-end lg:gap-16"
          >
            {footerColumns.map(([category, links]) => (
              <div key={category} className="min-w-40">
                <h3 className={columnHeadingClass}>{category}</h3>
                <ul className="flex flex-col gap-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        locale={locale}
                        className={bodyLinkClass}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-background/20 pt-8 dark:border-foreground/15 sm:flex-row sm:items-center">
          <p className="text-center text-sm text-background/50 dark:text-foreground/50 sm:text-start">
            {t('copyright', { year: getCurrentYear() })}
          </p>
          <nav
            aria-label={t('legalNavLabel')}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 sm:justify-end"
          >
            <Link href="/privacy" locale={locale} className={legalLinkClass}>
              {t('privacyPolicy')}
            </Link>
            <Link href="/terms" locale={locale} className={legalLinkClass}>
              {t('termsOfService')}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
