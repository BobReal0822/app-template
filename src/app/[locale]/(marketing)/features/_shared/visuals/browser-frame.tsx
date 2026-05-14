import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

const FALLBACK_PRODUCTION_HOST = 'app.example.com';

/**
 * Compute the user-facing host shown inside the BrowserFrame address bar.
 * Strips protocol, `www.`, and trailing slash from `NEXT_PUBLIC_APP_URL` so
 * the chrome reads like a real browser tab (`app.example.com`), not a raw URL.
 */
function getDisplayHost(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) return FALLBACK_PRODUCTION_HOST;
  try {
    return new URL(raw).host.replace(/^www\./, '');
  } catch {
    return FALLBACK_PRODUCTION_HOST;
  }
}

interface BrowserFrameProps {
  children: ReactNode;
  /**
   * Path to render inside the address bar (e.g. `/app/product-photo`). The
   * host is derived from `NEXT_PUBLIC_APP_URL` (or the production fallback),
   * keeping every step visual in sync with the real domain.
   */
  path?: string;
  /** Escape hatch: pass an entirely custom string instead of host + path. */
  url?: string;
  /** Override inner padding around the slot. Defaults to a comfortable padding. */
  contentClassName?: string;
  className?: string;
}

/**
 * Lightweight "browser/window" chrome used as the outer shell of marketing
 * step visuals. Pure CSS — never re-renders product UI by AI, so it always
 * stays pixel-crisp and theme-aware.
 */
export function BrowserFrame({
  children,
  path,
  url,
  contentClassName,
  className,
}: BrowserFrameProps) {
  const addressBarLabel =
    url ?? (path ? `${getDisplayHost()}${path}` : undefined);

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm',
        className,
      )}
    >
      <div className="flex h-9 shrink-0 items-center gap-3 border-b border-border/60 bg-muted/40 px-4">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/80 dark:bg-destructive/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/80 dark:bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/80 dark:bg-success/70" />
        </div>
        {addressBarLabel ? (
          <div className="hidden flex-1 justify-center sm:flex">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-background/70 px-2.5 py-0.5 text-[11px] text-muted-foreground/80">
              <span className="h-1.5 w-1.5 rounded-full bg-success/70" />
              {addressBarLabel}
            </span>
          </div>
        ) : (
          <div className="hidden flex-1 sm:block" />
        )}
        <div className="hidden w-12 sm:block" />
      </div>
      <div className={cn('flex-1 overflow-hidden', contentClassName)}>
        {children}
      </div>
    </div>
  );
}
