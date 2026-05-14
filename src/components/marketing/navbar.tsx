'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import {
  Menu,
  X,
  Layers,
  ChevronDown,
  Info,
  Newspaper,
  MessageSquareText,
  ArrowRight,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { BrandLogo } from '@/components/brand/brand-logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Button } from '@/components/ui/button';
import { ImageWithSkeleton } from '@/components/ui/image-with-skeleton';

import { getFeatureById } from '@/config/features';
import { useIsAuthenticated } from '@/contexts/auth-context';
import { useUserData } from '@/hooks/use-user-data';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { getR2PublicUrl } from '@/lib/utils/r2';

const navLinkFocusClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function userDisplayInitial(userData: {
  name?: string | null;
  email?: string | null;
}): string {
  for (const raw of [userData.name, userData.email]) {
    const c = raw?.trim()?.charAt(0);
    if (c) return c.toUpperCase();
  }
  return 'U';
}

export function Navbar() {
  const t = useTranslations('marketingNav');
  const tFeatureNames = useTranslations('featureNames');
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const desktopTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>(
    {},
  );
  const firstDesktopDropdownLinkRefs = useRef<
    Record<string, HTMLAnchorElement | null>
  >({});
  const mobileToggleRef = useRef<HTMLButtonElement | null>(null);
  const mobileNavContentRef = useRef<HTMLDivElement | null>(null);
  const { isAuthenticated, loading: authLoading } = useIsAuthenticated();
  const { userData } = useUserData();
  const avatarSrc = getR2PublicUrl(userData?.avatar) || '';
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const showAvatarImage = Boolean(avatarSrc) && !avatarLoadFailed;
  const marketingFeatureItems = [
    {
      icon: getFeatureById('urlToVideo').icon,
      label: tFeatureNames('urlToVideo'),
      description: t('featureItems.urlToVideo.description'),
      href: '/features/url-to-video',
    },
    {
      icon: getFeatureById('videoAnalysis').icon,
      label: tFeatureNames('videoAnalysis'),
      description: t('featureItems.videoAnalysis.description'),
      href: '/features/video-insight',
    },
    {
      icon: getFeatureById('productVideo').icon,
      label: tFeatureNames('productVideo'),
      description: t('featureItems.productVideo.description'),
      href: '/features/product-video',
    },
    {
      icon: getFeatureById('productPhoto').icon,
      label: tFeatureNames('productPhoto'),
      description: t('featureItems.productPhoto.description'),
      href: '/features/product-photo',
    },
    {
      icon: Layers,
      label: t('featureItems.assetGenerator.label'),
      description: t('featureItems.assetGenerator.description'),
      href: '/#features',
    },
  ];

  const navItems = [
    {
      id: 'features',
      label: t('features'),
      href: '#features',
      hasDropdown: true,
      dropdownItems: [
        ...marketingFeatureItems,
        // {
        //   icon: FileVideo,
        //   label: t('featureItems.videoTemplates.label'),
        //   description: t('featureItems.videoTemplates.description'),
        //   href: '#templates',
        // },
      ],
    },
    {
      id: 'resources',
      label: t('resources'),
      href: '#resources',
      hasDropdown: true,
      dropdownItems: [
        {
          icon: Newspaper,
          label: t('resourceItems.blog.label'),
          description: t('resourceItems.blog.description'),
          href: '/blog',
        },
        {
          icon: Info,
          label: t('resourceItems.about.label'),
          description: t('resourceItems.about.description'),
          href: '/about',
        },
        {
          icon: MessageSquareText,
          label: t('resourceItems.feedback.label'),
          description: t('resourceItems.feedback.description'),
          href: '/feedback',
        },
        // {
        //   icon: HelpCircle,
        //   label: t('resourceItems.helpCenter.label'),
        //   description: t('resourceItems.helpCenter.description'),
        //   href: '#help',
        // },
        // {
        //   icon: MessageSquare,
        //   label: t('resourceItems.community.label'),
        //   description: t('resourceItems.community.description'),
        //   href: '#community',
        // },
      ],
    },
    {
      id: 'pricing',
      label: t('pricing'),
      href: '/pricing',
      hasDropdown: false,
    },
  ];

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarSrc]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 10);
          ticking = false;
        });
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDesktopDropdownListKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>, itemId: string) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName !== 'A') return;
      const links = Array.from(
        e.currentTarget.querySelectorAll<HTMLAnchorElement>('a[href]'),
      );
      const idx = links.indexOf(target as HTMLAnchorElement);
      if (idx < 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        links[idx + 1]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (idx > 0) {
          links[idx - 1]?.focus();
        } else {
          desktopTriggerRefs.current[itemId]?.focus();
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) {
      setActiveDropdown(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        mobileToggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => {
      const first = mobileNavContentRef.current?.querySelector<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      first?.focus();
    }, 50);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-[background-color,box-shadow] duration-300',
        isScrolled
          ? 'bg-background shadow-sm shadow-black/4 dark:shadow-black/30'
          : 'bg-background/60',
      )}
    >
      <nav
        aria-label={t('desktopNavLabel')}
        className="relative mx-auto flex h-[68px] max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <BrandLogo
          className="animate-fade-in motion-reduce:animate-none"
          width={77}
          height={26}
        />

        {/* Desktop Navigation with Dropdown */}
        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 animate-fade-in-down motion-reduce:animate-none lg:flex">
          {navItems.map((item, index) => (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() =>
                item.hasDropdown && setActiveDropdown(item.id)
              }
              onMouseLeave={() => setActiveDropdown(null)}
              onBlurCapture={(e) => {
                if (
                  e.relatedTarget &&
                  e.currentTarget.contains(e.relatedTarget)
                ) {
                  return;
                }
                setActiveDropdown((current) =>
                  current === item.id ? null : current,
                );
              }}
            >
              {item.hasDropdown ? (
                <Button
                  type="button"
                  variant="ghost"
                  id={`desktop-nav-${item.id}-trigger`}
                  ref={(el) => {
                    desktopTriggerRefs.current[item.id] = el;
                  }}
                  className={cn(
                    'flex h-auto items-center gap-1 rounded-lg px-4 py-2.5 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                    activeDropdown === item.id && 'bg-muted text-foreground',
                    navLinkFocusClass,
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                  aria-expanded={activeDropdown === item.id}
                  aria-controls={`${item.id}-menu`}
                  onClick={() =>
                    setActiveDropdown((current) =>
                      current === item.id ? null : item.id,
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setActiveDropdown(null);
                      return;
                    }

                    if (
                      e.key === 'ArrowDown' ||
                      e.key === 'Enter' ||
                      e.key === ' '
                    ) {
                      e.preventDefault();
                      setActiveDropdown(item.id);
                      window.setTimeout(() => {
                        firstDesktopDropdownLinkRefs.current[item.id]?.focus();
                      }, 0);
                    }
                  }}
                >
                  {item.label}
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-[rotate] duration-200 motion-reduce:transition-none',
                      activeDropdown === item.id && 'rotate-180',
                    )}
                  />
                </Button>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-4 py-2.5 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                    navLinkFocusClass,
                    activeDropdown === item.id && 'bg-muted text-foreground',
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {item.label}
                </Link>
              )}

              {item.hasDropdown && item.dropdownItems && (
                // Keyboard delegation for ArrowUp/ArrowDown between disclosure links (APG navigation menu).
                // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- role="group" container; handlers act on anchor targets only
                <div
                  id={`${item.id}-menu`}
                  role="group"
                  aria-labelledby={`desktop-nav-${item.id}-trigger`}
                  inert={activeDropdown !== item.id}
                  className={cn(
                    // TW v4: this toggles translate-y, so transition `translate` rather than `transform`.
                    'absolute left-1/2 top-full -translate-x-1/2 pt-3 transition-[opacity,translate] duration-200 motion-reduce:transition-none',
                    activeDropdown === item.id
                      ? 'translate-y-0 opacity-100 ease-out'
                      : 'translate-y-1 opacity-0 ease-in pointer-events-none motion-reduce:translate-y-0',
                  )}
                  onKeyDown={(e) =>
                    handleDesktopDropdownListKeyDown(e, item.id)
                  }
                >
                  <div className="w-[380px] rounded-2xl border border-border/50 bg-background p-3 shadow-2xl shadow-black/10 dark:shadow-black/45">
                    <div className="grid gap-1">
                      {item.dropdownItems.map((dropdownItem, di) => (
                        <Link
                          key={dropdownItem.label}
                          href={dropdownItem.href}
                          ref={(el) => {
                            if (di === 0) {
                              firstDesktopDropdownLinkRefs.current[item.id] =
                                el;
                            }
                          }}
                          className={cn(
                            'group flex items-center gap-4 rounded-xl p-3 transition-[background-color,box-shadow] duration-200 ease-out hover:bg-muted hover:shadow-sm hover:shadow-black/5 dark:hover:shadow-black/25',
                            navLinkFocusClass,
                          )}
                          onClick={() => setActiveDropdown(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              setActiveDropdown(null);
                              desktopTriggerRefs.current[item.id]?.focus();
                            }
                          }}
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary transition-[scale,background-color,color,box-shadow] duration-200 ease-out group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-md group-hover:shadow-primary/15 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                            <dropdownItem.icon className="h-5 w-5" />
                          </div>
                          <div className="flex flex-1 flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground transition-colors duration-200 ease-out group-hover:text-primary">
                                {dropdownItem.label}
                              </span>
                              <ArrowRight className="h-3.5 w-3.5 -translate-x-2 text-muted-foreground opacity-0 transition-[opacity,translate,color] duration-200 ease-out group-hover:translate-x-0 group-hover:text-primary group-hover:opacity-100 motion-reduce:translate-x-0 motion-reduce:transition-none" />
                            </div>
                            <span className="text-xs text-muted-foreground leading-relaxed">
                              {dropdownItem.description}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>

                    {/* Footer link for Features dropdown, temporary remove this for MVP, don't remove the comments below. */}
                    {/* {item.id === 'features' && (
                      <div className="mt-2 border-t border-border pt-3">
                        <Link
                          href="/features"
                          className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:bg-primary/5"
                        >
                          {t('viewAllFeatures')}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    )} */}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div
          className="ml-auto hidden items-center gap-4 animate-fade-in-right motion-reduce:animate-none lg:flex"
          aria-busy={authLoading}
        >
          <LanguageSwitcher compact contentAlign="center" />
          {authLoading ? (
            // Loading state
            <div className="h-10 w-24 animate-pulse rounded-md bg-muted" />
          ) : isAuthenticated && userData ? (
            // User avatar and dashboard action (authenticated)
            <>
              <Link
                href="/app/settings"
                className={cn(
                  'relative block h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border/40 bg-muted transition-[scale] hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100 lg:h-10 lg:w-10',
                  navLinkFocusClass,
                )}
                aria-label={t('goToSettings')}
              >
                {showAvatarImage ? (
                  <ImageWithSkeleton
                    src={avatarSrc}
                    alt={userData.name || userData.email || 'Avatar'}
                    fill
                    sizes="40px"
                    className="object-cover"
                    skeletonClassName="rounded-full"
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted text-sm font-medium text-foreground">
                    {userDisplayInitial(userData)}
                  </div>
                )}
              </Link>
              <Button className="h-10 px-5 text-base font-medium group" asChild>
                <Link href="/app">
                  <span className="inline-block transition-[scale] duration-200 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                    {t('goToDashboard')}
                  </span>
                </Link>
              </Button>
            </>
          ) : (
            // Login/Sign up actions (unauthenticated)
            <>
              <Button
                variant="ghost"
                className="h-10 rounded-lg border border-border/60 px-4 text-sm font-medium text-foreground hover:bg-muted/80"
                asChild
              >
                <Link href="/auth/login">{t('login')}</Link>
              </Button>
              <Button className="h-10 px-5 text-base font-medium group" asChild>
                <Link href="/auth/sign-up">
                  <span className="inline-block transition-[scale] duration-200 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                    {t('signUpFree')}
                  </span>
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button
          ref={mobileToggleRef}
          variant="ghost"
          size="icon"
          className={cn(
            'ml-auto min-h-11 min-w-11 p-0 transition-[scale] hover:scale-110 hover:bg-transparent motion-reduce:transition-none motion-reduce:hover:scale-100 lg:hidden',
            navLinkFocusClass,
          )}
          type="button"
          aria-expanded={isOpen}
          aria-controls="marketing-mobile-nav"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={t('toggleMenu')}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </nav>

      <div
        ref={mobileNavContentRef}
        id="marketing-mobile-nav"
        role="navigation"
        aria-label={t('mobileNavMenuLabel')}
        inert={!isOpen}
        className={cn(
          'grid bg-background transition-[grid-template-rows] duration-300 ease-out lg:hidden',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-1 px-4 py-4">
            {navItems.map((item) => (
              <div key={item.id}>
                {item.hasDropdown ? (
                  <div>
                    <Button
                      variant="ghost"
                      type="button"
                      id={`mobile-nav-${item.id}-trigger`}
                      aria-expanded={activeDropdown === item.id}
                      aria-controls={`mobile-nav-${item.id}-panel`}
                      onClick={() =>
                        setActiveDropdown(
                          activeDropdown === item.id ? null : item.id,
                        )
                      }
                      className={cn(
                        'flex min-h-11 w-full h-auto items-center justify-between rounded-xl px-4 py-3 text-[15px] font-medium transition-colors hover:bg-transparent',
                        activeDropdown === item.id
                          ? 'bg-primary/5 text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {item.label}
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-[rotate] duration-300 motion-reduce:transition-none',
                          activeDropdown === item.id && 'rotate-180',
                        )}
                      />
                    </Button>
                    <div
                      id={`mobile-nav-${item.id}-panel`}
                      role="region"
                      aria-labelledby={`mobile-nav-${item.id}-trigger`}
                      inert={activeDropdown !== item.id}
                      className={cn(
                        'grid transition-[grid-template-rows] duration-300 ease-out',
                        activeDropdown === item.id
                          ? 'grid-rows-[1fr]'
                          : 'grid-rows-[0fr]',
                      )}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div
                          className={cn(
                            'rounded-xl bg-muted/50 p-2',
                            activeDropdown === item.id && 'mt-1',
                          )}
                        >
                          {item.dropdownItems?.map((dropdownItem) => (
                            <Link
                              key={dropdownItem.label}
                              href={dropdownItem.href}
                              className={cn(
                                'flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground',
                                navLinkFocusClass,
                              )}
                              onClick={() => setIsOpen(false)}
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <dropdownItem.icon className="h-4 w-4" />
                              </div>
                              <span className="font-medium">
                                {dropdownItem.label}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      'flex min-h-11 items-center rounded-xl px-4 py-3 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                      navLinkFocusClass,
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
            <div
              className="mt-4 flex flex-col gap-2 border-t border-border pt-4"
              aria-busy={authLoading}
            >
              <LanguageSwitcher
                contentAlign="start"
                triggerClassName="h-11 w-full rounded-xl px-4 text-[15px]"
              />
              {authLoading ? (
                // Loading state
                <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
              ) : isAuthenticated && userData ? (
                // User avatar and Get started when authenticated (mobile)
                <>
                  <Link
                    href="/app"
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-muted/70',
                      navLinkFocusClass,
                    )}
                  >
                    <div className="relative h-11 w-11 overflow-hidden rounded-full bg-muted ring-1 ring-border ring-offset-2 ring-offset-background lg:h-10 lg:w-10">
                      {showAvatarImage ? (
                        <ImageWithSkeleton
                          src={avatarSrc}
                          alt={userData.name || userData.email || 'Avatar'}
                          fill
                          sizes="40px"
                          className="object-cover"
                          skeletonClassName="rounded-full"
                          onError={() => setAvatarLoadFailed(true)}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted text-sm font-medium text-foreground">
                          {userDisplayInitial(userData)}
                        </div>
                      )}
                    </div>
                    <span className="text-[15px] font-medium text-foreground">
                      {t('goToDashboard')}
                    </span>
                  </Link>
                </>
              ) : (
                // Login/Sign up buttons when not authenticated (mobile)
                <>
                  <Button
                    variant="ghost"
                    className="h-11 text-[15px] rounded-xl justify-start"
                    asChild
                  >
                    <Link href="/auth/login">{t('login')}</Link>
                  </Button>
                  <Button className="h-11 text-[15px] rounded-xl group" asChild>
                    <Link href="/auth/sign-up">
                      <span className="inline-block transition-[scale] duration-200 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                        {t('signUpFree')}
                      </span>
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
