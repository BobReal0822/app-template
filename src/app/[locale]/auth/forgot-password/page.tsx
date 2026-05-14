import { getTranslations } from 'next-intl/server';

import { ForgotPasswordForm } from '../_components/forgot-password/forgot-password-form';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.forgotPassword' });
  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
  };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
