import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';

import { cn } from '@/lib/utils';

interface FeedbackAlertProps {
  description: string;
  className?: string;
  tone?: 'error' | 'success';
  showIcon?: boolean;
}

export function FeedbackAlert({
  description,
  className,
  tone = 'error',
  showIcon = true,
}: FeedbackAlertProps) {
  const isSuccess = tone === 'success';

  return (
    <Alert
      variant={isSuccess ? 'default' : 'destructive'}
      className={cn(
        'text-sm',
        isSuccess && 'border-success/30 bg-success/10 text-success',
        className,
      )}
    >
      <AlertDescription className="flex items-start gap-2">
        {showIcon &&
          (isSuccess ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ))}
        <span className="leading-5">{description}</span>
      </AlertDescription>
    </Alert>
  );
}
