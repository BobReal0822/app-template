'use client';

import { Check, Circle } from 'lucide-react';

import { cn } from '@/lib/utils';

import type {
  PasswordRequirement,
  PasswordRequirementKey,
} from './use-password-strength';

interface PasswordRequirementsChecklistProps {
  requirements: readonly PasswordRequirement[];
  title: string;
  translateRequirement: (key: PasswordRequirementKey) => string;
}

/** Shared checklist for sign-up and reset-password so rules stay visually consistent. */
export function PasswordRequirementsChecklist({
  requirements,
  title,
  translateRequirement,
}: PasswordRequirementsChecklistProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <p className="text-xs font-medium text-foreground">{title}</p>
      <ul className="mt-2 space-y-1.5" aria-live="polite">
        {requirements.map((item) => (
          <li
            key={item.key}
            className={cn(
              'flex items-center gap-2 text-xs transition-colors',
              item.met ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {item.met ? (
              <Check
                className="h-3.5 w-3.5 shrink-0 text-success transition-colors"
                aria-hidden
              />
            ) : (
              <Circle
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-colors"
                aria-hidden
              />
            )}
            <span>{translateRequirement(item.key)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
