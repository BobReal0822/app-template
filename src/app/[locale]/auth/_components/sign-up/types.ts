export type SignUpStep = 'email' | 'otp' | 'password';

/**
 * Distinct status values let the UI light up only the affected control while
 * a request is in flight, instead of relying on a single boolean that has to
 * disable everything indiscriminately.
 */
export type SignUpStatus =
  | 'idle'
  | 'sending-otp'
  | 'resending-otp'
  | 'verifying-otp'
  | 'completing'
  | 'google';

export type SignUpField = 'email' | 'otp' | 'password' | 'repeatPassword';

export interface SignUpState {
  step: SignUpStep;
  /** Slide direction for the step transition animation. */
  direction: 1 | -1;
  email: string;
  otp: string;
  registrationToken: string | null;
  password: string;
  repeatPassword: string;
  status: SignUpStatus;
  error: string | null;
  cooldownUntil: number | null;
}

export type SignUpAction =
  | { type: 'set'; field: SignUpField; value: string }
  | { type: 'requestStart'; status: Exclude<SignUpStatus, 'idle'> }
  | { type: 'sendOtpSuccess'; email: string; cooldownUntil: number }
  | { type: 'resendOtpSuccess'; cooldownUntil: number }
  | { type: 'verifyOtpSuccess'; registrationToken: string }
  | { type: 'failure'; error: string; resetTo?: SignUpStep }
  | { type: 'goBack'; to: 'email' | 'otp' };

export const STEP_INDEX: Record<SignUpStep, number> = {
  email: 0,
  otp: 1,
  password: 2,
};

export const SIGN_UP_STEPS = [
  'email',
  'otp',
  'password',
] as const satisfies readonly SignUpStep[];
