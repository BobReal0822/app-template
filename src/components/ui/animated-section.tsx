'use client';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  animation?:
    | 'fadeUp'
    | 'fadeDown'
    | 'fadeLeft'
    | 'fadeRight'
    | 'fadeIn'
    | 'scaleUp';
  delay?: number;
  duration?: number;
  threshold?: number;
}

export function AnimatedSection({
  children,
  className,
  animation = 'fadeUp',
  delay = 0,
  duration = 700,
  threshold = 0.1,
}: AnimatedSectionProps) {
  const [ref, isVisible] = useScrollAnimation<HTMLDivElement>({ threshold });
  const prefersReducedMotion = useReducedMotion();
  const shouldShow = prefersReducedMotion || isVisible;

  const getInitialStyles = () => {
    switch (animation) {
      case 'fadeUp':
        return 'translate-y-8 opacity-0';
      case 'fadeDown':
        return '-translate-y-8 opacity-0';
      case 'fadeLeft':
        return 'translate-x-8 opacity-0';
      case 'fadeRight':
        return '-translate-x-8 opacity-0';
      case 'fadeIn':
        return 'opacity-0';
      case 'scaleUp':
        return 'scale-95 opacity-0';
      default:
        return 'translate-y-8 opacity-0';
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        prefersReducedMotion
          ? 'transition-none'
          : 'transition-[opacity,translate,scale] ease-out',
        shouldShow
          ? 'translate-y-0 translate-x-0 scale-100 opacity-100'
          : getInitialStyles(),
        className,
      )}
      style={{
        transitionDuration: `${prefersReducedMotion ? 0 : duration}ms`,
        transitionDelay: `${prefersReducedMotion ? 0 : delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
