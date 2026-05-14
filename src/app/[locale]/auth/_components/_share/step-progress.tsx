'use client';

interface AuthStepProgressProps {
  activeIndex: number;
  totalSteps: number;
  label: string;
}

export function AuthStepProgress({
  activeIndex,
  totalSteps,
  label,
}: AuthStepProgressProps) {
  return (
    <div className="mb-5" role="group" aria-label={label}>
      <div className="sr-only">
        {label}: {activeIndex + 1}/{totalSteps}
      </div>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: totalSteps }, (_, index) => (
          <div
            key={index}
            className={
              index <= activeIndex
                ? 'h-1.5 rounded-full bg-primary transition-colors duration-300'
                : 'h-1.5 rounded-full bg-muted transition-colors duration-300'
            }
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}
