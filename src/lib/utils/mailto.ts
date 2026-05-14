export type MailtoOptions = {
  subject?: string;
  body?: string;
  cc?: string | string[];
  bcc?: string | string[];
};

function normalizeList(value?: string | string[]) {
  if (!value) return undefined;
  const items = Array.isArray(value) ? value : [value];
  const normalized = items.map((v) => v.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized.join(',') : undefined;
}

export function buildMailtoHref(email: string, options: MailtoOptions = {}) {
  const address = email.trim();
  const params = new URLSearchParams();

  if (options.subject) params.set('subject', options.subject);
  if (options.body) params.set('body', options.body);

  const cc = normalizeList(options.cc);
  const bcc = normalizeList(options.bcc);
  if (cc) params.set('cc', cc);
  if (bcc) params.set('bcc', bcc);

  const query = params.toString();
  return query ? `mailto:${address}?${query}` : `mailto:${address}`;
}
