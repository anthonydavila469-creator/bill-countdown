import type { EmailType, FieldEvidence, NormalizedEmail } from '@/types/parser';
import { clamp, safeLower } from './utils';

const KEYWORDS: Array<{ type: EmailType; words: string[]; confidence: number }> = [
  { type: 'promo', words: ['limited time', 'special offer', 'save now', 'deal ends'], confidence: 0.95 },
  { type: 'payment_confirmation', words: ['payment received', 'payment confirmation', 'thank you for your payment'], confidence: 0.94 },
  { type: 'receipt', words: ['receipt', 'order confirmation'], confidence: 0.92 },
  { type: 'autopay_notice', words: ['autopay', 'automatic payment', 'scheduled payment'], confidence: 0.9 },
  { type: 'statement_ready', words: ['statement is ready', 'statement ready', 'statement available', 'e-statement', 'estatement', 'electronic statement'], confidence: 0.88 },
  { type: 'bill_due', words: ['bill due', 'amount due', 'payment due', 'due date', 'balance due', 'account balance', 'current account balance'], confidence: 0.9 },
  { type: 'subscription_renewal', words: ['renewal', 'renews on', 'subscription'], confidence: 0.82 },
];

export function classifyEmail(email: NormalizedEmail): {
  isBillRelated: boolean;
  type: EmailType;
  confidence: number;
  evidence: FieldEvidence[];
} {
  const subject = safeLower(email.subject);
  const body = safeLower(email.bodyText);
  const haystack = `${subject} ${body}`;
  const evidence: FieldEvidence[] = [];

  for (const rule of KEYWORDS) {
    const hit = rule.words.find((word) => haystack.includes(word));
    if (!hit) continue;
    evidence.push({ field: 'classification', source: subject.includes(hit) ? 'subject' : 'body', snippet: hit, value: rule.type });
    return {
      isBillRelated: !['promo', 'receipt', 'payment_confirmation'].includes(rule.type),
      type: rule.type,
      confidence: clamp(rule.confidence),
      evidence,
    };
  }

  return {
    isBillRelated: false,
    type: 'other',
    confidence: 0.35,
    evidence,
  };
}
