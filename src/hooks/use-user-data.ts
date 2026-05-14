'use client';

import { useEffect, useState, useCallback } from 'react';

import { useTranslations } from 'next-intl';

import { useAuth, type AuthUser } from '@/contexts/auth-context';
import {
  useUserDataContext,
  UserDataProvider,
  type UserData,
} from '@/contexts/user-data-context';
import {
  planCodeFromDbPlanId,
  subscriptionBillingCycleFromDb,
} from '@/lib/billing/types';
import { getCurrentUserProfile, updateUserProfile } from '@/lib/user-profile';

/**
 * Hook to access user data.
 *
 * When rendered inside a `<UserDataProvider>` (e.g. the /app layout),
 * returns the context value directly — no extra client fetch.
 *
 * When rendered outside a provider (e.g. marketing pages),
 * falls back to a standalone client-side `/api` fetch.
 */
export function useUserData() {
  const ctxValue = useUserDataContext();
  // `enabled` is false when inside a UserDataProvider — hooks are still called
  // unconditionally, but all effects are skipped to avoid duplicate fetches.
  const standaloneValue = useUserDataStandalone(!ctxValue);

  return ctxValue ?? standaloneValue;
}

/**
 * Standalone fetcher used only when no UserDataProvider is in the tree.
 * All hooks are called unconditionally; `enabled=false` short-circuits the
 * effects so no auth subscription or profile fetch is issued when a
 * provider is already present in the tree.
 */
function useUserDataStandalone(enabled: boolean) {
  const t = useTranslations('userData.hooks');
  const [userData, setUserData] = useState<UserData | null | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const fetchUserData = useCallback(
    async (authUser: AuthUser) => {
      try {
        const data = await getCurrentUserProfile();

        if (!data) {
          // console.error('User data not found for uid:', user.uid);
          setError(t('profileNotFound'));
          setUserData(null);
          return;
        }

        const plan = planCodeFromDbPlanId(data.plan);
        const fullName =
          data.name ||
          authUser.name ||
          (authUser.email ? authUser.email.split('@')[0] : '') ||
          t('defaultDisplayName');
        setUserData({
          uid: data.uid,
          name: data.name || '',
          fullName,
          email: authUser.email || '',
          avatar: data.avatar || authUser.image || '',
          credits: data.credits ?? 0,
          plan,
          planName: plan,
          planCredits: data.planCredits ?? 0,
          planExpiredAt: data.planExpiredAt ?? null,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
          subscriptionBillingCycle: subscriptionBillingCycleFromDb(
            data.subscriptionBillingCycle,
          ),
        });
        setError(null);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError(t('profileLoadFailed'));
        setUserData(null);
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!enabled) return;
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!user) {
      setError(t('notSignedIn'));
      setLoading(false);
      setUserData(null);
      return;
    }

    void fetchUserData(user);
  }, [enabled, authLoading, user, fetchUserData, t]);

  const updateUserDataFn = useCallback(
    async (updates: Partial<Pick<UserData, 'name' | 'avatar'>>) => {
      if (!userData || !user) return false;

      try {
        await updateUserProfile({
          name: updates.name,
          avatar: updates.avatar,
        });

        setUserData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            name: updates.name ?? prev.name,
            avatar: updates.avatar ?? prev.avatar,
          };
        });

        return true;
      } catch (err) {
        console.error('Error updating user data:', err);
        return false;
      }
    },
    [userData, user],
  );

  const refetch = useCallback(() => {
    if (user) {
      setLoading(true);
      setError(null);
      fetchUserData(user);
    }
  }, [user, fetchUserData]);

  return {
    userData,
    loading,
    error,
    updateUserData: updateUserDataFn,
    refetch,
  };
}

// Re-export for convenience
export { UserDataProvider, type UserData };
