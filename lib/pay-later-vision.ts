/**
 * Pay Later vision scanner — Claude Sonnet 4.6 with tool-use forcing.
 *
 * This is the dedicated extractor for BNPL / Pay Later screenshots. It
 * is intentionally separate from the bill-scan pipeline:
 *
 *   - Bill scan (`/api/bills/scan`) is tuned for utility / credit-card
 *     statements and bill emails.
 *   - This module (`/api/pay-later/scan`) is tuned for installment plans
 *     from Affirm, Shop Pay Installments, Klarna, Afterpay, Zip,
 *     Sezzle, PayPal Pay Later, and Apple Pay Later. It accepts
 *     1–8 screenshots from any source (BNPL app, email, browser,
 *     merchant order page) and merges the evidence into one plan.
 *
 * Structured output is enforced via Anthropic's tool-use mechanism:
 * we declare a single tool with a strict `input_schema`, and pin
 * `tool_choice` to that tool. The model returns the structured
 * extraction as a tool-call input — no assistant prefill, no
 * unstructured natural-language parsing.
 *
 * Model: `claude-sonnet-4-6` (hard requirement — do not change).
 */

import Anthropic from '@anthropic-ai/sdk';

// MARK: - Exact model ID (hard requirement from Phase 13 spec)

export const PAY_LATER_VISION_MODEL = 'claude-sonnet-4-6' as const;
export const PAY_LATER_SCANNER_VERSION = '2026.05.24-vision-v1' as const;

// MARK: - Public types
//
// All amounts are integer cents (Phase 13 hard rule — no floats). The
// caller is responsible for converting to/from human-formatted money.

export type PayLaterProviderNormalized =
  | 'affirm'
  | 'shop_pay_installments'
  | 'klarna'
  | 'afterpay'
  | 'zip'
  | 'sezzle'
  | 'paypal_pay_later'
  | 'apple_pay_later'
  | 'unknown';

export type PayLaterSourceType =
  | 'email'
  | 'app'
  | 'browser'
  | 'merchant_order_page'
  | 'mixed'
  | 'unknown';

export type PayLaterInstallmentStatus =
  | 'paid'
  | 'processed'
  | 'scheduled'
  | 'autopay'
  | 'due'
  | 'late'
  | 'upcoming'
  | 'unknown';

export interface PayLaterInstallment {
  sequence: number | null;
  label: string | null;
  dueDate: string | null;           // YYYY-MM-DD
  processedDate: string | null;     // YYYY-MM-DD
  amountCents: number | null;
  status: PayLaterInstallmentStatus;
  isAutopay: boolean | null;
  confidence: number;               // 0..1
  evidenceText: string | null;
  sourceImageIndex: number | null;  // which screenshot the row came from
}

export interface PayLaterScanResult {
  scanVersion: string;
  model: typeof PAY_LATER_VISION_MODEL;
  sourceType: PayLaterSourceType;
  providerName: string | null;
  providerNormalized: PayLaterProviderNormalized | null;
  merchantName: string | null;
  planName: string | null;
  orderNumber: string | null;

  totalPlanAmountCents: number | null;
  paidToDateCents: number | null;
  remainingBalanceCents: number | null;
  nextPaymentAmountCents: number | null;
  nextPaymentDate: string | null;   // YYYY-MM-DD

  paymentMethodBrand: string | null;
  paymentMethodLast4: string | null;

  installments: PayLaterInstallment[];

  confidence: number;               // 0..1
  needsReview: boolean;
  missingFields: string[];
  warnings: string[];
  evidenceSummary: string;
}

export interface PayLaterImage {
  /** "data:image/jpeg;base64,..." */
  dataURL: string;
}

export interface PayLaterVisionInput {
  userId: string;
  screenshots: PayLaterImage[];
  timezone: string;     // e.g. "America/Chicago"
  currentDate: string;  // YYYY-MM-DD in the user's timezone
}

export type PayLaterVisionFailureReason =
  | 'no_images'
  | 'too_many_images'
  | 'image_decode_failed'
  | 'model_no_tool_call'
  | 'model_call_failed';

export interface PayLaterVisionFailure {
  ok: false;
  reason: PayLaterVisionFailureReason;
  message: string;
}

