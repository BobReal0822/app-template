'use client';

import { useState, useCallback, useEffect } from 'react';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';

export interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  confirmText?: string;
  cancelText?: string;
  /** Shown on confirm button while deletion is in progress. */
  deletingText?: string;
}

export function DeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText,
  cancelText,
  deletingText,
}: DeleteDialogProps) {
  const t = useTranslations('deleteDialog');
  const closeLabel = t('closeAriaLabel');
  const resolvedConfirm = confirmText ?? t('confirm');
  const resolvedCancel = cancelText ?? t('cancel');
  const resolvedDeleting = deletingText ?? t('deleting');

  const [isDeleting, setIsDeleting] = useState(false);

  // Reset deleting state when dialog is closed
  useEffect(() => {
    if (!open) {
      setIsDeleting(false);
    }
  }, [open]);

  // Handle body scroll lock
  useEffect(() => {
    if (open) {
      // Lock scroll when modal opens
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        // Restore scroll when modal closes
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  // Handle Escape key
  useEffect(() => {
    if (!open || isDeleting) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, isDeleting, onOpenChange]);

  const handleConfirm = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      // Success - close the dialog
      onOpenChange(false);
    } catch (error) {
      // Keep dialog open on error so user can retry
      console.error('Delete operation failed:', error);
    } finally {
      // Reset deleting state
      setIsDeleting(false);
    }
  }, [onConfirm, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={closeLabel}
        disabled={isDeleting}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal - use theme tokens for light/dark and future theme changes */}
      <div
        className={cn(
          'relative z-10 w-full max-w-lg bg-background rounded-lg shadow-xl border border-border',
          'animate-in fade-in-0 zoom-in-95 duration-200',
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pb-3 pt-6">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          {!isDeleting && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="ml-4 h-auto w-auto p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
              aria-label={closeLabel}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Footer - rounded-b-lg so the footer background follows the modal's bottom radius */}
        <div className="flex items-center justify-end gap-3 rounded-b-lg bg-muted px-6 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium"
          >
            {resolvedCancel}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium"
          >
            {isDeleting ? resolvedDeleting : resolvedConfirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
