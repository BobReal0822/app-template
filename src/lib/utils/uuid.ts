/**
 * UUID Utility Functions
 *
 * Provides consistent UUID generation across the application.
 * Uses standard UUIDv4 format with hyphens (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).
 */

import { randomUUID } from 'crypto';

/**
 * Generates a standard UUIDv4 with hyphens.
 *
 * @returns A standard UUIDv4 string with hyphens
 * @example
 * generateUuid() // "5c7c2d54-f484-448f-857a-8141a04f4918"
 */
export function generateUuid(): string {
  return randomUUID();
}
