/**
 * Re-export of `@/lib/utils/uuid`.
 *
 * Historically this file was a byte-for-byte copy of `src/lib/utils/uuid.ts`,
 * kept around so server code can import via `@/server/lib/uuid` without
 * rewriting paths. The implementation now lives in one place; this module
 * exists only to preserve the existing import path.
 *
 * Prefer `import { generateUuid } from '@/lib/utils/uuid'` in new code.
 */
export { generateUuid } from '@/lib/utils/uuid';
