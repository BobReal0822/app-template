'use client';

/**
 * Canonical toast UI for this app (Sonner). Mount `<Toaster />` once in the root layout.
 * Call sites: `import { toast } from 'sonner'`. Do not add a parallel Radix/shadcn `toast` stack.
 */
import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Sonner defaults: `offset` 32px (desktop), `mobileOffset` 16px (width under 600px).
 * We use a larger `top` so toasts clear app chrome (dashboard 68px; feature up to 64px).
 */
const TOASTER_TOP = '72px';

const TOASTER_OFFSET = { top: TOASTER_TOP, right: '2rem' } as const;
const TOASTER_MOBILE_OFFSET = { top: TOASTER_TOP, right: '1rem' } as const;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      offset={TOASTER_OFFSET}
      mobileOffset={TOASTER_MOBILE_OFFSET}
      toastOptions={{
        closeButton: true,
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          // Sonner LTR default pins the close control to the top-left; move to top-right.
          closeButton:
            'ltr:!left-auto ltr:!right-0 ltr:![transform:translate(35%,-35%)]',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
