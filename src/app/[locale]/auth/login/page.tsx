import { getTranslations, setRequestLocale } from 'next-intl/server';

import { LoginForm } from '../_components/login-form';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.login' });
  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
  };
}

export default async function LoginPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  setRequestLocale(locale);
  return <LoginForm />;
}
