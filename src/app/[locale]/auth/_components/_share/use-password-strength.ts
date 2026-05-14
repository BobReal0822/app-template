'use client';

import { useMemo } from 'react';

import {
  PASSWORD_MIN_LENGTH,
  hasLetterAndNumber,
} from '@/lib/auth/password-policy';

/**
 * Translation keys callers must define in their own i18n namespace. Keeping
 * the hook namespace-agnostic lets sign-up and reset-password share the same
 * rule logic without forcing one namespace to import from another.
 */
export type PasswordRequirementKey =
  | 'requirementMinLength'
  | 'requirementLetterAndNumber'
  | 'requirementsMatch';

export interface PasswordRequirement {
  key: PasswordRequirementKey;
  met: boolean;
}

export interface PasswordStrength {
  requirements: readonly PasswordRequirement[];
  /** True iff every requirement is satisfied. */
  isValid: boolean;
}

/**
 * Pure, memoized password rule evaluation shared by all auth flows that
 * accept a new password. Uses the shared auth password policy plus a
 * confirm-password match check.
 */
export function usePasswordStrength(
  password: string,
  repeatPassword: string,
): PasswordStrength {
  return useMemo(() => {
    const hasMinLength = password.length >= PASSWORD_MIN_LENGTH;
    const hasLetterNumber = hasLetterAndNumber(password);
    const passwordsMatch =
      password.length > 0 &&
      repeatPassword.length > 0 &&
      password === repeatPassword;

    const requirements: PasswordRequirement[] = [
      { key: 'requirementMinLength', met: hasMinLength },
      { key: 'requirementLetterAndNumber', met: hasLetterNumber },
      { key: 'requirementsMatch', met: passwordsMatch },
    ];

    return {
      requirements,
      isValid: hasMinLength && hasLetterNumber && passwordsMatch,
    };
  }, [password, repeatPassword]);
}
