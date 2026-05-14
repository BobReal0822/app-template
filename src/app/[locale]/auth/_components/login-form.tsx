'use client';

import { useState } from 'react';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FeedbackAlert } from '@/components/app/feedback-alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

import { useAuth } from '@/contexts/auth-context';
import { useRouter, Link } from '@/i18n/routing';

import { PasswordInput } from './_share/password-input';
import { GoogleOAuthButton } from './google-oauth-button';

type PasswordCredentialInit = {
  id: string;
  password: string;
  name?: string;
};

const LOGIN_TIMEOUT_MS = 15_000;

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('request_timeout'));
      }, timeoutMs);
    });
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Chrome/Chromium often skip the built-in save prompt for SPA logins that call
 * `preventDefault()` and authenticate asynchronously. Storing a PasswordCredential
 * after a successful sign-in registers the login with the password manager.
 */
async function offerLoginCredentialSave(
  email: string,
  password: string,
): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }
  const PasswordCredentialCtor = (
    globalThis as typeof globalThis & {
      PasswordCredential?: new (data: PasswordCredentialInit) => Credential;
    }
  ).PasswordCredential;

  if (!PasswordCredentialCtor || !navigator.credentials?.store) {
    return;
  }

  try {
    await navigator.credentials.store(
      new PasswordCredentialCtor({
        id: email,
        password,
        name: email,
      }),
    );
  } catch (error) {
    // User dismissed, blocked by policy, or not supported in this browser.
    if (process.env.NODE_ENV === 'development') {
      console.warn('Password credential store skipped:', error);
    }
  }
}

export function LoginForm() {
  const { signIn, googleSignIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const router = useRouter();
  const t = useTranslations('auth.login');

  const onLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError(t('enterEmailPassword'));
      return;
    }

    // Prevent multiple simultaneous requests
    if (isLoading || isGoogleLoading) {
      return;
    }

    setIsLoading(true);
    // Don't clear error immediately to avoid flickering
    // Only update error when we get a new result

    try {
      const result = await withTimeout(
        signIn(normalizedEmail, password),
        LOGIN_TIMEOUT_MS,
      );

      if (!result.success) {
        console.error('Login error:', result.error);
        setError(t('loginFailed'));
        setIsLoading(false);
      } else {
        setError(null);
        await offerLoginCredentialSave(normalizedEmail, password);
        try {
          router.push('/app');
        } catch (navError) {
          console.error('Login navigation error:', navError);
          setError(t('loginFailed'));
          setIsLoading(false);
          return;
        }
        return;
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(t('loginFailed'));
      setIsLoading(false);
    }
  };

  const onGoogleLogin = async () => {
    // Prevent multiple simultaneous requests
    if (isGoogleLoading || isLoading) {
      return;
    }

    setIsGoogleLoading(true);
    // Don't clear error immediately to avoid flickering

    try {
      const result = await withTimeout(googleSignIn(), LOGIN_TIMEOUT_MS);

      if (!result.success) {
        console.error('Google login error:', result.error);
        setError(t('googleLoginError'));
        setIsGoogleLoading(false);
      } else {
        setError(null);
        // Google OAuth already handles the navigation via callbackURL.
        // Avoid an extra client-side push here, which can cause a brief
        // same-page refresh/flicker before landing on /app.
        return;
      }
    } catch (err) {
      console.error('Google login error:', err);
      setError(t('googleUnavailable'));
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t('mainTitle')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('loginCtaDescription')}
        </p>
      </div>

      {/* Google OAuth button */}
      <GoogleOAuthButton
        onClick={onGoogleLogin}
        loading={isGoogleLoading}
        disabled={isLoading}
        label={t('loginWithGoogle')}
      />

      <div className="relative my-6">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
          {t('orContinueWithEmail')}
        </span>
      </div>

      <form autoComplete="on" onSubmit={onLogin} className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="block text-sm font-medium">
            {t('email')}
          </Label>
          <Input
            id="email"
            name="username"
            type="email"
            placeholder={t('emailPlaceholder')}
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 px-4"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="block text-sm font-medium">
              {t('password')}
            </Label>
            <Link
              href="/auth/forgot-password"
              className="text-sm text-link transition-colors hover:text-link/80"
            >
              {t('forgotPassword')}
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            placeholder={t('passwordPlaceholder')}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            showLabel={t('ariaShowPassword')}
            hideLabel={t('ariaHidePassword')}
          />
        </div>

        {error && <FeedbackAlert description={error} />}

        <Button
          type="submit"
          className="h-11 w-full font-medium"
          disabled={isLoading || isGoogleLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('loggingIn')}
            </>
          ) : (
            t('login')
          )}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t('notHaveAccount')}{' '}
        <Link
          href="/auth/sign-up"
          className="font-semibold text-link transition-colors hover:text-link/80"
        >
          {t('signUpForFree')}
        </Link>
      </p>
    </div>
  );
}
