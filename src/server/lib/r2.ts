/**
 * R2 Storage utilities (Vercel-side).
 * Provides functions for generating presigned URLs, deleting files, building
 * public URLs, downloading remote files, and validating user-supplied keys.
 */

import * as fs from 'fs';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { fetchWithTimeout, FETCH_TIMEOUT } from './fetch';
import * as logger from './logger';
import {
  r2AccountId,
  r2AccessKeyId,
  r2SecretAccessKey,
  r2BucketName,
  r2PublicDomain,
} from './secrets';
import { generateUuid } from './uuid';

let s3Client: S3Client | null = null;
const MAX_REMOTE_FETCH_REDIRECTS = 5;

// Common MIME-type → file-extension mapping. Used both when generating R2 keys
// for presigned uploads and when persisting buffers we downloaded from remote
// URLs (e.g. video poster thumbnails). Keep narrow on purpose: unknown types
// fall back to the caller-supplied default (`bin` by default).
const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
};

/**
 * Resolve a file extension for an R2 object key from a MIME type.
 *
 * Strips any `;charset=...` suffix before lookup.
 */
export function getExtensionFromMime(
  contentType: string,
  defaultExt = 'bin',
): string {
  const base = contentType.split(';')[0].trim().toLowerCase();
  return MIME_TO_EXTENSION[base] ?? defaultExt;
}

function requireNonEmpty(name: string, value: string): string {
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function getBucketName(): string {
  return requireNonEmpty('R2_BUCKET_NAME', r2BucketName.value());
}

function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  const accountId = requireNonEmpty(
    'NEXT_PUBLIC_R2_ACCOUNT_ID',
    r2AccountId.value(),
  );
  const accessKeyId = requireNonEmpty(
    'R2_ACCESS_KEY_ID',
    r2AccessKeyId.value(),
  );
  const secretAccessKey = requireNonEmpty(
    'R2_SECRET_ACCESS_KEY',
    r2SecretAccessKey.value(),
  );

  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  return s3Client;
}

export interface CreateR2PresignedPutUrlOptions {
  keyPrefix?: string;
  contentType: string;
  expiresInSeconds?: number;
  /**
   * File extension to use in the generated key (without the leading dot).
   * When omitted, derived from `contentType` via {@link getExtensionFromMime}
   * with `'bin'` as the ultimate fallback.
   */
  format?: string;
}

export interface CreateR2PresignedPutUrlResult {
  key: string;
  url: string;
}

/**
 * Create a presigned PUT URL for uploading to R2
 *
 * @param opts - Options for the presigned URL
 * @returns Object containing the R2 key and presigned URL
 */
export async function createR2PresignedPutUrl(
  opts: CreateR2PresignedPutUrlOptions,
): Promise<CreateR2PresignedPutUrlResult> {
  const {
    keyPrefix = 'gen-media',
    contentType,
    expiresInSeconds = 3600,
    format = getExtensionFromMime(contentType),
  } = opts;

  const key = `${keyPrefix}/${generateUuid()}.${format}`;

  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(getS3Client(), command, {
    expiresIn: expiresInSeconds,
  });

  return { key, url };
}

/**
 * Delete a file from R2 storage
 *
 * @param key - The R2 object key (e.g., "gen-image/uuid.jpg")
 * @returns Promise<boolean> - true if deletion succeeds or file doesn't exist, false otherwise
 */
export async function deleteR2File(key: string): Promise<boolean> {
  if (!key) {
    logger.warn('deleteR2File: Empty key provided');
    return true;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    });

    await getS3Client().send(command);

    logger.info('Successfully deleted R2 file:', { key });
    return true;
  } catch (error) {
    // Check if error is "Not Found" - this is okay, file already deleted
    if (error instanceof Error && error.name === 'NoSuchKey') {
      logger.info('R2 file does not exist (already deleted):', { key });
      return true;
    }

    logger.error('Error deleting R2 file:', {
      key,
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
    });
    return false;
  }
}

function inferRemoteFileExtension(
  contentType: string,
  sourceUrl: string,
): string {
  let ext = 'bin';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) {
    ext = 'jpg';
  } else if (contentType.includes('png')) {
    ext = 'png';
  } else if (contentType.includes('webp')) {
    ext = 'webp';
  } else if (contentType.includes('gif')) {
    ext = 'gif';
  } else if (contentType.includes('mp4')) {
    ext = 'mp4';
  } else if (contentType.includes('webm')) {
    ext = 'webm';
  } else if (contentType.includes('quicktime') || sourceUrl.includes('.mov')) {
    ext = 'mov';
  } else {
    const urlMatch = sourceUrl.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    if (urlMatch) {
      ext = urlMatch[1].toLowerCase();
    }
  }
  return ext;
}

