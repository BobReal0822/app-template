import { cn } from '@/lib/utils';

const strengthClass = {
  soft: 'dark-image-overlay-soft',
  medium: 'dark-image-overlay-medium',
  strong: 'dark-image-overlay-strong',
} as const;

export type DarkImageOverlayStrength = keyof typeof strengthClass;

type DarkImageOverlayProps = {
  strength?: DarkImageOverlayStrength;
  className?: string;
  as?: 'div' | 'span';
};

export function DarkImageOverlay({
  strength = 'medium',
  className,
  as: Tag = 'div',
}: DarkImageOverlayProps) {
  return (
    <Tag
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0',
        strengthClass[strength],
        className,
      )}
    />
  );
}
