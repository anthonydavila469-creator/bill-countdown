import { createHash } from 'crypto';
import { buildNormalizedEmail, subjectShape as normalizeSubjectShape } from '@/lib/parser/normalize/helpers';
import type { EmailType, NormalizedEmail, ParsedBillFields, VendorTemplate } from '@/types/parser';
import type { LearningEvent } from '@/types/learning';
import { normalizeWhitespace } from '@/lib/parser/utils';

export const AMOUNT_LABELS = [
  'amount due',
  'balance due',
  'new balance',
  'total due',
  'minimum payment due',
  'current balance',
];

export const DATE_LABELS = [
  'due date',
  'payment due',
  'due on',
  'pay by',
  'draft date',
];

const SUBJECT_STOP_WORDS = new Set([
  'your',
  'the',
  'for',
  'and',
  'bill',
  'statement',
  'payment',
  'is',
  'are',
  'now',
  'ready',
  'due',
  'from',
]);

const FIELD_KEYS: Array<keyof ParsedBillFields> = [
  'name',
  'amount',
  'due_date',
  'category',
  'is_recurring',
  'recurrence_interval',
  'account_last4',
];

export interface LearningEventRow extends LearningEvent {
  original_fields: Record<string, unknown>;
  corrected_fields: Record<string, unknown>;
}

export interface ParseRunRow {
  id: string;
  user_id: string;
  email_id: string | null;
  template_id: string | null;
  resolved_vendor_id: string | null;
  parsed_fields: Record<string, unknown>;
  field_confidence: Record<string, unknown>;
  overall_confidence: number | null;
  ai_used: boolean;
  created_at: string;
}

export interface EmailRow {
  id: string;
  user_id: string;
  gmail_message_id: string;
  subject: string;
  from_address: string;
  date_received: string;
  body_plain: string | null;
  body_html: string | null;
  body_cleaned: string | null;
}

export interface LearningCluster {
  key: string;
  vendorId: string;
  userIds: string[];
  emailType: EmailType;
  subjectShape: string;
  senderDomain: string;
  events: LearningEventRow[];
}

export function toSubjectShape(subject: string): string {
  return normalizeSubjectShape(subject);
}

export function buildDomFingerprint(html?: string | null): string | null {
  if (!html) return null;
  const tags = [...html.matchAll(/<\/?([a-z0-9-]+)/gi)].map((match) => `<${match[1].toLowerCase()}>`).join('');
  return tags ? tags.slice(0, 64) : null;
}

export function collectLabelPositions(bodyText: string): Record<string, number[]> {
  const lower = bodyText.toLowerCase();
  const labels = [...AMOUNT_LABELS, ...DATE_LABELS];
  const positions: Record<string, number[]> = {};

  for (const label of labels) {
    let cursor = 0;
    while (cursor < lower.length) {
      const index = lower.indexOf(label, cursor);
      if (index === -1) break;
      positions[label] = positions[label] || [];
      positions[label].push(index);
      cursor = index + label.length;
    }
  }

  return positions;
}

export function buildClusterKey(emailType: EmailType, subjectShape: string, senderDomain: string): string {
  return `${emailType}__${subjectShape.toLowerCase()}__${senderDomain.toLowerCase()}`;
}

export function hashKey(value: string): string {
  return createHash('sha1').update(value).digest('hex').slice(0, 12);
}

export function buildTemplateKey(clusterKey: string): string {
  return `learned_${hashKey(clusterKey)}`;
}

export function coerceParsedBillFields(value: Record<string, unknown> | null | undefined): ParsedBillFields {
  const source = value || {};
  return {
    name: typeof source.name === 'string' ? source.name : null,
    amount: typeof source.amount === 'number' ? source.amount : null,
    due_date: typeof source.due_date === 'string' ? source.due_date : null,
    category: typeof source.category === 'string' ? (source.category as ParsedBillFields['category']) : null,
    is_recurring: typeof source.is_recurring === 'boolean' ? source.is_recurring : null,
    recurrence_interval: typeof source.recurrence_interval === 'string' ? (source.recurrence_interval as ParsedBillFields['recurrence_interval']) : null,
    account_last4: typeof source.account_last4 === 'string' ? source.account_last4 : null,
  };
}

export function getLearningTargetFields(event: LearningEventRow): ParsedBillFields {
  const corrected = coerceParsedBillFields(event.corrected_fields);
  const original = coerceParsedBillFields(event.original_fields);
  return {
    ...original,
    ...Object.fromEntries(
      Object.entries(corrected).filter(([, value]) => value !== null && value !== undefined)
    ),
  };
}

export function inferEmailType(event: LearningEventRow, parseRun?: ParseRunRow | null, template?: VendorTemplate | null): EmailType {
  const originalMeta = (event.original_fields?.meta ?? {}) as Record<string, unknown>;
  const correctedMeta = (event.corrected_fields?.meta ?? {}) as Record<string, unknown>;
  const metaType = originalMeta.email_type ?? correctedMeta.email_type ?? event.original_fields?.email_type ?? event.corrected_fields?.email_type;

  if (typeof metaType === 'string') {
    return metaType as EmailType;
  }

  if (template?.email_type) {
    return template.email_type;
  }

  if (parseRun?.template_id) {
    return 'bill_due';
  }

  return 'bill_due';
}