export interface UploadBufferToR2Options {
  keyPrefix?: string;
  /** When set, skips auto-generated key (e.g. fixed key for idempotent uploads). */
  key?: string;
  contentType: string;
  /** Used with `contentType` to pick file extension when `key` is omitted. */
  sourceUrlForExtension?: string;
}

/**
 * Upload an in-memory buffer to R2 (used after dimension checks or other validation).
 */
export async function uploadBufferToR2(
  buffer: Buffer,
  opts: UploadBufferToR2Options,
): Promise<{ key: string }> {
  const {
    keyPrefix = 'uploads',
    key: fixedKey,
    contentType: rawContentType,
    sourceUrlForExtension = '',
  } = opts;

  const contentType = rawContentType.split(';')[0].trim();

  let key = fixedKey;
  if (!key) {
    const ext = inferRemoteFileExtension(contentType, sourceUrlForExtension);
    key = `${keyPrefix}/${generateUuid()}.${ext}`;
  }

  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await getS3Client().send(command);

  logger.info('Successfully uploaded buffer to R2:', {
    key,
    contentType,
    size: buffer.length,
  });

  return { key };
}

/**
 * Upload a remote file to R2 storage
 *
 * Downloads a file from a remote URL and uploads it to R2.
 * Automatically detects content type from response headers or URL.
 *
 * @param remoteUrl - The URL of the file to download
 * @param opts - Options including keyPrefix
 * @returns Object containing the R2 key
 */
export async function uploadRemoteFileToR2(
  remoteUrl: string,
  opts: {
    keyPrefix?: string;
    key?: string;
    skipDnsRebindingCheck?: boolean;
  } = {},
): Promise<{ key: string }> {
  const {
    keyPrefix = 'uploads',
    key: fixedKey,
    skipDnsRebindingCheck = false,
  } = opts;

  const response = await fetchRemoteFileSafely(remoteUrl, {
    skipDnsRebindingCheck,
  });

  if (!response.ok) {
    throw new Error(
      `Failed to download file: ${response.status} ${response.statusText}`,
    );
  }

  let contentType =
    response.headers.get('content-type') || 'application/octet-stream';
  contentType = contentType.split(';')[0].trim();

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return uploadBufferToR2(buffer, {
    keyPrefix,
    key: fixedKey,
    contentType,
    sourceUrlForExtension: remoteUrl,
  });
}

function ipv4ToInt(ip: string): number {
  return (
    ip
      .split('.')
      .map((part) => Number.parseInt(part, 10))
      .reduce((acc, octet) => (acc << 8) + octet, 0) >>> 0
  );
}

function isPrivateIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  const inRange = (start: string, end: string) =>
    value >= ipv4ToInt(start) && value <= ipv4ToInt(end);

  return (
    inRange('10.0.0.0', '10.255.255.255') ||
    inRange('172.16.0.0', '172.31.255.255') ||
    inRange('192.168.0.0', '192.168.255.255') ||
    inRange('127.0.0.0', '127.255.255.255') ||
    inRange('169.254.0.0', '169.254.255.255')
  );
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:')
  );
}

function isPrivateIpAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

function isLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === 'localhost' || h.endsWith('.localhost');
}

async function assertSafeRemoteDownloadUrl(
  rawUrl: string,
  opts: { skipDnsRebindingCheck: boolean },
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid remote URL');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Only http(s) remote URLs are allowed');
  }

  if (isLocalHostname(url.hostname)) {
    throw new Error('Refusing to fetch localhost URL');
  }

  const directIpVersion = isIP(url.hostname);
  if (directIpVersion > 0 && isPrivateIpAddress(url.hostname)) {
    throw new Error('Refusing to fetch private network IP');
  }

  if (!opts.skipDnsRebindingCheck && directIpVersion === 0) {
    const records = await lookup(url.hostname, { all: true, verbatim: true });
    if (records.length === 0) {
      throw new Error('Unable to resolve remote URL host');
    }
    if (!records.some((record) => !isPrivateIpAddress(record.address))) {
      throw new Error('Refusing to fetch host resolved to private network');
    }
  }

  return url;
}

