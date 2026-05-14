import { CSSProperties, ReactNode } from 'react';

import { GoogleAnalytics } from '@next/third-parties/google';
import { Theme } from '@radix-ui/themes';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Geist, Geist_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server';

import { SkipToMainLink } from '@/components/layout/skip-to-main-link';
import { QueryClientProviderWrapper } from '@/components/providers/query-client-provider';
import { Toaster } from '@/components/ui/sonner';

import { AuthProvider } from '@/contexts/auth-context';
import { ThemeProvider } from '@/contexts/theme-context';
import type { Locale } from '@/i18n/routing';
import { routing } from '@/i18n/routing';
import {
  getSiteOrigin,
  isPreviewEnv,
  isVercelPreviewOrDevRuntime,
  isVercelProductionEnv,
} from '@/lib/site-url';

import type { Metadata, Viewport } from 'next';

import '@radix-ui/themes/styles.css';
import '@/styles/default-loading.scss';
import '@/styles/global.css';

const BRAND_NAME = 'App Template';

const BRAND_SAME_AS: readonly string[] = [];

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

const themeFontStyle = {
  '--default-font-family': 'var(--font-sans)',
} as CSSProperties;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fdfdfd' },
    { media: '(prefers-color-scheme: dark)', color: '#05070b' },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const siteOrigin = getSiteOrigin();
  const isZh = locale.toLowerCase().startsWith('zh');
  const t = await getTranslations({ locale, namespace: 'rootMeta' });

  const title = t('title');
  const description = t('description');
  const posterAlt = t('posterAlt');
  const ogLocale = isZh ? 'zh_CN' : 'en_US';
  const localePath = isZh ? '/zh/' : '/';
  const pageUrl = `${siteOrigin}${localePath}`;

  const isPreview = isPreviewEnv();

  return {
    metadataBase: new URL(`${siteOrigin}/`),
    title: {
      default: isPreview ? `[PREVIEW] ${title}` : title,
      template: isPreview ? '[PREVIEW] %s | App Template' : '%s | App Template',
    },
    description,
    ...(isPreview && {
      robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
          index: false,
          follow: false,
          noimageindex: true,
        },
      },
    }),
    alternates: {
      canonical: localePath,
      languages: {
        en: '/',
        zh: '/zh',
        'x-default': '/',
      },
    },
    openGraph: {
      type: 'website',
      url: pageUrl,
      title,
      description,
      siteName: 'App Template',
      locale: ogLocale,
      images: [
        {
          url: '/share/og/home-v2.png',
          width: 1200,
          height: 630,
          alt: posterAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [
        {
          url: '/share/og/home-v2.png',
          width: 1200,
          height: 630,
          alt: posterAlt,
        },
      ],
    },
    icons: {
      shortcut: [{ url: '/favicon.ico' }],
    },
  };
}

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  const isPreview = isPreviewEnv();
  const isVercelProduction = isVercelProductionEnv();
  const isZh = locale.toLowerCase().startsWith('zh');
  const siteOrigin = getSiteOrigin();
  const t = await getTranslations({ locale, namespace: 'rootMeta' });
  const brandDescription = t('description');

  const allowVercelLiveToolbar = isVercelPreviewOrDevRuntime();

  const frameSrc = [
    'https://accounts.google.com/gsi/',
    ...(allowVercelLiveToolbar ? ['https://vercel.live'] : []),
  ].join(' ');

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND_NAME,
    url: siteOrigin,
    logo: `${siteOrigin}/logo/logo-light-v3.png`,
    description: brandDescription,
    ...(BRAND_SAME_AS.length > 0 ? { sameAs: BRAND_SAME_AS } : {}),
  };
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND_NAME,
    url: siteOrigin,
    inLanguage: isZh ? 'zh-CN' : 'en-US',
    publisher: {
      '@type': 'Organization',
      name: BRAND_NAME,
      url: siteOrigin,
    },
  };

  return (
    <html
      className={`h-full ${geistSans.variable} ${geistMono.variable}`}
      lang={locale}
    >
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content={`frame-src ${frameSrc};`}
        />
        {isPreview && <meta name="robots" content="noindex, nofollow" />}
        {!isPreview && (
          <>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
            />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(websiteJsonLd),
              }}
            />
          </>
        )}
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Theme className="font-sans" style={themeFontStyle}>
            <QueryClientProviderWrapper>
              <AuthProvider>
                <NextIntlClientProvider locale={locale} messages={messages}>
                  <SkipToMainLink />
                  {children}
                  <Toaster position="top-right" duration={2000} />
                </NextIntlClientProvider>
              </AuthProvider>
            </QueryClientProviderWrapper>
          </Theme>
        </ThemeProvider>
        {isVercelProduction && <SpeedInsights />}
        {isVercelProduction && <Analytics />}
        {isVercelProduction && <GoogleAnalytics gaId="G-NDQJVB7Z77" />}
      </body>
    </html>
  );
}
