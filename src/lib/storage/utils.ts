/**
 * Storage Utilities
 *
 * Shared helper functions for storage operations.
 */

import type { FileValidationOptions } from './types';

// ═══════════ Upload Helpers ═══════════

/**
 * Upload file to a presigned URL with progress tracking
 * Uses XHR because fetch doesn't support upload progress
 *
 * Features:
 * - Progress tracking
 * - Timeout handling (scales with file size)
 * - Automatic retry on failure (up to 3 times)
 * - Abort signal support
 */
export function uploadWithProgress(
  uploadUrl: string,
  file: File,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  // Calculate timeout based on file size
  // Base: 30 seconds + 1 second per MB (for slow connections)
  const timeoutMs = 30000 + Math.ceil(file.size / (1024 * 1024)) * 1000;
  const maxRetries = 3;

  const attemptUpload = (_attempt: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      // Handle abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          cleanup();
          xhr.abort();
        });
      }

      // Set timeout
      timeoutId = setTimeout(() => {
        xhr.abort();
        reject(
          new Error(`Upload timed out after ${Math.round(timeoutMs / 1000)}s`),
        );
      }, timeoutMs);

      // Track progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
      }

      xhr.addEventListener('load', () => {
        cleanup();
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        cleanup();
        reject(new Error('Upload failed: network error'));
      });

      xhr.addEventListener('abort', () => {
        cleanup();
        reject(new Error('Upload aborted'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader(
        'Content-Type',
        file.type || 'application/octet-stream',
      );
      xhr.send(file);
    });
  };

  // Retry logic
  const executeWithRetry = async (): Promise<void> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await attemptUpload(attempt);
        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on abort or timeout
        if (lastError.message.includes('aborted') || signal?.aborted) {
          throw lastError;
        }

        // Retry with exponential backoff
        if (attempt < maxRetries) {
          console.warn(
            `[Upload] Attempt ${attempt} failed, retrying... (${lastError.message})`,
          );
          // Exponential backoff: 1s, 2s, 4s
          await new Promise((r) =>
            setTimeout(r, Math.pow(2, attempt - 1) * 1000),
          );
        }
      }
    }

    throw lastError || new Error('Upload failed after retries');
  };

  return executeWithRetry();
}

/**
 * Simple upload without progress tracking (using fetch)
 */
export async function uploadSimple(
  uploadUrl: string,
  file: File,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
    signal,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }
}

// ═══════════ Progress Simulation ═══════════

interface ProgressSimulator {
  start: () => void;
  stop: () => void;
  complete: () => void;
}

/**
 * Simulate progress for operations that don't support real progress
 */
export function createProgressSimulator(
  onProgress: ((progress: number) => void) | undefined,
  signal?: AbortSignal,
): ProgressSimulator {
  let interval: ReturnType<typeof setInterval> | null = null;
  let currentProgress = 0;

  return {
    start: () => {
      if (!onProgress) return;
      interval = setInterval(() => {
        if (currentProgress < 90) {
          currentProgress += 5;
          onProgress(currentProgress);
        }
      }, 500);

      // Handle abort
      if (signal) {
        signal.addEventListener('abort', () => {
          if (interval) clearInterval(interval);
        });
      }
    },
    stop: () => {
      if (interval) clearInterval(interval);
    },
    complete: () => {
      if (interval) clearInterval(interval);
      if (onProgress) onProgress(100);
    },
  };
}

// ═══════════ File Validation ═══════════

/**
 * Validate file before upload
 *
 * @returns Error message if invalid, undefined if valid
 */
export function validateFile(
  file: File,
  options: FileValidationOptions,
): string | undefined {
  const { maxSize, allowedTypes, allowedExtensions } = options;

  // Check size
  if (maxSize && file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / 1024 / 1024);
    return `文件大小超过限制（最大 ${maxSizeMB}MB）`;
  }

  // Check MIME type
  if (allowedTypes && allowedTypes.length > 0) {
    if (!allowedTypes.includes(file.type)) {
      return `不支持的文件类型：${file.type}`;
    }
  }

  // Check extension
  if (allowedExtensions && allowedExtensions.length > 0) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      return `不支持的文件格式。支持：${allowedExtensions.join(', ').toUpperCase()}`;
    }
  }

  return undefined;
}
