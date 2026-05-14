import { LEGAL_CONFIG } from '@/config/legal';
import { buildMailtoHref } from '@/lib/utils/mailto';

/** Shared mailto for Enterprise / contact-sales CTAs (pricing page, upgrade modal, etc.). */
export const ENTERPRISE_SALES_MAILTO_HREF = buildMailtoHref(
  LEGAL_CONFIG.companyEmail,
  {
    subject: 'Enterprise Plan Inquiry',
    body: 'Hi, I am interested in the Enterprise plan and would like to discuss custom credit allocation.',
  },
);
