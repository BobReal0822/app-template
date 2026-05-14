'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/auth-context';
import { useUserData } from '@/hooks/use-user-data';
import { getErrorMessage } from '@/lib/utils/error-messages';
import { getR2PublicUrl } from '@/lib/utils/r2';

export function useProfileSettings() {
  const t = useTranslations('account');
  const tErrors = useTranslations('errors');
  const { userData, updateUserData, loading: userLoading } = useUserData();
  const { user } = useAuth();

  const [nameDraft, setNameDraft] = useState(userData?.name || '');
  const [avatarKey, setAvatarKey] = useState(userData?.avatar || '');
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayName = userData?.name || '';
  const hasAvatarSelection = Boolean(fileInputRef.current?.files?.[0]);
  const hasNameChange = nameDraft !== (userData?.name || '');
  const hasPendingChanges = hasNameChange || hasAvatarSelection;

  const clearPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setAvatarPreviewUrl(null);
  }, []);

  useEffect(() => {
    setNameDraft(userData?.name || '');
    setAvatarKey(userData?.avatar || '');
    clearPreview();
  }, [clearPreview, userData]);

  useEffect(() => {
    return () => {
      clearPreview();
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, [clearPreview]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('invalidFileType'));
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(t('fileTooLarge'));
      return;
    }

    try {
      const previewUrl = URL.createObjectURL(file);
      clearPreview();
      previewUrlRef.current = previewUrl;
      setAvatarPreviewUrl(previewUrl);
    } catch (error) {
      console.error('Error creating preview:', error);
      toast.error(t('uploadFailed'));
    }
  };

  const handleSave = async () => {
    const avatarFile = fileInputRef.current?.files?.[0];
    const hasAvatarChange = Boolean(avatarFile);

    if (!hasNameChange && !hasAvatarChange) {
      return;
    }

    setIsLoading(true);
    try {
      const updates: Partial<{ name: string; avatar: string }> = {};

      if (hasNameChange) {
        updates.name = nameDraft;
      }

      if (hasAvatarChange) {
        try {
          if (!avatarFile || !userData?.uid || !user) {
            toast.error(t('uploadFailed'));
            return;
          }

          const response = await fetch('/api/get-upload-url', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileName: avatarFile.name,
              fileType: avatarFile.type,
              fileSize: avatarFile.size,
              purpose: 'avatar',
            }),
          });

          if (!response.ok) {
            console.error('Upload URL request failed:', response.status);
            throw new Error(tErrors('default'));
          }

          const result = await response.json();
          if (result.code !== 0) {
            throw new Error(getErrorMessage(tErrors, result.code));
          }

          const { uploadUrl, key } = result.data;

          const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': avatarFile.type,
            },
            body: avatarFile,
          });

          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload ${avatarFile.name}`);
          }

          updates.avatar = key;
        } catch (error) {
          console.error('Error uploading avatar:', error);
          toast.error(t('uploadFailed'));
          return;
        }
      }

      const result = await updateUserData(updates);
      if (result) {
        if (updates.avatar) {
          setAvatarKey(updates.avatar);
        }

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        clearPreview();

        toast.success(t('profileUpdated'));
        setSuccess(true);
        if (successTimerRef.current) {
          clearTimeout(successTimerRef.current);
        }
        successTimerRef.current = setTimeout(() => setSuccess(false), 2000);
      } else {
        toast.error(tErrors('default'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const avatarSrc = avatarPreviewUrl || getR2PublicUrl(avatarKey) || '';

  return {
    avatarSrc,
    displayName,
    fileInputRef,
    handleAvatarClick,
    handleFileChange,
    handleSave,
    isLoading,
    nameDraft,
    setNameDraft,
    success,
    userData,
    userLoading,
    hasPendingChanges,
  };
}
