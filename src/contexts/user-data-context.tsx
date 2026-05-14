'use client';

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useAuth, type AuthUser } from '@/contexts/auth-context';
import {
  planCodeFromDbPlanId,
  subscriptionBillingCycleFromDb,
  type BillingCycle,
  type PlanCode,
} from '@/lib/billing/types';
import { getCurrentUserProfile, updateUserProfile } from '@/lib/user-profile';

export type PlanType = PlanCode;

export interface UserData {
  uid: string;
  name: string;
  fullName: string;
  email: string;
  avatar: string;
  credits: number;
  plan: string;
  planName: PlanType;
  planCredits: number;
  planExpiredAt: string | null;
  /** Pending cancellation: Stripe `cancel_at_period_end` or `cancel_at` set (Clover) */
  cancelAtPeriodEnd: boolean;
  /** Stripe subscription interval when on a paid self-serve plan; null for free / unknown */
  subscriptionBillingCycle: BillingCycle | null;
}

interface UserDataContextValue {
  userData: UserData | null | undefined;
  loading: boolean;
  error: string | null;
  updateUserData: (
    updates: Partial<Pick<UserData, 'name' | 'avatar'>>,
  ) => Promise<boolean>;
  refetch: () => void;
}

const UserDataContext = createContext<UserDataContextValue | null>(null);

interface UserDataProviderProps {
  children: ReactNode;
  initialData?: UserData | null;
}

/**
 * Provides user data to the component tree.
 *
 * When `initialData` is supplied (e.g. from a server-rendered layout),
 * the provider skips the initial client-side profile fetch, avoiding a
 * redundant round-trip right after SSR.
 *
 * Components still call `refetch()` or `updateUserData()` for mutations;
 * those use the same `/api` profile helpers as the initial fetch.
 */
export function UserDataProvider({
  children,
  initialData,
}: UserDataProviderProps) {
  const [userData, setUserData] = useState<UserData | null | undefined>(
    initialData ?? undefined,
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const hasInitialData = useRef(!!initialData);

  const fetchUserData = useCallback(async (authUser: AuthUser) => {
    try {
      const data = await getCurrentUserProfile();

      if (!data) {
        console.error('User data not found for uid:', authUser.uid);
        setError('User data not found');
        setUserData(null);
        return;
      }

      const plan = planCodeFromDbPlanId(data.plan);
      const fullName =
        data.name ||
        authUser.name ||
        (authUser.email ? authUser.email.split('@')[0] : '') ||
        'User';
      setUserData({
        uid: data.uid,
        name: data.name || '',
        fullName,
        email: authUser.email || '',
        avatar: data.avatar || authUser.image || '',
        credits: data.credits || 0,
        plan,
        planName: plan,
        planCredits: data.planCredits || 0,
        planExpiredAt: data.planExpiredAt || null,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        subscriptionBillingCycle: subscriptionBillingCycleFromDb(
          data.subscriptionBillingCycle,
        ),
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Failed to fetch user data');
      setUserData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      setUserData(null);
      return;
    }

    // Keep SSR-provided profile on the very first client pass.
    // This skips one immediate client refetch when auth is already available.
    if (hasInitialData.current) {
      hasInitialData.current = false;
      setLoading(false);
      setError(null);
      return;
    }

    void fetchUserData(user);
  }, [authLoading, user, fetchUserData]);

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

  const value: UserDataContextValue = {
    userData,
    loading,
    error,
    updateUserData: updateUserDataFn,
    refetch,
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}

/**
 * Read user data from the nearest UserDataProvider.
 * Returns null when called outside a provider (e.g. marketing pages).
 */
export function useUserDataContext(): UserDataContextValue | null {
  return useContext(UserDataContext);
}
