export {
  sendEmail,
  type SendEmailOptions,
  type SendEmailResult,
} from '@/server/email/client';
export {
  emailLocaleFromRequest,
  type EmailLocale,
} from '@/server/email/locale';
export { sendVerificationOtpEmail } from '@/server/email/senders/otp-verify';
export { sendResetPasswordOtpEmail } from '@/server/email/senders/otp-reset';
export { sendWelcomeEmail } from '@/server/email/senders/welcome';
