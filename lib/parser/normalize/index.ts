import type { EmailProviderName } from '@/lib/email/providers';
import type { NormalizedEmail } from '@/types/parser';
import { normalizeGmailEmail } from './gmail';
import { normalizeOutlookEmail } from './outlook';
import { normalizeYahooEmail } from './yahoo';

export type EmailNormalizationInput = {
  id: string;
  userId: string;
  provider: EmailProviderName;
  providerMessageId: string;
  subject: string;
  from: string;
  receivedAt: string;
  bodyPlain?: string | null;
  bodyHtml?: string | null;
};

export function normalizeEmail(input: EmailNormalizationInput): NormalizedEmail {
  switch (input.provider) {
    case 'outlook':
      return normalizeOutlookEmail(input);
    case 'yahoo':
      return normalizeYahooEmail(input);
    case 'gmail':
    default:
      return normalizeGmailEmail(input);
  }
}
