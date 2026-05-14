'use client';

import { useEffect, useState } from 'react';

import { User, Mail, Loader2, Check, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ImageWithSkeleton } from '@/components/ui/image-with-skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

import { ChangePasswordDialog } from './change-password-dialog';
import { useProfileSettings } from './hooks/use-profile-settings';
import { SettingsSectionTitle } from './settings-section-title';

function getProfileHeaderIdentity(displayName: string, email?: string) {
  const normalizedDisplayName = displayName.trim();
  const normalizedEmail = email?.trim() ?? '';
  const emailPrefix = normalizedEmail.split('@')[0]?.trim() ?? '';
  const primaryIdentity =
    normalizedDisplayName.length > 0
      ? normalizedDisplayName
      : emailPrefix || normalizedEmail;

  return { primaryIdentity };
}

export function ProfileInfoTab() {
  const t = useTranslations('account');
  const {
    avatarSrc,
    displayName,
    fileInputRef,
    handleAvatarClick,
    handleFileChange,
    handleSave,
    hasPendingChanges,
    isLoading,
    nameDraft,
    setNameDraft,
    success,
    userData,
    userLoading,
  } = useProfileSettings();
  const { primaryIdentity } = getProfileHeaderIdentity(
    displayName,
    userData?.email,
  );
  const clickAvatarHint = t('clickAvatarToUpload');
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const showAvatarImage = Boolean(avatarSrc) && !avatarLoadFailed;

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarSrc]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="space-y-1.5 pb-4">
          <CardTitle>
            <SettingsSectionTitle icon={User}>
              {t('profileInfo')}
            </SettingsSectionTitle>
          </CardTitle>
          <CardDescription className="text-pretty text-xs">
            {t('profileDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="py-1 sm:py-2">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={isLoading}
                aria-label={clickAvatarHint}
                className="relative mt-0.5 cursor-pointer rounded-full transition-[scale] duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none motion-reduce:hover:scale-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="relative h-20 w-20 overflow-hidden rounded-full border border-border/40 bg-muted">
                  <div className="absolute inset-0 flex items-center justify-center bg-primary text-3xl font-semibold text-primary-foreground">
                    {displayName ? (
                      displayName.charAt(0).toUpperCase()
                    ) : (
                      <User className="h-8 w-8" />
                    )}
                  </div>
                  {showAvatarImage ? (
                    <ImageWithSkeleton
                      src={avatarSrc}
                      alt={displayName || userData?.email || t('avatarAlt')}
                      fill
                      sizes="80px"
                      className="object-cover"
                      skeletonClassName="rounded-full"
                      onError={() => setAvatarLoadFailed(true)}
                    />
                  ) : null}
                </div>
              </button>
              <div className="min-w-0 flex-1 self-center">
                {userLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40 rounded-md" />
                    <Skeleton className="h-4 w-56 rounded-md" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="truncate text-base font-semibold leading-tight text-foreground">
                      {primaryIdentity}
                    </p>
                    <p className="truncate text-sm leading-tight text-muted-foreground">
                      {userData?.email}
                    </p>
                  </div>
                )}
                <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
                  {clickAvatarHint}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('name')}</Label>
              <Input
                id="fullName"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder={t('name')}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={userData?.email || ''}
                  disabled
                  className="rounded-xl bg-muted/50 pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('contactSupportToChangeEmail')}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isLoading || !hasPendingChanges}
              size="sm"
              className="rounded-xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('savingChanges')}
                </>
              ) : success ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t('saved')}
                </>
              ) : (
                t('saveChanges')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-1.5">
            <CardTitle>
              <SettingsSectionTitle icon={Shield}>
                {t('securityTitle')}
              </SettingsSectionTitle>
            </CardTitle>
            <CardDescription className="text-pretty text-xs">
              {t('securityDescription')}
            </CardDescription>
          </div>
          <div className="w-full shrink-0 sm:w-auto [&_button]:w-full sm:[&_button]:w-auto">
            <ChangePasswordDialog email={userData?.email} />
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
