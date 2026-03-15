import type { Provider } from '@/types/parser';
import { buildNormalizedEmail, cleanPlainText } from './helpers';

export function normalizeGmailEmail(options: {
  id: string;
  userId: string;
  providerMessageId: string;
  subject: string;
  from: string;
  receivedAt: string;
  bodyPlain?: string | null;
  bodyHtml?: string | null;
} ) {
  const mimeAwarePlain = cleanPlainText(options.bodyPlain)
    .replace(/multipart\/alternative/gi, ' ')
    .replace(/quoted-printable/gi, ' ')
    .replace(/base64/gi, ' ');

  return buildNormalizedEmail({
    ...options,
    provider: 'gmail' as Provider,
    bodyPlain: mimeAwarePlain,
    bodyHtml: options.bodyHtml,
    fallbackText: mimeAwarePlain,
  });
}
