'use client';

import { useMemo, useState } from 'react';

import { AlertCircle, Lock, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { authClient } from '@/lib/auth/client';

const MIN_PASSWORD_LENGTH = 6;

interface ChangePasswordDialogProps {
  email?: string | null;
}

export function ChangePasswordDialog({ email }: ChangePasswordDialogProps) {
  const t = useTranslations('account.changePassword');
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isPasswordMismatch =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword !== confirmPassword;

  const canSubmit = useMemo(() => {
    if (isSaving) return false;
    if (!email) return false;
    if (!currentPassword || !newPassword || !confirmPassword) return false;
    if (newPassword.length < MIN_PASSWORD_LENGTH) return false; // Minimum 6 characters
    if (newPassword !== confirmPassword) return false;
    return true;
  }, [confirmPassword, currentPassword, email, isSaving, newPassword]);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsSaving(false);
    setFormError(null);
  };

  const handleChangePassword = async () => {
    setFormError(null);

    if (!email) {
      setFormError(t('errors.missingEmail'));
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setFormError(t('errors.passwordTooShort'));

      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError(t('errors.passwordsDoNotMatch'));
      return;
    }

    setIsSaving(true);

    try {
      if (!email) {
        throw new Error('user-not-authenticated');
      }

      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });

      if (!result || result.error) {
        throw new Error(String(result?.error?.message ?? 'update-failed'));
      }

      // Password updated successfully.

      setOpen(false);
      resetForm();
      // Trigger toast after dialog closes to avoid overlay occlusion.
      setTimeout(() => {
        toast.success(t('successUpdated'));
      }, 0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '';

      // Handle common auth errors with user-friendly copy.
      if (errorMessage.includes('wrong-password')) {
        setFormError(t('errors.currentPasswordIncorrect'));
      } else if (errorMessage.includes('requires-recent-login')) {
        setFormError(t('errors.requiresRecentLogin'));
      } else if (errorMessage.includes('invalid password')) {
        setFormError(t('errors.currentPasswordIncorrect'));
      } else if (errorMessage.includes('user-not-authenticated')) {
        setFormError(t('errors.userNotAuthenticated'));
      } else {
        setFormError(t('errors.updateFailed'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl">
          <Lock className="mr-2 h-4 w-4" aria-hidden />
          {t('trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t('currentPasswordPlaceholder')}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">{t('newPassword')}</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('newPasswordPlaceholder')}
              className="rounded-xl"
            />
            {newPassword && newPassword.length < MIN_PASSWORD_LENGTH && (
              <p className="text-xs text-destructive">
                {t('errors.passwordTooShort')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t('confirmNewPassword')}</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('confirmNewPasswordPlaceholder')}
              className="rounded-xl"
            />
            {isPasswordMismatch ? (
              <p className="text-xs text-destructive">
                {t('errors.passwordsDoNotMatch')}
              </p>
            ) : null}
          </div>
          {formError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>{formError}</p>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setOpen(false)}
              disabled={isSaving}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={!canSubmit}
              className="rounded-xl"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  {t('saving')}
                </>
              ) : (
                t('updatePassword')
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
