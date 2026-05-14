import {
  STEP_INDEX,
  type ForgotPasswordAction,
  type ForgotPasswordState,
  type ForgotPasswordStep,
} from './types';

export function createInitialForgotPasswordState(
  defaultEmail: string,
): ForgotPasswordState {
  return {
    step: defaultEmail ? 'otp' : 'email',
    direction: 1,
    email: defaultEmail,
    otp: '',
    password: '',
    confirmPassword: '',
    status: 'idle',
    error: null,
    cooldownUntil: null,
    success: false,
  };
}

function transitionDirection(
  from: ForgotPasswordStep,
  to: ForgotPasswordStep,
): 1 | -1 {
  return STEP_INDEX[to] >= STEP_INDEX[from] ? 1 : -1;
}

export function forgotPasswordReducer(
  state: ForgotPasswordState,
  action: ForgotPasswordAction,
): ForgotPasswordState {
  switch (action.type) {
    case 'set':
      return {
        ...state,
        [action.field]: action.value,
        error: null,
      };
    case 'requestStart':
      return {
        ...state,
        status: action.status,
        error: null,
      };
    case 'failure':
      return {
        ...state,
        status: 'idle',
        error: action.error,
      };
    case 'sendCodeSuccess':
      return {
        ...state,
        step: 'otp',
        direction: transitionDirection(state.step, 'otp'),
        email: action.email,
        status: 'idle',
        cooldownUntil: action.cooldownUntil,
        error: null,
      };
    case 'resendCodeSuccess':
      return {
        ...state,
        status: 'idle',
        cooldownUntil: action.cooldownUntil,
        error: null,
      };
    case 'advanceToPassword':
      return {
        ...state,
        step: 'password',
        direction: transitionDirection(state.step, 'password'),
        status: 'idle',
        error: null,
      };
    case 'goBack':
      if (action.to === 'email') {
        return {
          ...state,
          step: 'email',
          direction: transitionDirection(state.step, 'email'),
          otp: '',
          error: null,
          status: 'idle',
        };
      }
      return {
        ...state,
        step: 'otp',
        direction: transitionDirection(state.step, 'otp'),
        password: '',
        confirmPassword: '',
        error: null,
        status: 'idle',
      };
    case 'resetSuccess':
      return {
        ...state,
        status: 'idle',
        success: true,
        error: null,
      };
    default:
      return state;
  }
}
