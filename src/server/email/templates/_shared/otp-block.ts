import { EMAIL_STYLES } from '@/server/email/templates/base';

export function getOtpBlock(otp: string, expiresLabel: string): string {
  return `
    <div style="margin: 26px 0 14px; text-align: center;">
      <div style="display:inline-block; background:${EMAIL_STYLES.accentBackgroundColor}; border-radius: 14px; padding: 18px 30px;">
        <p style="margin:0; font-family:${EMAIL_STYLES.monoStack}; font-size:32px; line-height:1; letter-spacing:0.28em; font-weight:650; color:${EMAIL_STYLES.primaryColor}; padding-left:0.28em; white-space:nowrap;">${otp}</p>
      </div>
    </div>
    <p style="text-align:center; margin: 0 0 10px; color:${EMAIL_STYLES.mutedColor}; font-size:13px; line-height:1.6;">${expiresLabel}</p>
  `;
}
