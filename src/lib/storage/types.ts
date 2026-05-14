/**
 * Storage Types
 *
 * Shared type definitions for storage operations.
 */

// ═══════════ Upload Types ═══════════

/**
 * Logical upload categories. Each maps to a folder prefix in R2 and to its
 * own file-validation rules — extend this union as you add new upload
 * surfaces (avatars, attachments, exports, …).
 */
export type UploadPurpose = 'feedback' | 'avatar';

export interface UploadOptions {
  /** File to upload */
  file: File;
  /** Upload purpose (determines folder and limits) */
  purpose: UploadPurpose;
  /** Progress callback (0-100) */
  onProgress?: (progress: number) => void;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

export interface UrlUploadOptions {
  /** Source URL to download and upload */
  url: string;
  /** Upload purpose */
  purpose: UploadPurpose;
  /** Optional title for logging */
  title?: string;
  /** Progress callback (simulated for URL uploads) */
  onProgress?: (progress: number) => void;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

export interface UploadResult {
  /** Storage key (path in storage) */
  key: string;
  /** Public URL or URI of the uploaded file */
  url: string;
  /** File size in bytes */
  fileSize: number;
  /** Content type */
  contentType: string;
}

// ═══════════ Download Types ═══════════

export interface DownloadOptions {
  /** Storage key (path in storage) */
  key: string;
  /** Optional filename for download */
  filename?: string;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

export interface DownloadResult {
  /** Downloaded file as Blob */
  blob: Blob;
  /** Content type */
  contentType: string;
  /** File size in bytes */
  fileSize: number;
}

// ═══════════ Validation Types ═══════════

export interface FileValidationOptions {
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Allowed MIME types */
  allowedTypes?: string[];
  /** Allowed file extensions (without dot) */
  allowedExtensions?: string[];
}
