'use client';

import type React from 'react';
import { useState, useRef, useMemo, useEffect } from 'react';

import { X, Plus, ImageIcon, MessageSquare, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

import { useAuth } from '@/contexts/auth-context';
import { usePathname } from '@/i18n/routing';
import { callApi, ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/utils/error-messages';

interface FeedbackModalProps {
  /** Optional trigger content. Default: MessageSquare icon + "Feedback" */
  children?: React.ReactNode;
  /** Optional class name for the trigger button (e.g. "hidden lg:flex") */
  triggerClassName?: string;
}

const MAX_CHARS = 3000;
const MAX_ATTACHMENTS = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Upload a file to R2 via presigned URL
 * @throws {ApiError} When API returns an error (contains error code)
 * @throws {Error} When upload fails
 */
async function uploadFileToR2(file: File): Promise<string> {
  // Step 1: Get presigned URL from API route
  const response = await fetch('/api/get-upload-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      purpose: 'feedback',
    }),
  });

  const result = await response.json();

  if (!response.ok || result.code !== 0) {
    // Use error code only; do not pass backend result.message to avoid exposing it
    const errorCode = result.code || 5001;
    throw new ApiError(errorCode, '');
  }

  const { uploadUrl, key } = result.data;

  // Step 2: Upload file directly to R2
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new ApiError(5001, '');
  }

  // Return the key (file path) instead of URL
  return key;
}

function DefaultTrigger({ label }: { label: string }) {
  return (
    <>
      <MessageSquare className="h-4 w-4" />
      {label}
    </>
  );
}

export function FeedbackModal({
  children,
  triggerClassName,
}: FeedbackModalProps) {
  const tErrors = useTranslations('errors');
  const t = useTranslations('feedbackModal');
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'submitting' | 'submitted'
  >('idle');
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  // Create object URLs for image previews and track them for cleanup
  const previewUrls = useMemo(() => {
    return attachments.map((file) =>
      file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    );
  }, [attachments]);

  // Cleanup object URLs when attachments change or component unmounts
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [previewUrls]);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;

    setSubmitStatus('submitting');

    try {
      if (!user) {
        toast.error(t('authRequired'), {
          description: t('authRequiredDescription'),
        });
        setSubmitStatus('idle');
        return;
      }

      // Upload attachments to R2 and get keys (file paths)
      let attachmentKeys: string[] = [];
      if (attachments.length > 0) {
        setUploadingAttachments(true);
        try {
          const uploadPromises = attachments.map(async (file) => {
            // Validate file size
            if (file.size > MAX_FILE_SIZE) {
              throw new Error('File too large');
            }

            return uploadFileToR2(file);
          });

          attachmentKeys = await Promise.all(uploadPromises);
        } catch (error) {
          console.error('Error uploading attachments:', error);
          const errorMessage =
            error instanceof ApiError
              ? getErrorMessage(tErrors, error.code)
              : tErrors('default');
          toast.error(errorMessage);
          setSubmitStatus('idle');
          return;
        } finally {
          setUploadingAttachments(false);
        }
      }

      // Submit feedback via app API
      // Store keys (file paths) instead of URLs for flexibility
      await callApi('/feedback', {
        source: 'in_app_modal',
        category: 'bug',
        email: user.email || '',
        content: feedback.trim(),
        meta: {
          pagePath: pathname,
        },
        attrs: attachmentKeys,
      });

      setSubmitStatus('submitted');

      // Reset and close after showing success
      resetTimeoutRef.current = setTimeout(() => {
        setFeedback('');
        setAttachments([]);
        setSubmitStatus('idle');
        setOpen(false);
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      const errorMessage =
        error instanceof ApiError
          ? getErrorMessage(tErrors, error.code)
          : tErrors('default');
      toast.error(errorMessage);
      setSubmitStatus('idle');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);

      // Check total attachments limit
      if (attachments.length + newFiles.length > MAX_ATTACHMENTS) {
        toast.error(t('maxAttachments', { max: MAX_ATTACHMENTS }));
        return;
      }

      // Validate file sizes
      const invalidFiles = newFiles.filter((file) => file.size > MAX_FILE_SIZE);
      if (invalidFiles.length > 0) {
        toast.error(t('fileTooLarge'));
        return;
      }

      setAttachments((prev) => [...prev, ...newFiles]);
    }

    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'gap-1.5 rounded-lg text-sm font-normal text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            triggerClassName,
          )}
        >
          {children ?? <DefaultTrigger label={t('triggerLabel')} />}
        </Button>
      </DialogTrigger>
      <DialogContent
        animation="fade"
        className="gap-0 overflow-hidden rounded-xl border-border/70 p-0 sm:max-w-[560px]"
        aria-busy={submitStatus === 'submitting' || uploadingAttachments}
      >
        <DialogHeader className="space-y-1 bg-background px-6 pb-3 pt-6">
          <DialogTitle className="text-lg font-semibold tracking-tight sm:text-xl">
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-muted-foreground">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        {submitStatus === 'submitted' ? (
          <div className="p-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted/30">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-foreground">
              {t('thankYou')}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('successMessage')}
            </p>
          </div>
        ) : (
          <div className="space-y-5 px-6 pb-6 pt-3">
            <div className="relative">
              <Textarea
                value={feedback}
                onChange={(e) =>
                  setFeedback(e.target.value.slice(0, MAX_CHARS))
                }
                placeholder={t('placeholder')}
                aria-label={t('placeholder')}
                aria-describedby="feedback-char-count"
                className="min-h-[180px] resize-none rounded-lg border-input bg-background pb-8 pr-4 shadow-none focus-visible:border-ring/50"
              />
              <span
                id="feedback-char-count"
                className="absolute bottom-3 right-3 text-xs text-muted-foreground"
                aria-live="polite"
              >
                {feedback.length}/{MAX_CHARS}
              </span>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-foreground">
                {t('attachment')}{' '}
                <span className="font-normal text-muted-foreground">
                  {t('optional')}
                </span>
              </p>

              <div className="flex flex-wrap gap-3">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-input bg-muted/20"
                  >
                    {previewUrls[index] ? (
                      <Image
                        src={previewUrls[index]}
                        alt={file.name}
                        fill
                        className="rounded-lg object-cover"
                        unoptimized // Required for blob URLs
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => removeAttachment(index)}
                      aria-label={`${t('attachment')}: ${file.name}`}
                      className="absolute -right-2 -top-2 h-6 w-6 rounded-full border border-border/70 bg-background p-0 text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={t('attachment')}
                  className="h-20 w-20 rounded-lg border border-dashed border-input bg-background hover:border-ring/40 hover:bg-muted/20 focus-visible:ring-1 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            <div className="pt-1">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={
                  !feedback.trim() ||
                  submitStatus === 'submitting' ||
                  uploadingAttachments
                }
                className="h-11 w-full rounded-xl text-sm font-medium"
              >
                {uploadingAttachments
                  ? t('uploading')
                  : submitStatus === 'submitting'
                    ? t('submitting')
                    : t('submit')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