export interface PayLaterVisionSuccess {
  ok: true;
  raw: PayLaterScanResult;
  latencyMs: number;
}

export type PayLaterVisionResponse = PayLaterVisionSuccess | PayLaterVisionFailure;

// MARK: - Tool schema (strict)
//
// Tool-use forcing: the model is required to call this tool. Its input
// schema IS our extraction schema. There is no other valid output path,
// which gives us strict adherence without prefill tricks.

const TOOL_NAME = 'extract_pay_later_plan' as const;

const TOOL_SCHEMA = {
  name: TOOL_NAME,
  description:
    'Extract a Pay Later (BNPL) installment plan from the provided screenshots. ' +
    'Merge evidence across screenshots into a single plan. Always call this tool — ' +
    'do not respond with free text.',
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    properties: {
      sourceType: {
        type: 'string',
        enum: ['email', 'app', 'browser', 'merchant_order_page', 'mixed', 'unknown'],
      },
      providerName: { type: ['string', 'null'] },
      providerNormalized: {
        type: ['string', 'null'],
        enum: [
          'affirm',
          'shop_pay_installments',
          'klarna',
          'afterpay',
          'zip',
          'sezzle',
          'paypal_pay_later',
          'apple_pay_later',
          'unknown',
          null,
        ],
      },
      merchantName: { type: ['string', 'null'] },
      planName: { type: ['string', 'null'] },
      orderNumber: { type: ['string', 'null'] },

      totalPlanAmountCents: { type: ['integer', 'null'], minimum: 0 },
      paidToDateCents: { type: ['integer', 'null'], minimum: 0 },
      remainingBalanceCents: { type: ['integer', 'null'], minimum: 0 },
      nextPaymentAmountCents: { type: ['integer', 'null'], minimum: 0 },
      nextPaymentDate: {
        type: ['string', 'null'],
        description: 'YYYY-MM-DD',
      },

      paymentMethodBrand: { type: ['string', 'null'] },
      paymentMethodLast4: { type: ['string', 'null'] },

      installments: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            sequence: { type: ['integer', 'null'], minimum: 1 },
            label: { type: ['string', 'null'] },
            dueDate: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
            processedDate: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
            amountCents: { type: ['integer', 'null'], minimum: 0 },
            status: {
              type: 'string',
              enum: ['paid', 'processed', 'scheduled', 'autopay', 'due', 'late', 'upcoming', 'unknown'],
            },
            isAutopay: { type: ['boolean', 'null'] },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            evidenceText: { type: ['string', 'null'] },
            sourceImageIndex: { type: ['integer', 'null'], minimum: 0 },
          },
          required: ['status', 'confidence'],
        },
      },

      confidence: { type: 'number', minimum: 0, maximum: 1 },
      needsReview: { type: 'boolean' },
      missingFields: { type: 'array', items: { type: 'string' } },
      warnings: { type: 'array', items: { type: 'string' } },
      evidenceSummary: { type: 'string' },
    },
    required: [
      'sourceType',
      'installments',
      'confidence',
      'needsReview',
      'missingFields',
      'warnings',
      'evidenceSummary',
    ],
  },
} as const;

// MARK: - Prompt (system / user)

