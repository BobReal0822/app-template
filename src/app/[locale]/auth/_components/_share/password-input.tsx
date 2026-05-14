'use client';

import { type ComponentPropsWithoutRef, forwardRef, useState } from 'react';

import { Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { cn } from '@/lib/utils';

interface PasswordInputProps extends Omit<
  ComponentPropsWithoutRef<typeof Input>,
  'type'
> {
  /** aria-label when the password is hidden ("Show password"). */
  showLabel: string;
  /** aria-label when the password is shown ("Hide password"). */
  hideLabel: string;
  /** Optional class for the wrapping container. */
  containerClassName?: string;
}

/**
 * Password input with a built-in show/hide toggle. Owns its own visibility
 * state so the parent form doesn't need to keep one boolean per password
 * field. The reveal toggle is excluded from the tab order to keep keyboard
 * navigation focused on the input flow.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    { showLabel, hideLabel, className, containerClassName, ...props },
    ref,
  ) {
    const [show, setShow] = useState(false);

    return (
      <div className={cn('relative', containerClassName)}>
        <Input
          ref={ref}
          type={show ? 'text' : 'password'}
          className={cn('h-11 px-4 pr-12', className)}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          tabIndex={-1}
          onClick={() => setShow((prev) => !prev)}
          aria-label={show ? hideLabel : showLabel}
          aria-pressed={show}
          className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2 text-muted-foreground transition-[background-color,color] hover:bg-muted/70 hover:text-foreground"
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </Button>
      </div>
    );
  },
);
