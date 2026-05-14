'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

/**
 * First focusable control in the page shell: jumps to `#main-content` (WCAG 2.4.1).
 * Visually hidden until focused; pair every layout’s primary `<main>` with `id="main-content"`.
 */
export function SkipToMainLink() {
  const t = useTranslations('common');

  return (
    <a
      href="#main-content"
      className={cn(
        'fixed left-4 top-4 z-[100] inline-flex min-h-11 -translate-y-[200%] items-center rounded-md border border-border bg-background px-4 py-3 text-sm font-medium text-foreground shadow-md outline-none ring-2 ring-ring/40 transition-[translate] duration-200',
        'focus:translate-y-0 focus-visible:translate-y-0',
      )}
    >
      {t('skipToMain')}
    </a>
  );
}
