import {
  STEP_INDEX,
  type SignUpAction,
  type SignUpState,
  type SignUpStep,
} from './types';

export const initialSignUpState: SignUpState = {
  step: 'email',
  direction: 1,
  email: '',
  otp: '',
  registrationToken: null,
  password: '',
  repeatPassword: '',
  status: 'idle',
  error: null,
  cooldownUntil: null,
};

function transitionDirection(from: SignUpStep, to: SignUpStep): 1 | -1 {
  return STEP_INDEX[to] >= STEP_INDEX[from] ? 1 : -1;
}

/**
 * Pure reducer for the sign-up flow. All step transitions and per-step data
 * cleanup are encoded here so the UI only ever dispatches semantic events
 * (e.g. `verifyOtpSuccess`) instead of micromanaging individual `useState`
 * calls and forgetting to clear stale tokens or otp codes.
 */
export function signUpReducer(
  state: SignUpState,
  action: SignUpAction,
): SignUpState {
  switch (action.type) {
    case 'set':
      return { ...state, [action.field]: action.value };

    case 'requestStart':
      return { ...state, status: action.status, error: null };

    case 'sendOtpSuccess':
      return {
        ...state,
        step: 'otp',
        direction: transitionDirection(state.step, 'otp'),
        email: action.email,
        otp: '',
        cooldownUntil: action.cooldownUntil,
        status: 'idle',
        error: null,
      };

    case 'resendOtpSuccess':
      return {
        ...state,
        cooldownUntil: action.cooldownUntil,
        status: 'idle',
        error: null,
      };

    case 'verifyOtpSuccess':
      return {
        ...state,
        step: 'password',
        direction: transitionDirection(state.step, 'password'),
        registrationToken: action.registrationToken,
        status: 'idle',
        error: null,
      };

    case 'failure': {
      if (!action.resetTo) {
        return { ...state, status: 'idle', error: action.error };
      }
      return {
        ...state,
        step: action.resetTo,
        direction: transitionDirection(state.step, action.resetTo),
        status: 'idle',
        error: action.error,
        // Falling back to `email` invalidates the OTP and any token derived
        // from it; falling back to `otp` only invalidates the token.
        otp: action.resetTo === 'email' ? '' : state.otp,
        registrationToken:
          action.resetTo === 'email' || action.resetTo === 'otp'
            ? null
            : state.registrationToken,
      };
    }

    case 'goBack':
      if (action.to === 'email') {
        return {
          ...state,
          step: 'email',
          direction: transitionDirection(state.step, 'email'),
          otp: '',
          registrationToken: null,
          error: null,
        };
      }
      return {
        ...state,
        step: 'otp',
        direction: transitionDirection(state.step, 'otp'),
        registrationToken: null,
        password: '',
        repeatPassword: '',
        error: null,
      };
  }
}
