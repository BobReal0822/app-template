export interface UserProfile {
  uid: string;
  name: string;
  avatar: string;
  credits: number;
  plan: string;
  planCredits: number;
  planExpiredAt: string | null;
  cancelAtPeriodEnd: boolean;
  subscriptionBillingCycle: string | null;
}

async function requestJson<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

/**
 * Fetch the currently-authenticated user's business profile.
 *
 * Identity is resolved from the better-auth session cookie on the server
 * (`requireAuth` in `src/app/api/user/profile/route.ts`); no `uid` argument
 * is forwarded — passing one would be ignored, and would needlessly bust
 * any URL-keyed HTTP caches.
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const payload = await requestJson<{
    code: number;
    message: string;
    data: { user: UserProfile | null };
  }>('/api/user/profile');
  return payload.data.user;
}

export async function updateUserProfile(input: {
  name?: string;
  avatar?: string;
}): Promise<void> {
  await requestJson<{ code: number; message: string; data: null }>(
    '/api/user/profile',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}
