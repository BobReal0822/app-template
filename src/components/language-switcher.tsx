'use client';

import { useMemo } from 'react';

import { Check, ChevronDown, Globe } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { Locale } from '@/i18n/routing';
import { routing, usePathname, useRouter } from '@/i18n/routing';
import { cn } from '@/lib/utils';

type LanguageSwitcherProps = {
  className?: string;
  triggerClassName?: string;
  contentAlign?: 'start' | 'center' | 'end';
  compact?: boolean;
};

function formatLocaleLabel(
  localeCode: Locale,
  languageDisplayNames: Intl.DisplayNames,
): string {
  const languageCode = localeCode.split('-')[0];
  const displayName = languageDisplayNames.of(languageCode);

  if (displayName) {
    return displayName;
  }

  return localeCode.toUpperCase();
}

export function LanguageSwitcher(props: LanguageSwitcherProps) {
  const {
    className,
    triggerClassName,
    contentAlign = 'start',
    compact = false,
  } = props;
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const tAccount = useTranslations('account');
  const languageDisplayNames = useMemo(
    () => new Intl.DisplayNames([locale], { type: 'language' }),
    [locale],
  );

  const locales = useMemo(
    () =>
      routing.locales.map((code) => ({
        code,
        label: formatLocaleLabel(code, languageDisplayNames),
      })),
    [languageDisplayNames],
  );

  const currentLocaleLabel =
    locales.find((entry) => entry.code === locale)?.label ||
    locale.toUpperCase();

  const handleLanguageChange = (nextLocale: Locale) => {
    if (nextLocale === locale) return;
    router.replace({ pathname }, { locale: nextLocale });
  };

  const triggerFocusClass =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            compact
              ? 'm-0 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-transparent bg-transparent p-0 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground data-[state=open]:bg-muted/80'
              : 'inline-flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border border-transparent px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground data-[state=open]:bg-muted/80',
            triggerFocusClass,
            triggerClassName,
          )}
          aria-label={tAccount('selectLanguage')}
        >
          <Globe
            className={cn(compact ? 'h-5 w-5' : 'h-4 w-4 shrink-0')}
            aria-hidden
          />
          {compact ? (
            <span className="sr-only">{currentLocaleLabel}</span>
          ) : (
            <>
              <span className="min-w-0 flex-1 text-left">
                {currentLocaleLabel}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={contentAlign}
        className={cn('min-w-44 rounded-xl p-1', className)}
      >
        {locales.map((entry) => (
          <DropdownMenuItem
            key={entry.code}
            onSelect={() => handleLanguageChange(entry.code)}
            className="flex items-center justify-between rounded-lg px-3 py-2 data-highlighted:bg-muted/80"
          >
            <span>{entry.label}</span>
            {entry.code === locale ? (
              <Check className="h-4 w-4 text-primary" aria-hidden />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
