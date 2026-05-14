/**
 * URL helpers for media rendering behavior.
 */

export function isFalMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return hostname === 'fal.media' || hostname.endsWith('.fal.media');
  } catch {
    return false;
  }
}

/**
 * Returns true when media URL points to a different origin than the current page.
 * Useful for opting out of Next Image optimizer on externally hosted assets.
 */
export function isExternalMediaUrl(url: string | null | undefined): boolean {
  if (!url || typeof window === 'undefined') return false;
  try {
    return new URL(url).origin !== window.location.origin;
  } catch {
    return false;
  }
}
