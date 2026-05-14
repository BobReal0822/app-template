import { headers } from 'next/headers';

import { auth } from './server';

export interface ServerAuthUser {
  uid: string;
  email: string | null;
  email_verified: boolean;
  name: string | null;
  picture: string | null;
}

export async function getCurrentUser(): Promise<ServerAuthUser | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return null;
  }

  return {
    uid: session.user.id,
    email: session.user.email ?? null,
    email_verified: Boolean(session.user.emailVerified),
    name: session.user.name ?? null,
    picture: session.user.image ?? null,
  };
}
