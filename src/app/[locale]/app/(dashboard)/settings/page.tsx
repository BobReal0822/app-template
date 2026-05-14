import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n/routing';

import { SettingsPageContent } from './_components/settings-page-content';


interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: SettingsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'account.settingsPage',
  });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default function SettingsPage() {
  return <SettingsPageContent />;
}