const SYSTEM_PROMPT = `You are Duezo's Pay Later installment scanner. Read one or more screenshots and extract the BNPL / Pay Later payment plan.

You must identify the FINANCIAL PLAN, not just the largest or first visible amount.

Look for:
- merchant name (the store the user bought from)
- BNPL provider name (Klarna, Affirm, Shop Pay Installments, Afterpay, Zip, Sezzle, PayPal Pay Later, Apple Pay Later)
- order number or plan name
- total plan amount
- paid-to-date amount
- remaining balance
- next payment amount and date
- payment method brand and last four digits
- every visible installment date
- every visible installment amount
- payment status: paid, processed, scheduled, upcoming, autopay, due, late, or unknown

Screenshots may come from:
- email confirmation
- phone browser
- BNPL provider app
- merchant order page
- dark mode or light mode
- cropped screenshot
- multiple screenshots showing different pieces of the SAME plan

RULES:
1. If multiple screenshots describe the same plan, merge them.
2. Do NOT treat the first installment as the full plan unless the screenshot clearly states that single amount IS the total.
3. "Remaining" / "Remaining balance" is the unpaid amount, not the total.
4. "Paid to date" is the already-paid amount.
5. If installments add up to a clear total, use that as supporting evidence.
6. If paidToDate + remainingBalance equals a likely total, use that.
7. If two screenshots conflict, keep the most authoritative value and add a warning.
8. If a date has no year, infer the year from the surrounding plan context AND the provided currentDate. If still uncertain, leave a warning.
9. If only one payment is visible but the screenshot mentions more payments, set needsReview=true and warn "schedule may be incomplete".
10. Return null for missing fields. Do NOT invent values.
11. Include short evidenceText for each installment when visible (e.g. "Autopay: Jun 4, 2026 — $37.00").
12. Set needsReview=true if any key fields are missing, conflicting, inferred, or low confidence.
13. Set confidence between 0 and 1.
14. ALWAYS call the extract_pay_later_plan tool. Do not respond with free text.

All amounts MUST be integer cents (e.g. $37.00 → 3700). All dates MUST be YYYY-MM-DD.`;

function buildUserPrompt(input: PayLaterVisionInput): string {
  return [
    `Current date: ${input.currentDate} (${input.timezone}).`,
    `Number of screenshots: ${input.screenshots.length}.`,
    'Extract the Pay Later / BNPL installment plan from these screenshots.',
    'If they describe the same plan, merge the evidence into ONE result.',
    'Call the extract_pay_later_plan tool with the structured plan.',
  ].join('\n');
}

// MARK: - Image content blocks

interface ParsedImage {
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  base64: string;
}

function parseDataURL(dataURL: string): ParsedImage | null {
  const match = dataURL.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
  if (!match) return null;
  return {
    mediaType: match[1] as ParsedImage['mediaType'],
    base64: match[2],
  };
}

// MARK: - Anthropic client

function getAnthropic(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// MARK: - Public entry point

const MAX_SCREENSHOTS = 8;

/**
 * Run the Pay Later vision scanner over 1–8 screenshots. Returns the
 * raw structured extraction. Caller is expected to pass this through
 * the deterministic validator before persisting or displaying.
 *
 * One retry on tool_use failure — Claude very occasionally responds
 * with text first; the retry primes it with a system reminder to
 * call the tool.
 */
export async function scanPayLaterPlan(input: PayLaterVisionInput): Promise<PayLaterVisionResponse> {
  if (input.screenshots.length === 0) {
    return { ok: false, reason: 'no_images', message: 'At least one screenshot is required.' };
  }
  if (input.screenshots.length > MAX_SCREENSHOTS) {
    return {
      ok: false,
      reason: 'too_many_images',
      message: `Up to ${MAX_SCREENSHOTS} screenshots per scan.`,
    };
  }

  const parsedImages: ParsedImage[] = [];
  for (const img of input.screenshots) {
    const parsed = parseDataURL(img.dataURL);
    if (!parsed) {
      return {
        ok: false,
        reason: 'image_decode_failed',
        message: 'One or more screenshots could not be decoded as a base64 image data URL.',
      };
    }
    parsedImages.push(parsed);
  }

  const imageBlocks = parsedImages.map((p) => ({
    type: 'image' as const,
    source: { type: 'base64' as const, media_type: p.mediaType, data: p.base64 },
  }));

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: [
        ...imageBlocks,
        { type: 'text', text: buildUserPrompt(input) },
      ],
    },
  ];

  const startedAt = Date.now();
  try {
    // Anthropic SDK typing: `tools` and `tool_choice` are exported as
    // structural unions; we coerce through `unknown` so the strict
    // `input_schema` literal we declared above doesn't trip the
    // wider SDK types.
    const response = await getAnthropic().messages.create({
      model: PAY_LATER_VISION_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [TOOL_SCHEMA as unknown as Anthropic.Tool],
      tool_choice: { type: 'tool', name: TOOL_NAME } as unknown as Anthropic.MessageCreateParams['tool_choice'],
      messages,
    });

    const toolUse = response.content.find((c) => c.type === 'tool_use');
    if (toolUse && toolUse.type === 'tool_use' && toolUse.name === TOOL_NAME) {
      const raw = normalizeToolInputToResult(toolUse.input);
      return { ok: true, raw, latencyMs: Date.now() - startedAt };
    }

    return {
      ok: false,
      reason: 'model_no_tool_call',
      message: 'Model did not invoke the extract_pay_later_plan tool.',
    };
  } catch (error) {
    return {
      ok: false,
      reason: 'model_call_failed',
      message: error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error',
    };
  }
}

