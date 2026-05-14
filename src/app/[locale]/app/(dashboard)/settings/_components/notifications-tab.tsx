'use client';

import { useEffect, useMemo, useState } from 'react';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

import { SettingsSectionTitle } from './settings-section-title';

type NotificationSettingKey =
  | 'emailNotifications'
  | 'videoComplete'
  | 'weeklyReport'
  | 'marketing';

type NotificationSettings = Record<NotificationSettingKey, boolean>;

const STORAGE_KEY = 'settings.notifications';
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  emailNotifications: true,
  videoComplete: true,
  weeklyReport: false,
  marketing: false,
};

export function NotificationsTab() {
  const t = useTranslations('account.notificationsTab');
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (!savedSettings) {
        return;
      }

      const parsedSettings = JSON.parse(
        savedSettings,
      ) as Partial<NotificationSettings>;
      setNotificationSettings({
        emailNotifications:
          typeof parsedSettings.emailNotifications === 'boolean'
            ? parsedSettings.emailNotifications
            : DEFAULT_NOTIFICATION_SETTINGS.emailNotifications,
        videoComplete:
          typeof parsedSettings.videoComplete === 'boolean'
            ? parsedSettings.videoComplete
            : DEFAULT_NOTIFICATION_SETTINGS.videoComplete,
        weeklyReport:
          typeof parsedSettings.weeklyReport === 'boolean'
            ? parsedSettings.weeklyReport
            : DEFAULT_NOTIFICATION_SETTINGS.weeklyReport,
        marketing:
          typeof parsedSettings.marketing === 'boolean'
            ? parsedSettings.marketing
            : DEFAULT_NOTIFICATION_SETTINGS.marketing,
      });
    } catch (error) {
      console.error('Failed to read notification settings:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notificationSettings));
    } catch (error) {
      console.error('Failed to persist notification settings:', error);
    }
  }, [notificationSettings]);

  const options = useMemo(
    () => [
      {
        key: 'emailNotifications' as const,
        label: t('notificationOptions.email.label'),
        desc: t('notificationOptions.email.description'),
      },
      {
        key: 'videoComplete' as const,
        label: t('notificationOptions.videoComplete.label'),
        desc: t('notificationOptions.videoComplete.description'),
      },
      {
        key: 'weeklyReport' as const,
        label: t('notificationOptions.weeklyReport.label'),
        desc: t('notificationOptions.weeklyReport.description'),
      },
      {
        key: 'marketing' as const,
        label: t('notificationOptions.marketing.label'),
        desc: t('notificationOptions.marketing.description'),
      },
    ],
    [t],
  );

  const setSetting = (key: NotificationSettingKey, checked: boolean) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  return (
    <Card>
      <CardHeader className="space-y-1.5 pb-4">
        <CardTitle>
          <SettingsSectionTitle icon={Bell}>{t('title')}</SettingsSectionTitle>
        </CardTitle>
        <CardDescription className="text-pretty text-xs">
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {options.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between rounded-xl border border-border p-4"
          >
            <div className="min-w-0 pr-4">
              <h3 className="text-sm font-medium text-foreground">
                {item.label}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.desc}
              </p>
            </div>
            <Switch
              checked={notificationSettings[item.key]}
              onCheckedChange={(checked) => setSetting(item.key, checked)}
              aria-label={item.label}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
