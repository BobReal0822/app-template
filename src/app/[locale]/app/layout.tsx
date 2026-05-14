import type React from 'react';

import { redirect } from 'next/navigation';

import { UserDataProvider } from '@/contexts/user-data-context';
import { pathnameWithLocale, type Locale } from '@/i18n/routing';
import { getCurrentUser } from '@/lib/auth/server-session';
import { getOrCreateUserData } from '@/server/services/user-data';

import { ProfileDataLoadError } from './_components/profile-data-load-error';

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const currentUser = await getCurrentUser();
  const loginPath = pathnameWithLocale(locale, '/auth/login');

  if (!currentUser) {
    redirect(loginPath);
  }

  if (!currentUser.email_verified) {
    redirect(loginPath);
  }

  const userData = await getOrCreateUserData({
    uid: currentUser.uid,
    email: currentUser.email || null,
    emailVerified: currentUser.email_verified || false,
    displayName: currentUser.name || null,
    photoURL: currentUser.picture || null,
  });

  if (!userData) {
    console.error(
      'Failed to get or create user data for authenticated user:',
      currentUser.uid,
    );
    // Stay on /app with a recovery UI — redirecting to /auth/login while the
    // client is still signed in causes AuthRedirect to send the user back to
    // /app (redirect loop) when emulators are flaky.
    return <ProfileDataLoadError />;
  }

  return <UserDataProvider initialData={userData}>{children}</UserDataProvider>;
}