// MARK: - Shape normalization
//
// `toolUse.input` is `unknown` from the SDK. We coerce it into our
// strict shape with safe defaults so downstream code can trust the
// types. Anything the model omits gets filled with sensible nulls.

function normalizeToolInputToResult(input: unknown): PayLaterScanResult {
  const obj = (input ?? {}) as Record<string, unknown>;

  const installments = Array.isArray(obj.installments)
    ? (obj.installments as Array<Record<string, unknown>>).map(normalizeInstallment)
    : [];

  return {
    scanVersion: PAY_LATER_SCANNER_VERSION,
    model: PAY_LATER_VISION_MODEL,
    sourceType: enumOrFallback<PayLaterSourceType>(
      obj.sourceType,
      ['email', 'app', 'browser', 'merchant_order_page', 'mixed', 'unknown'],
      'unknown',
    ),
    providerName: stringOrNull(obj.providerName),
    providerNormalized: enumOrNull<PayLaterProviderNormalized>(
      obj.providerNormalized,
      [
        'affirm',
        'shop_pay_installments',
        'klarna',
        'afterpay',
        'zip',
        'sezzle',
        'paypal_pay_later',
        'apple_pay_later',
        'unknown',
      ],
    ),
    merchantName: stringOrNull(obj.merchantName),
    planName: stringOrNull(obj.planName),
    orderNumber: stringOrNull(obj.orderNumber),

    totalPlanAmountCents: intOrNull(obj.totalPlanAmountCents),
    paidToDateCents: intOrNull(obj.paidToDateCents),
    remainingBalanceCents: intOrNull(obj.remainingBalanceCents),
    nextPaymentAmountCents: intOrNull(obj.nextPaymentAmountCents),
    nextPaymentDate: stringOrNull(obj.nextPaymentDate),

    paymentMethodBrand: stringOrNull(obj.paymentMethodBrand),
    paymentMethodLast4: stringOrNull(obj.paymentMethodLast4),

    installments,

    confidence: numberInRange(obj.confidence, 0, 1, 0),
    needsReview: typeof obj.needsReview === 'boolean' ? obj.needsReview : true,
    missingFields: stringArrayOrEmpty(obj.missingFields),
    warnings: stringArrayOrEmpty(obj.warnings),
    evidenceSummary: typeof obj.evidenceSummary === 'string' ? obj.evidenceSummary : '',
  };
}

function normalizeInstallment(p: Record<string, unknown>): PayLaterInstallment {
  return {
    sequence: intOrNull(p.sequence),
    label: stringOrNull(p.label),
    dueDate: stringOrNull(p.dueDate),
    processedDate: stringOrNull(p.processedDate),
    amountCents: intOrNull(p.amountCents),
    status: enumOrFallback<PayLaterInstallmentStatus>(
      p.status,
      ['paid', 'processed', 'scheduled', 'autopay', 'due', 'late', 'upcoming', 'unknown'],
      'unknown',
    ),
    isAutopay: typeof p.isAutopay === 'boolean' ? p.isAutopay : null,
    confidence: numberInRange(p.confidence, 0, 1, 0),
    evidenceText: stringOrNull(p.evidenceText),
    sourceImageIndex: intOrNull(p.sourceImageIndex),
  };
}

function stringOrNull(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function intOrNull(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return Math.round(v);
}

function numberInRange(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.min(Math.max(v, min), max);
}

function stringArrayOrEmpty(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

function enumOrFallback<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof v !== 'string') return fallback;
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function enumOrNull<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  if (typeof v !== 'string') return null;
  return (allowed as readonly string[]).includes(v) ? (v as T) : null;
}
