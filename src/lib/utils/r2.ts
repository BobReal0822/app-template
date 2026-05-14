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
