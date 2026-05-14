/**
 * Get R2 public URL for a given key
 * If NEXT_PUBLIC_R2_PUBLIC_DOMAIN is configured, use it; otherwise use default R2 domain
 *
 * @param key - R2 object key (e.g., "gen-media/uuid.png")
 * @returns Public URL or null if key is invalid
 */
export function getR2PublicUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (/^https?:\/\//i.test(key)) return key;

  // Get R2 public domain from environment variable
  // If not set, use default R2 domain format: https://pub-{account_id}.r2.dev
  const r2PublicDomain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN;
  const r2AccountId = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID;

  let domain: string | null = null;

  if (r2PublicDomain) {
    domain = r2PublicDomain.replace(/\/$/, '');
  } else if (r2AccountId) {
    // Default R2 public domain format
    domain = `https://pub-${r2AccountId}.r2.dev`;
  } else {
    console.warn(
      'Neither NEXT_PUBLIC_R2_PUBLIC_DOMAIN nor NEXT_PUBLIC_R2_ACCOUNT_ID is configured',
    );
    return null;
  }

  // Remove leading slash from key if present
  const cleanKey = key.replace(/^\//, '');

  return `${domain}/${cleanKey}`;
}

/**
 * Get media URL from task item.
 * Returns null when status is not 'completed'.
 * Prefers R2 (uploadKey) over provider temp URL (resultUrl).
 *
 * @param item - Task item (camelCase matches `TaskItemData` / API rows)
 * @returns Media URL or null
 */
export function getTaskItemImageUrl(item: {
  uploadKey?: string | null;
  resultUrl?: string | null;
  status?: string;
}): string | null {
  if (item.status !== 'completed') {
    return null;
  }
  if (item.uploadKey) {
    const r2Url = getR2PublicUrl(item.uploadKey);
    if (r2Url) return r2Url;
  }
  return item.resultUrl || null;
}

/**
 * Preview thumbnail URL for task-item cards.
 * Returns poster URL only (no media URL fallback).
 */
export function getTaskItemThumbnailUrl(item: {
  thumbnailKey?: string | null;
  status?: string;
}): string | null {
  if (item.status !== 'completed') {
    return null;
  }
  if (item.thumbnailKey) {
    const thumbUrl = getR2PublicUrl(item.thumbnailKey);
    if (thumbUrl) return thumbUrl;
  }
  return null;
}

/**
 * Preview image URL for project cards and list rows.
 * Prefers `thumbnailKey` (e.g. video poster), then R2 `outputKey`, then provider `resultUrl`.
 */
export function getProjectPreviewUrl(project: {
  thumbnailKey?: string | null;
  outputKey?: string | null;
  resultUrl?: string | null;
}): string | null {
  const fromThumb = getR2PublicUrl(project.thumbnailKey);
  if (fromThumb) return fromThumb;
  const fromOutput = getR2PublicUrl(project.outputKey);
  if (fromOutput) return fromOutput;
  const r = project.resultUrl;
  return typeof r === 'string' && r.trim().length > 0 ? r.trim() : null;
}
