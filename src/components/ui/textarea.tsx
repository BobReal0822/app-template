import * as React from 'react';

import { cn } from '@/lib/utils/index';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[60px] w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-base transition-colors placeholder:text-muted-foreground/60 focus:placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:border-ring/70 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
