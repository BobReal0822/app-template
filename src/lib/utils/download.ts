/**
 * Download utilities for files and media
 */

const BLOB_DOWNLOAD_TIMEOUT_MS = 30000;

function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:', 'blob:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

function sanitizeFilename(filename: string): string {
  return (
    filename
      .replace(/\.\./g, '')
      // eslint-disable-next-line no-control-regex -- Intentionally removing control characters for filename safety
      .replace(/[/\\<>:"|?*\x00-\x1f]/g, '_')
      .trim()
  );
}

function triggerDownloadByUrl(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Same-origin and blob URLs honor `download` on an anchor; cross-origin HTTPS does not.
 */
function canUseAnchorDownloadFallback(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol === 'blob:') return true;
    if (typeof window === 'undefined') return false;
    return u.origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Result of {@link downloadFile}: saved via blob/anchor, opened in a new tab, or failed. */
export type DownloadFileOutcome = 'saved' | 'opened_new_window' | 'failed';

/**
 * Download a file from a URL.
 *
 * Uses fetch → blob when possible. If that fails: same-origin/blob uses an anchor;
 * otherwise opens the URL in a new tab (cross-origin `download` would navigate the current tab).
 */
export async function downloadFile(
  url: string,
  filename: string,
): Promise<DownloadFileOutcome> {
  if (!isValidUrl(url)) {
    console.error('[download] Invalid URL:', url);
    return 'failed';
  }

  const safeFilename = sanitizeFilename(filename);
  if (!safeFilename) {
    console.error('[download] Invalid filename after sanitization');
    return 'failed';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    BLOB_DOWNLOAD_TIMEOUT_MS,
  );

  let blobUrl: string | null = null;
  let link: HTMLAnchorElement | null = null;

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    blobUrl = URL.createObjectURL(blob);
    link = document.createElement('a');
    link.href = blobUrl;
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();
    return 'saved';
  } catch (error) {
    console.warn('[download] Direct fetch failed:', error);
    if (canUseAnchorDownloadFallback(url)) {
      try {
        triggerDownloadByUrl(url, safeFilename);
        return 'saved';
      } catch (fallbackError) {
        console.error('[download] Anchor fallback failed:', fallbackError);
      }
      return 'failed';
    }
    if (typeof window !== 'undefined') {
      // Some browsers may return `null` when noopener/noreferrer is used
      // even if the new tab is actually opened. Open a blank tab first so
      // we can reliably detect popup blocking, then navigate it.
      const openedWindow = window.open('about:blank', '_blank');
      if (openedWindow) {
        openedWindow.opener = null;
        openedWindow.location.href = url;
        return 'opened_new_window';
      }
    }
    return 'failed';
  } finally {
    clearTimeout(timeoutId);
    link?.remove();
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }
  }
}

function sanitizeFilenamePromptSegment(segment: string): string {
  return segment
    .slice(0, 50)
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

/**
 * Generate a sanitized filename from a prompt.
 * Optional `presetId` (e.g. product-photo scene id) is appended before the index suffix.
 */
export function generateFilenameFromPrompt(
  prompt: string,
  index?: number,
  extension = 'png',
  presetId?: string,
): string {
  if (!prompt || typeof prompt !== 'string') {
    const indexSuffix = index !== undefined ? `_${index + 1}` : '';
    return `image_${Date.now()}${indexSuffix}.${extension}`;
  }

  const sanitizedPrompt = sanitizeFilenamePromptSegment(prompt);

  let base =
    sanitizedPrompt.length > 0 ? sanitizedPrompt : `image_${Date.now()}`;
  const presetSeg = presetId?.trim()
    ? sanitizeFilenamePromptSegment(presetId.trim())
    : '';
  if (presetSeg) {
    base = `${base}_${presetSeg}`;
  }
  const indexSuffix = index !== undefined ? `_${index + 1}` : '';
  return `${base}${indexSuffix}.${extension}`;
}

/**
 * Extract file extension from URL.
 */
export function getExtensionFromUrl(url: string, defaultExt = 'png'): string {
  return url.split('.').pop()?.split('?')[0] || defaultExt;
}

/**
 * Download media using the same filename rules as studio results / preview dialog.
 */
export async function downloadMediaByPrompt(
  mediaUrl: string,
  prompt: string,
  options?: { itemIndex?: number; isVideo?: boolean; presetId?: string },
): Promise<DownloadFileOutcome> {
  const extension = getExtensionFromUrl(
    mediaUrl,
    options?.isVideo ? 'mp4' : 'png',
  );
  const filename = generateFilenameFromPrompt(
    prompt,
    options?.itemIndex,
    extension,
    options?.presetId,
  );
  return downloadFile(mediaUrl, filename);
}
