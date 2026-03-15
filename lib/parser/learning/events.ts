import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeWhitespace } from '@/lib/parser/utils';
import type { LearningEvent, StoreLearningEventInput } from '@/types/learning';
import type { ParsedBillFields } from '@/types/parser';
import { buildDomFingerprint, collectLabelPositions, toSubjectShape } from './utils';

const FIELD_KEYS: Array<keyof ParsedBillFields> = [
  'name',
  'amount',
  'due_date',
  'category',
  'is_recurring',
  'recurrence_interval',
  'account_last4',
];

export async function storeLearningEvent(input: StoreLearningEventInput): Promise<LearningEvent> {
  const admin = createAdminClient();
  const originalFields = input.originalFields;
  const correctedFields = {
    ...originalFields,
    ...(input.correction || {}),
  };
  const fieldDeltas = computeFieldDeltas(originalFields, correctedFields);
  const eventType = input.eventType || (Object.keys(fieldDeltas).length > 0 ? 'correction' : 'confirmation');
  const labelPositions = collectLabelPositions(input.normalizedEmail.bodyText);
  const anchorWindows = collectAnchorWindows(
    input.normalizedEmail.bodyText,
    labelPositions,
    input.evidence || []
  );

  const payload = {
    user_id: input.userId,
    vendor_id: input.vendorId,
    template_id: input.templateId ?? null,
    email_parse_run_id: input.emailParseRunId,
    event_type: eventType,
    scope: input.scope || 'local',
    original_fields: {
      ...originalFields,
      meta: {
        email_type: input.emailType ?? null,
      },
    },
    corrected_fields: correctedFields,
    field_deltas: fieldDeltas,
    anchor_windows: anchorWindows,
    label_positions: labelPositions,
    dom_fingerprint: buildDomFingerprint(input.normalizedEmail.bodyHtml),
    subject_shape: toSubjectShape(input.normalizedEmail.subject),
    sender_domain: input.normalizedEmail.senderDomain || null,
  };

  const { data, error } = await admin
    .from('learning_events')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to store learning event: ${error?.message || 'Unknown error'}`);
  }

  return data as LearningEvent;
}

function computeFieldDeltas(originalFields: ParsedBillFields, correctedFields: ParsedBillFields) {
  const deltas: Record<string, { from: string | number | boolean | null; to: string | number | boolean | null }> = {};

  for (const key of FIELD_KEYS) {
    const originalValue = originalFields[key] ?? null;
    const correctedValue = correctedFields[key] ?? null;
    if (originalValue === correctedValue) continue;
    deltas[key] = {
      from: originalValue,
      to: correctedValue,
    };
  }

  return deltas;
}

function collectAnchorWindows(
  bodyText: string,
  labelPositions: Record<string, number[]>,
  evidence: StoreLearningEventInput['evidence']
): Partial<Record<keyof ParsedBillFields | string, string[]>> {
  const windows: Partial<Record<keyof ParsedBillFields | string, string[]>> = {};
  const body = bodyText || '';

  for (const item of evidence || []) {
    if (!item.field || !item.snippet) continue;
    const index = body.toLowerCase().indexOf(item.snippet.toLowerCase());
    if (index === -1) continue;
    windows[item.field] = windows[item.field] || [];
    windows[item.field]?.push(sliceWindow(body, index));
  }

  for (const [label, positions] of Object.entries(labelPositions)) {
    for (const position of positions) {
      const field = inferFieldFromLabel(label);
      windows[field] = windows[field] || [];
      windows[field]?.push(sliceWindow(body, position));
    }
  }

  return Object.fromEntries(
    Object.entries(windows).map(([field, snippets]) => [field, [...new Set((snippets || []).map((snippet) => normalizeWhitespace(snippet)).filter(Boolean))]])
  );
}

function inferFieldFromLabel(label: string): keyof ParsedBillFields | 'unknown' {
  if (label.includes('amount') || label.includes('balance')) return 'amount';
  if (label.includes('due') || label.includes('draft')) return 'due_date';
  return 'unknown';
}

function sliceWindow(source: string, startIndex: number, radius = 20): string {
  const start = Math.max(0, startIndex - radius);
  const end = Math.min(source.length, startIndex + radius);
  return source.slice(start, end);
}
