import type React from 'react';

import { Footer } from '@/components/marketing/footer';
import { Navbar } from '@/components/marketing/navbar';

import type { Locale } from '@/i18n/routing';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function MarketingLayout({ children, params }: Props) {
  const { locale } = await params;
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer locale={locale} />
    </div>
  );
}
