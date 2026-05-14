'use client';

import { useEffect, useRef, useState } from 'react';

import { Loader2 } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from '@/i18n/routing';

interface AuthRedirectProps {
  children: React.ReactNode;
}

/**
 * Client-side guard for the /auth/* routes:
 *
 *  - Shows a loader during the very first session check (so we don't flash
 *    the unauthenticated UI while better-auth resolves the cookie).
 *  - If the resolved session is already verified, redirects to /app.
 *  - Otherwise, renders {children} and KEEPS them mounted across every
 *    subsequent session refetch.
 *
 * Why "keep mounted" matters: better-auth's `useSession().isPending` flips
 * back to `true` on window focus, network reconnect, internal poll, and
 * after any fetch in the same tab. Re-rendering a Loader in place of
 * {children} on those flips would unmount the auth form (sign-up wizard,
 * password reset, etc.) and silently reset its local `useState` — which
 * surfaced as the sign-up wizard jumping back to the email step after
 * sending the OTP, or randomly resetting on the OTP step. We must only
 * unmount the form for the redirect case, never for transient loading.
 */
export function AuthRedirect({ children }: AuthRedirectProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [hasResolvedOnce, setHasResolvedOnce] = useState(false);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !hasResolvedOnce) {
      setHasResolvedOnce(true);
    }
  }, [authLoading, hasResolvedOnce]);

  useEffect(() => {
    if (!hasResolvedOnce || hasRedirectedRef.current) return;
    if (user?.emailVerified) {
      hasRedirectedRef.current = true;
      router.push('/app');
    }
  }, [hasResolvedOnce, user, router]);

  if (!hasResolvedOnce) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.emailVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
