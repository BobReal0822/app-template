'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onStoreChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }

  const mediaQuery = window.matchMedia(QUERY);
  mediaQuery.addEventListener('change', onStoreChange);

  return () => {
    mediaQuery.removeEventListener('change', onStoreChange);
  };
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia(QUERY).matches;
}

/** SSR / server components: assume no preference (animations may run until client hydrates). */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Tracks `prefers-reduced-motion: reduce` with `useSyncExternalStore` so the value is current
 * on the first client render (no useEffect delay). Global CSS still enforces reduced motion for animations.
 */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