async function fetchRemoteFileSafely(
  initialUrl: string,
  opts: { skipDnsRebindingCheck: boolean },
): Promise<Response> {
  let currentUrl = initialUrl;

  for (let i = 0; i <= MAX_REMOTE_FETCH_REDIRECTS; i++) {
    await assertSafeRemoteDownloadUrl(currentUrl, opts);

    const response = await fetchWithTimeout(
      currentUrl,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MediaDownloader/1.0)',
        },
        redirect: 'manual',
      },
      FETCH_TIMEOUT.FILE,
    );

    const isRedirect =
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.has('location');
    if (!isRedirect) {
      return response;
    }

    const location = response.headers.get('location');
    if (!location) {
      throw new Error(
        `Redirect response without location header: ${response.status}`,
      );
    }

    const nextUrl = new URL(location, currentUrl);
    currentUrl = nextUrl.toString();
  }

  throw new Error(
    `Too many redirects when fetching remote file (>${MAX_REMOTE_FETCH_REDIRECTS})`,
  );
}

export interface UploadLocalFileToR2WithPresignedPutUrlOptions {
  filePath: string;
  keyPrefix: string;
  contentType: string;
  format: string;
  expiresInSeconds?: number;
}

/**
 * Maximum file size for upload using presigned PUT URL (500MB)
 * Files larger than this should use streaming upload methods to avoid memory issues.
 */
const MAX_FILE_SIZE_FOR_PRESIGNED_UPLOAD = 500 * 1024 * 1024; // 500MB

/**
 * Upload a local file to R2 using a presigned PUT URL.
 *
 * This keeps the key generation logic centralized (UUID + extension),
 * while allowing callers to control contentType/format and compute file size.
 *
 * Note: This function loads the entire file into memory. For files larger than
 * MAX_FILE_SIZE_FOR_PRESIGNED_UPLOAD, consider using streaming upload methods.
 */
export async function uploadLocalFileToR2WithPresignedPutUrl(
  opts: UploadLocalFileToR2WithPresignedPutUrlOptions,
): Promise<{ key: string; publicUrl: string | null; fileSize: number }> {
  const { filePath, keyPrefix, contentType, format, expiresInSeconds } = opts;

  // Check file size before reading into memory
  const stats = fs.statSync(filePath);
  if (stats.size > MAX_FILE_SIZE_FOR_PRESIGNED_UPLOAD) {
    const sizeMB = Math.round(stats.size / (1024 * 1024));
    const maxMB = Math.round(
      MAX_FILE_SIZE_FOR_PRESIGNED_UPLOAD / (1024 * 1024),
    );
    throw new Error(
      `File size (${sizeMB}MB) exceeds maximum allowed size (${maxMB}MB) for presigned upload. Use streaming upload for larger files.`,
    );
  }

  // Read file into memory
  const fileBuffer = fs.readFileSync(filePath);

  // Verify file size matches buffer size (sanity check)
  if (stats.size !== fileBuffer.length) {
    logger.warn('File size mismatch', {
      filePath,
      statsSize: stats.size,
      bufferSize: fileBuffer.length,
    });
  }

  const { key, url } = await createR2PresignedPutUrl({
    keyPrefix,
    contentType,
    format,
    expiresInSeconds,
  });

  // Use fetchWithTimeout for file uploads (10 minutes timeout for large files)
  const response = await fetchWithTimeout(
    url,
    {
      method: 'PUT',
      body: fileBuffer,
      headers: {
        'Content-Type': contentType,
      },
    },
    FETCH_TIMEOUT.FILE,
  );

  if (!response.ok) {
    const statusText = response.statusText || 'Unknown';
    let errorBody = '';
    try {
      // Try to get error body for more context (limit to first 500 chars)
      const text = await response.text();
      errorBody = text.length > 500 ? text.substring(0, 500) + '...' : text;
    } catch {
      // Ignore errors reading response body
    }

    // Log detailed error information server-side for debugging
    // This includes potentially sensitive information that should NOT be exposed to users
    logger.error('R2 upload failed', {
      key,
      status: response.status,
      statusText,
      errorBody,
    });

    // Throw generic error message that is safe to propagate to users
    // Do not include errorBody or other sensitive details in the error message
    throw new Error(
      `Failed to upload file to R2: HTTP ${response.status} ${statusText}`,
    );
  }

  const publicUrl = getR2PublicUrl(key);
  logger.info('Uploaded local file to R2 via presigned PUT', {
    key,
    size: stats.size,
  });

  return { key, publicUrl, fileSize: stats.size };
}