export function toNormalizedEmailFromRow(email: EmailRow): NormalizedEmail {
  return buildNormalizedEmail({
    id: email.id,
    userId: email.user_id,
    provider: 'other',
    providerMessageId: email.gmail_message_id,
    subject: email.subject,
    from: email.from_address,
    receivedAt: email.date_received,
    bodyPlain: email.body_plain,
    bodyHtml: email.body_html,
    fallbackText: email.body_cleaned,
  });
}

export function calculateAgreementScore(a: ParsedBillFields, b: ParsedBillFields): number {
  let total = 0;
  let matched = 0;

  for (const key of FIELD_KEYS) {
    const left = a[key];
    const right = b[key];
    if (left == null && right == null) continue;
    total += 1;
    if (fieldValuesEqual(left, right)) {
      matched += 1;
    }
  }

  return total === 0 ? 1 : matched / total;
}

export function calculatePrecisionRecall(predicted: ParsedBillFields, truth: ParsedBillFields): {
  precision: number;
  recall: number;
} {
  let predictedCount = 0;
  let truthCount = 0;
  let correctCount = 0;

  for (const key of FIELD_KEYS) {
    const predictedValue = predicted[key];
    const truthValue = truth[key];

    if (predictedValue != null) predictedCount += 1;
    if (truthValue != null) truthCount += 1;

    if (predictedValue != null && truthValue != null && fieldValuesEqual(predictedValue, truthValue)) {
      correctCount += 1;
    }
  }

  return {
    precision: predictedCount === 0 ? 0 : correctCount / predictedCount,
    recall: truthCount === 0 ? 0 : correctCount / truthCount,
  };
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function getStableSubjectTokens(subjectShape: string): string[] {
  return [...new Set(
    subjectShape
      .toLowerCase()
      .split(/[^a-z0-9/$]+/)
      .map((token) => token.trim())
      .filter((token) =>
        token.length >= 3 &&
        !token.includes('xx') &&
        token !== 'mm' &&
        token !== 'dd' &&
        !SUBJECT_STOP_WORDS.has(token)
      )
  )].slice(0, 3);
}

export function pickStableLabel(events: LearningEventRow[], labels: string[]): string | null {
  const counts = new Map<string, number>();

  for (const event of events) {
    const positions = (event.label_positions || {}) as Record<string, number[]>;
    for (const label of labels) {
      if ((positions[label] || []).length > 0) {
        counts.set(label, (counts.get(label) || 0) + 1);
      }
    }
  }

  let bestLabel: string | null = null;
  let bestCount = 0;
  for (const [label, count] of counts.entries()) {
    if (count > bestCount) {
      bestLabel = label;
      bestCount = count;
    }
  }

  return bestCount >= Math.ceil(events.length * 0.6) ? bestLabel : null;
}

export function groupLearningClusters(
  events: LearningEventRow[],
  parseRuns: Map<string, ParseRunRow>,
  templates: Map<string, VendorTemplate>
): LearningCluster[] {
  const clusters = new Map<string, LearningCluster>();

  for (const event of events) {
    const parseRun = parseRuns.get(event.email_parse_run_id);
    const template = event.template_id ? templates.get(event.template_id) || null : null;
    const emailType = inferEmailType(event, parseRun, template);
    const senderDomain = (event.sender_domain || '').toLowerCase();
    if (!senderDomain || !event.subject_shape) continue;

    const key = buildClusterKey(emailType, event.subject_shape, senderDomain);
    const existing = clusters.get(key);

    if (existing) {
      existing.events.push(event);
      if (!existing.userIds.includes(event.user_id)) {
        existing.userIds.push(event.user_id);
      }
      continue;
    }

    clusters.set(key, {
      key,
      vendorId: event.vendor_id,
      userIds: [event.user_id],
      emailType,
      subjectShape: event.subject_shape,
      senderDomain,
      events: [event],
    });
  }

  return [...clusters.values()];
}

export function getClusterMetadata(template: VendorTemplate): {
  clusterKey?: string;
  subjectShape?: string;
  senderDomain?: string;
  emailType?: EmailType;
} {
  const drift = (template.drift_config || {}) as Record<string, unknown>;
  const learning = (drift.learning || {}) as Record<string, unknown>;
  return {
    clusterKey: typeof learning.cluster_key === 'string' ? learning.cluster_key : undefined,
    subjectShape: typeof learning.subject_shape === 'string' ? learning.subject_shape : undefined,
    senderDomain: typeof learning.sender_domain === 'string' ? learning.sender_domain : undefined,
    emailType: typeof learning.email_type === 'string' ? (learning.email_type as EmailType) : undefined,
  };
}

function fieldValuesEqual(left: ParsedBillFields[keyof ParsedBillFields], right: ParsedBillFields[keyof ParsedBillFields]): boolean {
  if (typeof left === 'number' && typeof right === 'number') {
    return Math.abs(left - right) < 0.005;
  }

  if (typeof left === 'string' && typeof right === 'string') {
    return normalizeWhitespace(left).toLowerCase() === normalizeWhitespace(right).toLowerCase();
  }

  return left === right;
}
