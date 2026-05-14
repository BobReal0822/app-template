/**
 * Centralized `unstable_cache` / Cache Components tags.
 *
 * High-frequency read paths are cached cross-request via `unstable_cache`.
 * Centralizing tag names lets us:
 *   - `revalidateTag(CACHE_TAGS.blog)` from any place that mutates blog data
 *   - rename / refactor without grepping string literals everywhere
 *
 * Convention: stable, lowercase, kebab-case names. Treat as PUBLIC API of
 * cached entities.
 */
export const CACHE_TAGS = {
  /** All blog list / detail data (MDX-derived, content/blog/**). */
  blog: 'blog',
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