/**
 * Get R2 public URL for a given key
 *
 * NEXT_PUBLIC_R2_PUBLIC_DOMAIN should be configured as a custom domain or public URL.
 * Format: https://your-domain.com or https://pub-xxxxx.r2.dev
 *
 * If NEXT_PUBLIC_R2_PUBLIC_DOMAIN is not set, will use default R2 public domain:
 * https://pub-{NEXT_PUBLIC_R2_ACCOUNT_ID}.r2.dev
 *
 * @param key - The R2 object key
 * @returns Public URL string or null if configuration is missing
 */
export function getR2PublicUrl(key: string): string | null {
  let domainFromConfig = r2PublicDomain.value();

  // If NEXT_PUBLIC_R2_PUBLIC_DOMAIN is not configured, use default R2 public domain
  if (!domainFromConfig) {
    const accountId = r2AccountId.value();
    if (!accountId) {
      logger.warn(
        'Neither NEXT_PUBLIC_R2_PUBLIC_DOMAIN nor NEXT_PUBLIC_R2_ACCOUNT_ID is configured, cannot build public URL',
      );
      return null;
    }
    // Default R2 public domain format: https://pub-{account_id}.r2.dev
    domainFromConfig = `https://pub-${accountId}.r2.dev`;
  }

  // Remove trailing slash if present
  const domain = domainFromConfig.replace(/\/$/, '');
  // Remove leading slash from key if present
  const cleanKey = key.replace(/^\//, '');

  return `${domain}/${cleanKey}`;
}

// --- User media keys (gen APIs) ------------------------------------------------
// Clients send R2 object keys only; handlers resolve to public URLs before Fal.

/** Max length for a bucket-relative key string from client input. */
export const MAX_USER_MEDIA_KEY_LENGTH = 1024;

export function normalizeUserMediaKey(raw: string): string {
  return raw.trim().replace(/^\/+/, '');
}

/**
 * Rejects path traversal and obvious URL payloads; keys are bucket-relative paths.
 */
export function isValidUserMediaKey(key: string): boolean {
  const k = normalizeUserMediaKey(key);
  if (!k || k.length > MAX_USER_MEDIA_KEY_LENGTH) return false;
  if (k.includes('..') || k.includes('://')) return false;
  if (k.startsWith('.')) return false;
  return true;
}

/**
 * Validates key and returns public HTTPS URL for Fal, or null if invalid/config missing.
 */
export function resolveUserMediaKeyToPublicUrl(key: string): string | null {
  if (!isValidUserMediaKey(key)) return null;
  return getR2PublicUrl(normalizeUserMediaKey(key));
}

// --- Image download / re-upload helpers --------------------------------------
// Used by routes that need to mirror a third-party image URL (e.g. video poster
// thumbnails returned from a parser API) into our own R2 bucket.

/**
 * Download an image from a URL with size and timeout limits.
 *
 * Validates that the response Content-Type starts with `image/` and rejects
 * payloads larger than `maxSizeBytes`. Throws on any failure.
 */
export async function downloadImage(
  imageUrl: string,
  maxSizeBytes: number = 2 * 1024 * 1024,
  timeoutMs = 10_000,
): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetchWithTimeout(imageUrl, {}, timeoutMs);

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';

  if (!contentType.startsWith('image/')) {
    throw new Error('URL does not point to an image');
  }

  const arrayBuffer = await response.arrayBuffer();

  if (arrayBuffer.byteLength > maxSizeBytes) {
    throw new Error(
      `Image too large: ${Math.round(arrayBuffer.byteLength / 1024)}KB (max: ${Math.round(maxSizeBytes / 1024)}KB)`,
    );
  }

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
  };
}

/**
 * Download an image from a URL and persist it to R2.
 *
 * @returns The public R2 URL for the uploaded image.
 * @throws If the download fails, the URL is not an image, the size exceeds the
 *         limit, or R2 public-domain configuration is missing.
 */
export async function downloadAndUploadImageToR2(
  imageUrl: string,
  keyPrefix = 'images',
  maxSizeBytes: number = 2 * 1024 * 1024,
): Promise<string> {
  const { buffer, contentType } = await downloadImage(imageUrl, maxSizeBytes);
  const { key } = await uploadBufferToR2(buffer, {
    keyPrefix,
    contentType,
    sourceUrlForExtension: imageUrl,
  });
  const publicUrl = getR2PublicUrl(key);
  if (!publicUrl) {
    throw new Error('R2 public domain is not configured');
  }
  return publicUrl;
}
