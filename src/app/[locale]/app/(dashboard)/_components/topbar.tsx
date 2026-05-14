'use client';

import { useEffect, useState } from 'react';

import {
  Menu,
  LogOut,
  UserIcon,
  CreditCard,
  Check,
  ChevronDown,
  Globe,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

import {
  formatTopbarUserIdentity,
  TOPBAR_MENU_ITEM_DESTRUCTIVE_CLASSNAME,
  TOPBAR_MENU_ITEM_INTERACTIVE_CLASSNAME,
} from '@/components/app/topbar-shared';
import { BrandLogo } from '@/components/brand/brand-logo';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { ImageWithSkeleton } from '@/components/ui/image-with-skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import { useAuth } from '@/contexts/auth-context';
import { useUserData } from '@/hooks/use-user-data';
import type { Locale } from '@/i18n/routing';
import { useRouter, usePathname, Link } from '@/i18n/routing';
import { getSubscriptionPlanDisplayParts } from '@/lib/billing/plan-subscription-info-name-keys';
import { planTierIcon } from '@/lib/billing/plan-tier-icon';
import { planCodeFromDbPlanId } from '@/lib/billing/types';
import { cn } from '@/lib/utils';
import { getR2PublicUrl } from '@/lib/utils/r2';

export function AppTopBar() {
  const tTopbar = useTranslations('appTopbar');
  const tAccount = useTranslations('account');
  const tPlanNames = useTranslations('account.subscriptionInfo');
  const tAppFeatures = useTranslations('appFeatures');
  const tSidebarNav = useTranslations('appSidebar.nav');

  const router = useRouter();
  const pathname = usePathname();
  const { userData } = useUserData();
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const avatarSrc = getR2PublicUrl(userData?.avatar) || '';
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const showAvatarImage = Boolean(avatarSrc) && !avatarLoadFailed;

  const { theme, setTheme } = useTheme();
  const locale = useLocale();

  const languages: Array<{ code: Locale; label: string }> = [
    { code: 'en', label: tAccount('languageEnglish') },
    { code: 'zh', label: tAccount('languageChinese') },
  ];

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarSrc]);

  if (!userData) return null;

  const planCode = planCodeFromDbPlanId(userData.plan);
  const PlanTierIcon = planTierIcon(planCode);
  const { primary: planPrimary, tierShort: planTierShort } =
    getSubscriptionPlanDisplayParts(planCode, tPlanNames);
  const { displayName, avatarFallback } = formatTopbarUserIdentity(
    {
      fullName: userData.fullName,
      email: userData.email,
    },
    tTopbar('demoUser'),
  );

  const profile = { credits: userData.credits };
  const user = { email: userData.email };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    // Navigate away from /app immediately so auth-state teardown does not
    // briefly hide dashboard chrome before the route transition.
    router.replace('/');

    try {
      const result = await signOut();
      if (!result.success) {
        console.error('Sign out failed:', result.error);
        toast.error(tAppFeatures('failedToSignOut'));
        setIsSigningOut(false);
      }
    } catch (error) {
      console.error('Sign out threw:', error);
      toast.error(tAppFeatures('failedToSignOut'));
      setIsSigningOut(false);
    }
  };

  const handleLanguageChange = (lang: Locale) => {
    if (lang === locale) return;
    router.replace({ pathname }, { locale: lang });
  };

  const navigation = [
    { name: tSidebarNav('home'), href: '/app' },
    { name: tSidebarNav('projects'), href: '/app/projects' },
  ];

  return (
    <>
      <header className="flex h-[68px] items-center justify-between border-b border-border/40 bg-background px-4 leading-7 lg:px-6">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden />
              <span className="sr-only">{tTopbar('openMenu')}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] bg-background p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>{tTopbar('openMenu')}</SheetTitle>
              <SheetDescription>{tSidebarNav('home')}</SheetDescription>
            </SheetHeader>
            <div className="flex h-[68px] items-center border-b border-border px-6">
              <BrandLogo height={24} />
            </div>
            <nav className="px-4 py-6">
              <ul className="space-y-1.5">
                {navigation.map((item) => {
                  const isActive =
                    item.href === '/app'
                      ? pathname === '/app'
                      : pathname.startsWith(item.href);
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {/* Credits display for mobile */}
              <div className="mt-6 rounded-2xl border border-border bg-linear-to-br from-primary/5 to-chart-4/5 p-4">
                <div className="text-sm font-medium text-foreground">
                  {tTopbar('creditsRemaining')}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-primary">
                    {profile.credits ?? 0}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {tTopbar('creditsUnit')}
                  </span>
                </div>
              </div>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Empty div to maintain layout spacing on desktop */}
        <div className="hidden lg:block" />

        {/* Right side actions */}
        <div className="flex items-center gap-2.5">
          {/* Notifications, temp disabled */}
          {/* <Button variant="ghost" size="icon" className="relative rounded-xl">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
          </Button> */}

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="group flex min-h-11 max-w-[280px] items-center gap-2 rounded-xl border border-transparent px-2.5 py-1.5 transition-colors hover:bg-muted/80 data-[state=open]:border-border/60 data-[state=open]:bg-muted/80"
                aria-label={tTopbar('manageProfilePreferences')}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-primary to-chart-4 text-sm font-medium text-white">
                  {showAvatarImage ? (
                    <ImageWithSkeleton
                      src={avatarSrc}
                      alt={displayName || user.email || tAccount('avatarAlt')}
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                      skeletonClassName="rounded-full"
                      onError={() => setAvatarLoadFailed(true)}
                    />
                  ) : (
                    avatarFallback
                  )}
                </div>
                <div className="hidden min-w-0 flex-1 flex-col items-start gap-0.5 text-left sm:flex">
                  <div className="max-w-[160px] truncate text-sm font-medium text-foreground">
                    {displayName}
                  </div>
                  <div
                    className="inline-flex max-w-[160px] items-center gap-0.5 rounded-md bg-muted/70 px-1.5 py-0.5 text-[11px] leading-tight text-muted-foreground/90 [&_svg]:size-[14px]!"
                    title={tTopbar('planRowTitle')}
                  >
                    <PlanTierIcon
                      className="shrink-0 text-muted-foreground/85"
                      aria-hidden
                    />
                    <span className="flex min-w-0 items-center gap-0.5 truncate">
                      <span className="truncate">{planPrimary}</span>
                      {planTierShort != null ? (
                        <>
                          <span
                            className="shrink-0 text-muted-foreground/80"
                            aria-hidden
                          >
                            ·
                          </span>
                          <span className="shrink-0 text-muted-foreground/90">
                            {planTierShort}
                          </span>
                        </>
                      ) : null}
                    </span>
                  </div>
                </div>
                <ChevronDown className="hidden h-4 w-4 shrink-0 text-muted-foreground transition-[rotate] duration-200 group-data-[state=open]:rotate-180 sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-xl p-1.5">
              <DropdownMenuLabel className="px-2.5 py-2">
                <div className="flex flex-col">
                  <span className="truncate text-sm font-medium">
                    {displayName}
                  </span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {user.email ?? tTopbar('demoEmail')}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                asChild
                className={TOPBAR_MENU_ITEM_INTERACTIVE_CLASSNAME}
              >
                <Link href="/app/settings">
                  <UserIcon className="mr-2 h-4 w-4" aria-hidden />
                  {tAppFeatures('profile')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                asChild
                className={TOPBAR_MENU_ITEM_INTERACTIVE_CLASSNAME}
              >
                <Link href="/app/settings?tab=subscription">
                  <CreditCard className="mr-2 h-4 w-4" aria-hidden />
                  {tAppFeatures('subscription')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Language submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger
                  className={TOPBAR_MENU_ITEM_INTERACTIVE_CLASSNAME}
                >
                  <Globe className="mr-2 h-4 w-4" aria-hidden />
                  {tAccount('language')}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="rounded-xl p-1">
                    {languages.map((lang) => (
                      <DropdownMenuItem
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        className="flex items-center justify-between rounded-lg px-3 py-2 data-highlighted:bg-muted/80"
                      >
                        <span>{lang.label}</span>
                        {locale === lang.code && (
                          <Check className="h-4 w-4 text-primary" aria-hidden />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              {/* Theme submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger
                  className={TOPBAR_MENU_ITEM_INTERACTIVE_CLASSNAME}
                >
                  <Sun className="mr-2 h-4 w-4" aria-hidden />
                  {tAccount('theme')}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="rounded-xl p-1">
                    <DropdownMenuItem
                      onClick={() => setTheme('light')}
                      className="flex items-center justify-between rounded-lg px-3 py-2 data-highlighted:bg-muted/80"
                    >
                      <span className="flex items-center">
                        <Sun className="mr-2 h-4 w-4" />
                        {tAccount('themeLight')}
                      </span>
                      {theme === 'light' && (
                        <Check className="h-4 w-4 text-primary" aria-hidden />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setTheme('dark')}
                      className="flex items-center justify-between rounded-lg px-3 py-2 data-highlighted:bg-muted/80"
                    >
                      <span className="flex items-center">
                        <Moon className="mr-2 h-4 w-4" />
                        {tAccount('themeDark')}
                      </span>
                      {theme === 'dark' && (
                        <Check className="h-4 w-4 text-primary" aria-hidden />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setTheme('system')}
                      className="flex items-center justify-between rounded-lg px-3 py-2 data-highlighted:bg-muted/80"
                    >
                      <span className="flex items-center">
                        <Monitor className="mr-2 h-4 w-4" />
                        {tAccount('themeSystem')}
                      </span>
                      {theme === 'system' && (
                        <Check className="h-4 w-4 text-primary" aria-hidden />
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className={TOPBAR_MENU_ITEM_DESTRUCTIVE_CLASSNAME}
              >
                <LogOut className="mr-2 h-4 w-4" aria-hidden />
                {tAppFeatures('signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
