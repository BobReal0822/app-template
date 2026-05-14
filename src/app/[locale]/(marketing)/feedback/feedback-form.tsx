'use client';

import { useEffect, useRef, useState } from 'react';

import {
  Mail,
  MessageSquare,
  Send,
  CheckCircle2,
  Sparkle,
  Bug,
  Lightbulb,
  LifeBuoy,
  CreditCard,
  CircleHelp,
  Clock3,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { LEGAL_CONFIG } from '@/config/legal';
import { useAuth } from '@/contexts/auth-context';
import { useUserData } from '@/hooks/use-user-data';
import { usePathname } from '@/i18n/routing';
import { callApi, ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/utils/error-messages';

const FIELD_LIMITS = {
  name: 255,
  email: 255,
  subject: 100,
  message: 3000,
} as const;

export function FeedbackForm({ locale }: { locale: string }) {
  const t = useTranslations('feedback');
  const tErrors = useTranslations('errors');
  const { user } = useAuth();
  const { userData, loading: userDataLoading } = useUserData();
  const pathname = usePathname();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof typeof formData, string>>
  >({});
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFormDisabled = isSubmitting || isSubmitted;

  const validateField = (
    field: keyof typeof formData,
    value: string,
  ): string | undefined => {
    const trimmedValue = value.trim();

    switch (field) {
      case 'name':
        if (!trimmedValue) return t('nameRequired');
        if (trimmedValue.length > FIELD_LIMITS.name) {
          return t('nameLength', { maxLength: FIELD_LIMITS.name });
        }
        return undefined;
      case 'email': {
        if (!trimmedValue) return t('emailRequired');
        if (trimmedValue.length > FIELD_LIMITS.email) {
          return t('emailLength', { maxLength: FIELD_LIMITS.email });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedValue)) return t('emailFormat');
        return undefined;
      }
      case 'subject':
        if (!trimmedValue) return t('subjectRequired');
        if (trimmedValue.length > FIELD_LIMITS.subject) {
          return t('subjectLength', { maxLength: FIELD_LIMITS.subject });
        }
        return undefined;
      case 'message':
        if (!trimmedValue) return t('messageRequired');
        if (trimmedValue.length > FIELD_LIMITS.message) {
          return t('messageLength', { maxLength: FIELD_LIMITS.message });
        }
        return undefined;
      default:
        return undefined;
    }
  };

  useEffect(() => {
    // Autofill from authenticated profile data when available.
    if (!userDataLoading && userData) {
      setFormData((prev) => ({
        ...prev,
        name: userData.name || prev.name,
        email: userData.email || prev.email,
      }));
    }
  }, [userData, userDataLoading]);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  // validate form data before submission
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof typeof formData, string>> = {};
    (Object.keys(formData) as Array<keyof typeof formData>).forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // validate form before submission
    if (!validateForm()) {
      toast.error(t('pleaseFixErrors'));
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Preserve uid for signed-in users while still allowing anonymous submissions.
      const isAuthenticated = Boolean(user);

      // Submit feedback via app API route
      await callApi(
        '/feedback',
        {
          source: 'marketing_page',
          category: formData.subject.trim().toLowerCase(),
          email: formData.email.trim(),
          content: formData.message.trim(),
          meta: {
            pagePath: pathname,
            locale,
            name: formData.name.trim(),
            subject: formData.subject.trim(),
          },
          attrs: [],
        },
        {
          requireAuth: isAuthenticated,
        },
      );

      setIsSubmitting(false);
      setIsSubmitted(true);
      toast.success(t('successMessage'));

      // Reset form after showing success (keep identity fields).
      resetTimeoutRef.current = setTimeout(() => {
        setFormData((prev) => ({ ...prev, subject: '', message: '' }));
        setIsSubmitted(false);
        setErrors({});
      }, 3000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setIsSubmitting(false);
      const errorMessage =
        error instanceof ApiError
          ? getErrorMessage(tErrors, error.code)
          : tErrors('default');
      toast.error(errorMessage);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    const field = name as keyof typeof formData;
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      const nextError = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: nextError }));
    }
  };

  const handleFieldBlur = (field: keyof typeof formData) => {
    const nextError = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: nextError }));
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2">
          <Card className="border-border/70 shadow-none">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t('formTitle')}
              </CardTitle>
              <CardDescription className="text-sm leading-6">
                {t('formDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit}
                className="space-y-6"
                aria-busy={isSubmitting}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('nameLabel')}</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder={t('namePlaceholder')}
                      value={formData.name}
                      onChange={handleInputChange}
                      onBlur={() => handleFieldBlur('name')}
                      required
                      disabled={isFormDisabled}
                      maxLength={FIELD_LIMITS.name}
                      className={cn(errors.name && 'border-destructive')}
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? 'name-error' : undefined}
                    />
                    {errors.name && (
                      <p
                        id="name-error"
                        className="text-sm text-destructive"
                        aria-live="polite"
                      >
                        {errors.name}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('emailLabel')}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      value={formData.email}
                      onChange={handleInputChange}
                      onBlur={() => handleFieldBlur('email')}
                      required
                      disabled={isFormDisabled}
                      maxLength={FIELD_LIMITS.email}
                      className={cn(errors.email && 'border-destructive')}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={
                        errors.email ? 'email-error' : undefined
                      }
                    />
                    {errors.email && (
                      <p
                        id="email-error"
                        className="text-sm text-destructive"
                        aria-live="polite"
                      >
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">{t('subjectLabel')}</Label>
                  <Select
                    value={formData.subject}
                    onValueChange={(value) => {
                      setFormData((prev) => ({ ...prev, subject: value }));
                      const nextError = validateField('subject', value);
                      setErrors((prev) => ({ ...prev, subject: nextError }));
                    }}
                    disabled={isFormDisabled}
                  >
                    <SelectTrigger
                      id="subject"
                      className={cn(errors.subject && 'border-destructive')}
                      aria-invalid={Boolean(errors.subject)}
                      aria-describedby={
                        errors.subject ? 'subject-error' : undefined
                      }
                    >
                      <SelectValue placeholder={t('subjectPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="experience">
                        <span className="flex items-center gap-2">
                          <Sparkle className="h-4 w-4 text-muted-foreground" />
                          {t('experienceFeedback')}
                        </span>
                      </SelectItem>
                      <SelectItem value="feedback">
                        <span className="flex items-center gap-2">
                          <MessageCircle className="h-4 w-4 text-muted-foreground" />
                          {t('subjectFeedback')}
                        </span>
                      </SelectItem>
                      <SelectItem value="bug">
                        <span className="flex items-center gap-2">
                          <Bug className="h-4 w-4 text-muted-foreground" />
                          {t('subjectBug')}
                        </span>
                      </SelectItem>
                      <SelectItem value="feature">
                        <span className="flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-muted-foreground" />
                          {t('subjectFeature')}
                        </span>
                      </SelectItem>
                      <SelectItem value="support">
                        <span className="flex items-center gap-2">
                          <LifeBuoy className="h-4 w-4 text-muted-foreground" />
                          {t('subjectSupport')}
                        </span>
                      </SelectItem>
                      <SelectItem value="billing">
                        <span className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          {t('subjectBilling')}
                        </span>
                      </SelectItem>
                      <SelectItem value="other">
                        <span className="flex items-center gap-2">
                          <CircleHelp className="h-4 w-4 text-muted-foreground" />
                          {t('subjectOther')}
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.subject && (
                    <p
                      id="subject-error"
                      className="text-sm text-destructive"
                      aria-live="polite"
                    >
                      {errors.subject}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">{t('messageLabel')}</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder={t('messagePlaceholder')}
                    value={formData.message}
                    onChange={handleInputChange}
                    onBlur={() => handleFieldBlur('message')}
                    required
                    disabled={isFormDisabled}
                    rows={6}
                    maxLength={FIELD_LIMITS.message}
                    className={cn(
                      'resize-none',
                      errors.message && 'border-destructive',
                    )}
                    aria-invalid={Boolean(errors.message)}
                    aria-describedby={
                      errors.message
                        ? 'message-error message-counter'
                        : 'message-counter'
                    }
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {errors.message ? (
                      <p
                        id="message-error"
                        className="text-destructive"
                        aria-live="polite"
                      >
                        {errors.message}
                      </p>
                    ) : (
                      <span aria-hidden />
                    )}
                    <span id="message-counter" aria-live="polite">
                      {formData.message.length}/{FIELD_LIMITS.message}
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isFormDisabled}
                >
                  {isSubmitted ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {t('submitted')}
                    </>
                  ) : isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('submitting')}
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {t('submit')}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/70 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {t('emailUs')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t('emailDescription')}
              </p>
              <a
                href={`mailto:${LEGAL_CONFIG.companyEmail}`}
                className="block text-sm text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
              >
                {LEGAL_CONFIG.companyEmail}
              </a>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6 border-border/70 bg-muted/20 shadow-none">
        <CardContent className="flex items-center justify-center py-4">
          <p className="inline-flex items-center justify-center gap-1.5 text-center text-sm text-muted-foreground">
            <Clock3 className="h-4 w-4" />
            {t('responseTime')}
          </p>
        </CardContent>
      </Card>
    </>
  );
}
