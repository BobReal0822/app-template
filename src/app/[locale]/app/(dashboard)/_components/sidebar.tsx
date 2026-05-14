'use client';

import { Home } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CreditsBadge } from '@/components/app/credits-badge';
import { BrandLogo } from '@/components/brand/brand-logo';
import { useErrorHandler } from '@/components/providers/error-handler-provider';

import { useUserData } from '@/hooks/use-user-data';
import { Link, usePathname } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const mainNavKeys = ['home'] as const;
const mainNavigation = [
  { key: mainNavKeys[0], href: '/app', icon: Home },
];

export function AppSidebar() {
  const t = useTranslations('appSidebar.nav');
  const pathname = usePathname();
  const { showUpgradeModal } = useErrorHandler();
  const { userData } = useUserData();

  const isActive = (href: string) => {
    if (href === '/app') return pathname === '/app';
    return pathname.startsWith(href);
  };

  if (!userData) return null;

  const profile = {
    credits: userData.credits,
    plan_tier: userData.planName,
  };

  return (
    <>
      <aside className="hidden w-[260px] shrink-0 bg-sidebar lg:flex lg:flex-col">
        {/* Logo */}
        <div className="flex h-[68px] items-center gap-2.5 px-5 ">
          <BrandLogo className="pl-1 opacity-90" width={71} height={24} />
        </div>
        {/* Navigation */}
        <nav className="flex flex-1 flex-col px-3 py-1 pb-6">
          <div className="mb-6">
            <ul className="space-y-1.5">
              {mainNavigation.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    prefetch
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-[background-color,color] duration-150',
                      isActive(item.href)
                        ? 'bg-white text-foreground dark:bg-sidebar-accent dark:text-sidebar-accent-foreground'
                        : 'text-muted-foreground hover:bg-white/90 hover:text-foreground dark:text-sidebar-foreground/70 dark:hover:bg-sidebar-accent dark:hover:text-sidebar-accent-foreground',
                    )}
                  >
                    <item.icon
                      className={cn(
                        'h-[18px] w-[18px]',
                        isActive(item.href)
                          ? 'text-foreground dark:text-sidebar-accent-foreground'
                          : 'text-muted-foreground dark:text-sidebar-foreground/70',
                      )}
                    />
                    {t(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto flex justify-center">
            <CreditsBadge
              credits={profile?.credits ?? 100}
              onUpgradeClick={showUpgradeModal}
            />
          </div>
        </nav>
      </aside>
    </>
  );
}
