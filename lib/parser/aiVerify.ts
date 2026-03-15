import Anthropic from '@anthropic-ai/sdk';
import type { AiVerificationResult, FieldConfidence, FieldEvidence, NormalizedEmail, ParsedBillFields } from '@/types/parser';
import { clamp, normalizeWhitespace, wordWindowAround } from './utils';

const VERIFY_MODEL = 'claude-sonnet-4-20250514';
const VERIFY_SYSTEM_PROMPT = [
  'You verify deterministic bill extraction results from short snippets, not full emails.',
  'Return strict JSON only.',
  'If the snippets do not support a correction, keep the deterministic value.',
  'Use null for corrected fields that cannot be confirmed.',
].join(' ');

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

function getSnippetForField(field: keyof ParsedBillFields, value: string | number | boolean | null | undefined, email: NormalizedEmail, evidence: FieldEvidence[]): string {
  const evidenceSnippet = evidence.find((item) => item.field === field && item.snippet)?.snippet;
  if (evidenceSnippet) {
    return normalizeWhitespace(evidenceSnippet).slice(0, 160);
  }
  if (value == null || value === '') {
    return wordWindowAround(email.bodyText, field.replace('_', ' '), 80);
  }
  return wordWindowAround(email.bodyText, String(value), 80);
}

function parseJsonResponse(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]+?)```/i);
  const candidate = fenced?.[1] || trimmed;

  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(/[$,\s]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function buildEvidence(field: keyof ParsedBillFields, snippet: string, value: string | number | boolean | null, confidence: number): FieldEvidence {
  return {
    field,
    source: 'ai',
    snippet,
    value,
    details: { confidence },
  };
}

export async function verifyDeterministicExtraction(options: {
  email: NormalizedEmail;
  fields: ParsedBillFields;
  fieldConfidence: FieldConfidence;
  evidence: FieldEvidence[];
}): Promise<AiVerificationResult> {
  const client = getAnthropicClient();
  const snippets = {
    amount: getSnippetForField('amount', options.fields.amount, options.email, options.evidence),
    due_date: getSnippetForField('due_date', options.fields.due_date, options.email, options.evidence),
    name: getSnippetForField('name', options.fields.name, options.email, options.evidence),
    account_last4: getSnippetForField('account_last4', options.fields.account_last4, options.email, options.evidence),
  };

  const prompt = JSON.stringify({
    task: 'verify_bill_extraction',
    subject: options.email.subject,
    from: options.email.fromEmail,
    deterministic_result: options.fields,
    deterministic_confidence: options.fieldConfidence,
    snippets,
    instructions: {
      amount: `Given these snippets, verify: is the amount ${options.fields.amount ?? null}?`,
      due_date: `Is the due date ${options.fields.due_date ?? null}?`,
      vendor: `Is this from vendor ${options.fields.name ?? null}?`,
    },
    response_schema: {
      amount_confirmed: 'boolean',
      due_date_confirmed: 'boolean',
      vendor_confirmed: 'boolean',
      corrected_fields: {
        name: 'string|null',
        amount: 'number|null',
        due_date: 'YYYY-MM-DD|null',
        account_last4: 'string|null',
      },
      confidence: 'number 0..1',
      rationale: 'short string',
    },
  }, null, 2);

  try {
    const message = await client.messages.create({
      model: VERIFY_MODEL,
      max_tokens: 500,
      system: VERIFY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const parsed = parseJsonResponse(rawText);
    if (!parsed) {
      return {
        accepted: false,
        confidence: 0,
        fields: options.fields,
        corrections: {},
        disagreements: ['verification_parse_failed'],
        evidence: [],
        rawResponse: { rawText },
      };
    }

    const correctedFields: Partial<ParsedBillFields> = {};
    const disagreements: Array<keyof ParsedBillFields | string> = [];
    const corrected = (parsed.corrected_fields || {}) as Record<string, unknown>;

    const nextFields: ParsedBillFields = { ...options.fields };
    const maybeName = toStringOrNull(corrected.name);
    const maybeAmount = toNumberOrNull(corrected.amount);
    const maybeDueDate = toStringOrNull(corrected.due_date);
    const maybeLast4 = toStringOrNull(corrected.account_last4);

    if (maybeName && maybeName !== options.fields.name) {
      nextFields.name = maybeName;
      correctedFields.name = maybeName;
      disagreements.push('name');
    }
    if (maybeAmount != null && maybeAmount !== options.fields.amount) {
      nextFields.amount = maybeAmount;
      correctedFields.amount = maybeAmount;
      disagreements.push('amount');
    }
    if (maybeDueDate && maybeDueDate !== options.fields.due_date) {
      nextFields.due_date = maybeDueDate;
      correctedFields.due_date = maybeDueDate;
      disagreements.push('due_date');
    }
    if (maybeLast4 && maybeLast4 !== options.fields.account_last4) {
      nextFields.account_last4 = maybeLast4;
      correctedFields.account_last4 = maybeLast4;
      disagreements.push('account_last4');
    }

    const confidence = clamp(typeof parsed.confidence === 'number' ? parsed.confidence : 0);
    const amountConfirmed = parsed.amount_confirmed !== false;
    const dueDateConfirmed = parsed.due_date_confirmed !== false;
    const vendorConfirmed = parsed.vendor_confirmed !== false;

    const evidence: FieldEvidence[] = [];
    if (nextFields.amount != null) evidence.push(buildEvidence('amount', snippets.amount, nextFields.amount, confidence));
    if (nextFields.due_date) evidence.push(buildEvidence('due_date', snippets.due_date, nextFields.due_date, confidence));
    if (nextFields.name) evidence.push(buildEvidence('name', snippets.name, nextFields.name, confidence));
    if (nextFields.account_last4) evidence.push(buildEvidence('account_last4', snippets.account_last4, nextFields.account_last4, confidence));

    return {
      accepted: amountConfirmed && dueDateConfirmed && vendorConfirmed && confidence >= 0.72,
      confidence,
      fields: nextFields,
      corrections: correctedFields,
      disagreements,
      evidence,
      rawResponse: parsed,
    };
  } catch (error) {
    return {
      accepted: false,
      confidence: 0,
      fields: options.fields,
      corrections: {},
      disagreements: ['verification_failed'],
      evidence: [],
      rawResponse: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
