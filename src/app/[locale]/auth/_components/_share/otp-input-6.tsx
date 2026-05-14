'use client';

import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from 'react';

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';

import { cn } from '@/lib/utils';

/** Strips non-digits so pastes like `123-456`, `123 456`, or SMS/email wrappers still fill slots. */
function defaultPasteTransformer(pasted: string): string {
  return pasted.replace(/\D/g, '');
}

const OTP_SLOT_CLASS =
  'h-12 w-12 rounded-md border border-input text-lg font-semibold transition-[border-color,color] [&.z-10]:ring-2 [&.z-10]:ring-primary [&.z-10]:ring-offset-2 [&.z-10]:ring-offset-background';

// `OTPInput` exposes a discriminated `render` vs `children` API; we always
// pass slot children, so explicitly drop `render` to keep the overload pinned
// and let TypeScript narrow the prop type without ambiguity.
type InputOTPPropsBase = Omit<
  ComponentPropsWithoutRef<typeof InputOTP>,
  'maxLength' | 'pattern' | 'children' | 'inputMode' | 'autoComplete' | 'render'
>;

/**
 * 6-slot numeric OTP input shared by every auth flow that accepts a one-time
 * passcode. Centralizing the slot styling and the `inputMode`/`autoComplete`
 * defaults keeps the visual parity between sign-up and reset-password and
 * removes 6 lines of repeated `<InputOTPSlot />` from each call site.
 */
export const OtpInput6 = forwardRef<
  ComponentRef<typeof InputOTP>,
  InputOTPPropsBase
>(function OtpInput6({ containerClassName, pasteTransformer, ...rest }, ref) {
  return (
    <InputOTP
      ref={ref}
      maxLength={6}
      pattern="^[0-9]*$"
      inputMode="numeric"
      autoComplete="one-time-code"
      pasteTransformer={pasteTransformer ?? defaultPasteTransformer}
      containerClassName={cn('w-full justify-center', containerClassName)}
      {...rest}
    >
      <InputOTPGroup className="gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <InputOTPSlot key={i} index={i} className={OTP_SLOT_CLASS} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
});
