export type ForgotPasswordStep = 'email' | 'otp' | 'password';

export type ForgotPasswordStatus =
  | 'idle'
  | 'sending-code'
  | 'resending-code'
  | 'verifying-otp'
  | 'submitting-reset';

export type ForgotPasswordField =
  | 'email'
  | 'otp'
  | 'password'
  | 'confirmPassword';

export interface ForgotPasswordState {
  step: ForgotPasswordStep;
  direction: 1 | -1;
  email: string;
  otp: string;
  password: string;
  confirmPassword: string;
  status: ForgotPasswordStatus;
  error: string | null;
  cooldownUntil: number | null;
  success: boolean;
}

export type ForgotPasswordAction =
  | { type: 'set'; field: ForgotPasswordField; value: string }
  | { type: 'requestStart'; status: Exclude<ForgotPasswordStatus, 'idle'> }
  | { type: 'failure'; error: string }
  | { type: 'sendCodeSuccess'; email: string; cooldownUntil: number }
  | { type: 'resendCodeSuccess'; cooldownUntil: number }
  | { type: 'advanceToPassword' }
  | { type: 'goBack'; to: 'email' | 'otp' }
  | { type: 'resetSuccess' };

export const FORGOT_PASSWORD_STEPS = [
  'email',
  'otp',
  'password',
] as const satisfies readonly ForgotPasswordStep[];

export const STEP_INDEX: Record<ForgotPasswordStep, number> = {
  email: 0,
  otp: 1,
  password: 2,
};
