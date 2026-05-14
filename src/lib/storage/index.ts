/**
 * Storage Module
 *
 * Unified S3-compatible storage operations against Cloudflare R2.
 *
 * @example
 * ```ts
 * import { uploadToR2, downloadFromR2, getR2PublicUrl } from '@/lib/storage';
 * import { validateFile } from '@/lib/storage';
 * ```
 *
 * To add a second backend (e.g. Google Cloud Storage), drop a `gcs.ts` next
 * to `r2.ts` exposing the same surface and re-export from this barrel.
 */

export type {
  UploadPurpose,
  UploadOptions,
  UrlUploadOptions,
  UploadResult,
  DownloadOptions,
  DownloadResult,
  FileValidationOptions,
} from './types';

export {
  uploadToR2,
  uploadUrlToR2,
  uploadMultipleToR2,
  downloadFromR2,
  getR2PublicUrl,
} from './r2';

export { validateFile } from './utils';
