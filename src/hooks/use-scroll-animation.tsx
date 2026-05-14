'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollAnimationOptions = {},
): [RefObject<T>, boolean] {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    triggerOnce = true,
  } = options;
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return [ref as RefObject<T>, isVisible];
}

// Animation variants for different entrance effects
export const animationVariants = {
  fadeUp: 'translate-y-8 opacity-0',
  fadeDown: 'translate-y-[-32px] opacity-0',
  fadeLeft: 'translate-x-8 opacity-0',
  fadeRight: 'translate-x-[-32px] opacity-0',
  fadeIn: 'opacity-0',
  scaleUp: 'scale-95 opacity-0',
  visible: 'translate-y-0 translate-x-0 scale-100 opacity-100',
};
