import { createHash, createHmac, randomInt, timingSafeEqual } from 'crypto';

import { AUTH_RUNTIME } from '@/server/config/runtime';

let hasWarnedMissingOtpSecret = false;

export function generateOtp(): string {
  return randomInt(0, 1_000_000)
    .toString()
    .padStart(AUTH_RUNTIME.OTP_LENGTH, '0');
}

function hashOtpLegacy(otp: string, email: string): string {
  return createHash('sha256').update(`${email}:${otp}`).digest('hex');
}

function getOtpHashSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET || '';
  if (secret) return secret;

  // Production must fail closed. Development can still use legacy hashing
  // so local setup remains usable while surfacing a clear warning.
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[auth/otp] BETTER_AUTH_SECRET is missing; OTP hashing is unavailable in production',
    );
    throw new Error('Auth configuration error');
  }

  if (!hasWarnedMissingOtpSecret) {
    hasWarnedMissingOtpSecret = true;
    console.warn(
      '[auth/otp] BETTER_AUTH_SECRET is missing; using legacy OTP hashing in non-production',
    );
  }
  return '';
}

function hashOtpV2(otp: string, email: string): string {
  const secret = getOtpHashSecret();
  if (!secret) {
    return hashOtpLegacy(otp, email);
  }
  return createHmac('sha256', secret).update(`${email}:${otp}`).digest('hex');
}

function constantTimeEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function hashOtp(otp: string, email: string): string {
  return `v2:${hashOtpV2(otp, email)}`;
}

export function verifyOtpHash(
  storedHash: string,
  otp: string,
  email: string,
): boolean {
  if (storedHash.startsWith('v2:')) {
    return constantTimeEquals(storedHash, hashOtp(otp, email));
  }
  // Backward compatibility for OTPs issued before v2 rollout.
  return constantTimeEquals(storedHash, hashOtpLegacy(otp, email));
}
