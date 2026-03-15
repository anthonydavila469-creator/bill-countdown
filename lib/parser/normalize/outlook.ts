import type { Provider } from '@/types/parser';
import { buildNormalizedEmail, cleanPlainText } from './helpers';

export function normalizeOutlookEmail(options: {
  id: string;
  userId: string;
  providerMessageId: string;
  subject: string;
  from: string;
  receivedAt: string;
  bodyPlain?: string | null;
  bodyHtml?: string | null;
}) {
  const graphPlain = cleanPlainText(options.bodyPlain)
    .replace(/You don't often get email from.+?Learn why this is important\.?/gi, ' ')
    .replace(/Get Outlook for (?:iOS|Android)/gi, ' ');

  return buildNormalizedEmail({
    ...options,
    provider: 'outlook' as Provider,
    bodyPlain: graphPlain,
    bodyHtml: options.bodyHtml,
    fallbackText: graphPlain,
  });
}
