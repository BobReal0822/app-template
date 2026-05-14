import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Compose Tailwind class names with conflict-aware merge.
 *
 * Standard shadcn/ui helper. Used by every UI primitive; lives in its own file
 * so the most-imported utility in the app is easy to find by filename.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
