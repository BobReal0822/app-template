'use client';

import { startTransition, useEffect, useMemo, useState } from 'react';

import { Crown, User } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { usePathname, useRouter } from '@/i18n/routing';

import { ProfileInfoTab } from './profile-info-tab';
import { SubscriptionInfoTab } from './subscription-info-tab';

const TAB_VALUES = ['profile', 'subscription'] as const;
type SettingsTab = (typeof TAB_VALUES)[number];
const DEFAULT_TAB: SettingsTab = 'profile';

function isSettingsTab(value: string): value is SettingsTab {
  return TAB_VALUES.includes(value as SettingsTab);
}

export function SettingsPageContent() {
  const t = useTranslations('account.settingsPage');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabFromUrl: SettingsTab = useMemo(() => {
    const tab = searchParams.get('tab');
    if (tab && isSettingsTab(tab)) {
      return tab;
    }
    return DEFAULT_TAB;
  }, [searchParams]);

  // Tab is URL-driven for deep links / Stripe return, but `router.replace` in
  // production waits on an RSC round-trip — keep controlled Tabs in sync with
  // clicks immediately, then let the URL catch up.
  const [optimisticTab, setOptimisticTab] = useState<SettingsTab | null>(null);
  useEffect(() => {
    setOptimisticTab(null);
  }, [tabFromUrl]);

  const currentTab = optimisticTab ?? tabFromUrl;

  const handleTabChange = (nextTab: string) => {
    if (!isSettingsTab(nextTab)) {
      return;
    }
    if (nextTab === currentTab) {
      return;
    }

    setOptimisticTab(nextTab);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('tab', nextTab);
    startTransition(() => {
      router.replace(`${pathname}?${nextParams.toString()}`);
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <Tabs
        value={currentTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <TabsList
          aria-label={t('title')}
          className="grid h-auto w-full grid-cols-2 rounded-xl bg-muted/70 p-1"
        >
          <TabsTrigger
            value="profile"
            className="cursor-pointer gap-2 rounded-lg py-2 data-[state=active]:bg-background"
          >
            <User className="h-4 w-4" aria-hidden />
            {t('tabs.profile')}
          </TabsTrigger>
          <TabsTrigger
            value="subscription"
            className="cursor-pointer gap-2 rounded-lg py-2 data-[state=active]:bg-background"
          >
            <Crown className="h-4 w-4" aria-hidden />
            {t('tabs.subscription')}
          </TabsTrigger>
          {/* TODO(mvp): Re-enable notifications tab after feature is ready. */}
          {/* <TabsTrigger
            value="notifications"
            className="cursor-pointer rounded-lg data-[state=active]:bg-background"
          >
            <Bell className="mr-2 h-4 w-4" />
            {t('tabs.notifications')}
          </TabsTrigger> */}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <ProfileInfoTab />
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          <SubscriptionInfoTab />
        </TabsContent>

        {/* TODO(mvp): Re-enable notifications panel after feature is ready. */}
        {/* <TabsContent value="notifications" className="space-y-6">
          <NotificationsTab />
        </TabsContent> */}
      </Tabs>
    </div>
  );
}
