import { getTranslations } from 'next-intl/server';

import { SettingsPageContent } from './_components/settings-page-content';

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: SettingsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: 'account.settingsPage',
  });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default function SettingsPage() {
  return <SettingsPageContent />;
}
