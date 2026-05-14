'use client';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useScrollAnimation } from '@/hooks/use-scroll-animation';
import { cn } from '@/lib/utils';
import { Children, type ReactNode } from 'react';

interface StaggerChildrenProps {
  children: ReactNode;
  className?: string;
  childClassName?: string;
  staggerDelay?: number;
  duration?: number;
  animation?: 'fadeUp' | 'fadeIn' | 'scaleUp';
  threshold?: number;
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function StaggerChildren({
  children,
  className,
  childClassName,
  staggerDelay = 100,
  duration = 500,
  animation = 'fadeUp',
  threshold = 0.1,
}: StaggerChildrenProps) {
  const [ref, isVisible] = useScrollAnimation<HTMLDivElement>({ threshold });
  const prefersReducedMotion = useReducedMotion();
  const shouldShow = prefersReducedMotion || isVisible;

  const getInitialStyles = () => {
    switch (animation) {
      case 'fadeUp':
        return 'translate-y-6 opacity-0';
      case 'fadeIn':
        return 'opacity-0';
      case 'scaleUp':
        return 'scale-95 opacity-0';
      default:
        return 'translate-y-6 opacity-0';
    }
  };

  return (
    <div ref={ref} className={className}>
      {Children.map(children, (child, index) => (
        <StaggerItem
          className={cn(
            prefersReducedMotion
              ? 'transition-none'
              : 'transition-[opacity,translate,scale] ease-out',
            shouldShow
              ? 'translate-y-0 scale-100 opacity-100'
              : getInitialStyles(),
            childClassName,
          )}
          style={{
            transitionDuration: `${prefersReducedMotion ? 0 : duration}ms`,
            transitionDelay: `${prefersReducedMotion ? 0 : index * staggerDelay}ms`,
          }}
        >
          {child}
        </StaggerItem>
      ))}
    </div>
  );
}

export function StaggerItem({ children, className, style }: StaggerItemProps) {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
