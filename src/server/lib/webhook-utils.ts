/**
 * Webhook Utilities
 *
 * Shared utilities for webhook signature generation and verification.
 */

import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Sign a webhook item ID with HMAC-SHA256
 *
 * @param itemId - The item ID to sign
 * @param secret - The secret key for signing
 * @returns The hex-encoded HMAC signature
 */
export function signWebhookItemId(itemId: string, secret: string): string {
  return createHmac('sha256', secret).update(itemId).digest('hex');
}

/**
 * Check if a string is valid hexadecimal
 */
export function isHex(value: string): boolean {
  return /^[0-9a-f]+$/i.test(value);
}

/**
 * Verify webhook signature using timing-safe comparison
 *
 * @param itemId - The item ID that was signed
 * @param sig - The signature to verify
 * @param secret - The secret key used for signing
 * @returns True if signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  itemId: string,
  sig: string,
  secret: string,
): boolean {
  // Validate hex format first
  if (!isHex(sig)) {
    return false;
  }

  const expectedSig = signWebhookItemId(itemId, secret);
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expectedSig, 'hex');

  // Timing-safe comparison to prevent timing attacks
  return a.length === b.length && timingSafeEqual(a, b);
}
