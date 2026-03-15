import type { Provider } from '@/types/parser';
import { buildNormalizedEmail, cleanPlainText } from './helpers';

export function normalizeYahooEmail(options: {
  id: string;
  userId: string;
  providerMessageId: string;
  subject: string;
  from: string;
  receivedAt: string;
  bodyPlain?: string | null;
  bodyHtml?: string | null;
}) {
  const imapPlain = cleanPlainText(options.bodyPlain)
    .replace(/\bcharset=[^\s;]+/gi, ' ')
    .replace(/\bformat=flowed\b/gi, ' ')
    .replace(/\bdelsp=yes\b/gi, ' ');

  return buildNormalizedEmail({
    ...options,
    provider: 'yahoo' as Provider,
    bodyPlain: imapPlain,
    bodyHtml: options.bodyHtml,
    fallbackText: imapPlain,
  });
}
