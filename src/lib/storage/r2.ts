/**
 * R2 Storage Operations
 *
 * Upload and download functions for Cloudflare R2 storage.
 */

import { ApiError } from '@/lib/api/client';

import {
  uploadWithProgress,
  uploadSimple,
  createProgressSimulator,
} from './utils';

import type {
  UploadOptions,
  UrlUploadOptions,
  UploadResult,
  DownloadOptions,
  DownloadResult,
} from './types';

// ═══════════ Upload Functions ═══════════

/**
 * Upload a local file to R2 storage
 *
 * @example
 * ```ts
 * const result = await uploadToR2({
 *   file: imageFile,
 *   purpose: 'feedback',
 *   onProgress: (progress) => setProgress(progress),
 * });
 * console.log('Uploaded to:', result.key);
 * ```
 */
export async function uploadToR2(
  options: UploadOptions,
): Promise<UploadResult> {
  const { file, purpose, onProgress, signal } = options;

  // 1. Get presigned upload URL from Next.js API
  const response = await fetch('/api/get-upload-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      purpose,
    }),
    signal,
  });

  const result = await response.json();

  if (!response.ok || result.code !== 0) {
    throw new ApiError(result.code ?? 5001, '');
  }

  const { uploadUrl, key } = result.data;

  // 2. Upload file
  if (onProgress) {
    await uploadWithProgress(uploadUrl, file, onProgress, signal);
  } else {
    await uploadSimple(uploadUrl, file, signal);
  }

  // 3. Build public URL
  const r2Domain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || '';
  const url = `${r2Domain}/${key}`;

  return {
    key,
    url,
    fileSize: file.size,
    contentType: file.type || 'application/octet-stream',
  };
}

/**
 * Upload a file from URL to R2 storage (via Next.js API)
 *
 * Note: This downloads the file server-side and uploads to R2.
 * For large files, consider using uploadUrlToGcs instead.
 */
export async function uploadUrlToR2(
  options: UrlUploadOptions,
): Promise<UploadResult> {
  const { url, purpose, title, onProgress, signal } = options;

  const progressSimulator = createProgressSimulator(onProgress, signal);

  progressSimulator.start();

  try {
    // Call Next.js API to download and upload to R2
    const response = await fetch('/api/upload-url-to-r2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, purpose, title }),
      signal,
    });

    const result = await response.json();

    if (!response.ok || result.code !== 0) {
      throw new Error(result.message || 'Failed to upload URL to R2');
    }

    progressSimulator.complete();

    const r2Domain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || '';
    return {
      key: result.data.key,
      url: `${r2Domain}/${result.data.key}`,
      fileSize: result.data.fileSize,
      contentType: result.data.contentType,
    };
  } finally {
    progressSimulator.stop();
  }
}

/**
 * Upload multiple files to R2 in parallel
 */
export async function uploadMultipleToR2(options: {
  files: File[];
  purpose: UploadOptions['purpose'];
  onProgress?: (progress: number, fileIndex: number) => void;
  signal?: AbortSignal;
}): Promise<UploadResult[]> {
  const { files, purpose, onProgress, signal } = options;

  const uploadPromises = files.map((file, index) =>
    uploadToR2({
      file,
      purpose,
      onProgress: onProgress
        ? (progress) => onProgress(progress, index)
        : undefined,
      signal,
    }),
  );

  return Promise.all(uploadPromises);
}

// ═══════════ Download Functions ═══════════

/**
 * Download a file from R2 storage
 *
 * @example
 * ```ts
 * const result = await downloadFromR2({ key: 'path/to/file.mp4' });
 * const url = URL.createObjectURL(result.blob);
 * ```
 */
export async function downloadFromR2(
  options: DownloadOptions,
): Promise<DownloadResult> {
  const { key, signal } = options;

  const r2Domain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || '';
  const url = `${r2Domain}/${key}`;

  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }

  const blob = await response.blob();

  return {
    blob,
    contentType:
      response.headers.get('content-type') || 'application/octet-stream',
    fileSize: blob.size,
  };
}

/**
 * Get public URL for an R2 file
 */
export function getR2PublicUrl(key: string): string {
  const r2Domain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || '';
  return `${r2Domain}/${key}`;
}

/**
 * If `url` is a public URL for an object in this project's R2 bucket, returns the
 * object key; otherwise null. Used when migrating URL-based APIs to key-only.
 */
export function tryExtractR2KeyFromPublicUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) {
    if (trimmed.includes('://') || trimmed.includes('..')) return null;
    return trimmed.replace(/^\/+/, '');
  }
  try {
    const u = new URL(trimmed);
    const path = u.pathname.replace(/^\/+/, '');
    if (!path) return null;

    const configured = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN?.trim();
    const accountId = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID?.trim();
    const host = u.hostname.toLowerCase();

    if (configured) {
      try {
        const configUrl = configured.match(/^https?:\/\//i)
          ? configured
          : `https://${configured}`;
        const expectedHost = new URL(configUrl).hostname.toLowerCase();
        if (host === expectedHost) return path;
      } catch {
        /* ignore */
      }
    }
    if (accountId && host === `pub-${accountId}.r2.dev`) {
      return path;
    }
    return null;
  } catch {
    return null;
  }
}
