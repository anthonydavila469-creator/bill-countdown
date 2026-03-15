import type { FieldEvidence, ParsedBillFields } from '@/types/parser';

export function applyPostProcessing(
  fields: ParsedBillFields,
  postprocessConfig: Record<string, unknown> = {},
  evidence: FieldEvidence[] = []
): { fields: ParsedBillFields; evidence: FieldEvidence[]; rejectedReasons: string[] } {
  const nextFields = { ...fields };
  const nextEvidence = [...evidence];
  const rejectedReasons: string[] = [];

  if (nextFields.amount == null && typeof postprocessConfig.default_amount === 'number') {
    nextFields.amount = postprocessConfig.default_amount;
    nextEvidence.push({ field: 'amount', source: 'postprocess', value: nextFields.amount, snippet: 'default amount' });
  }

  if (typeof nextFields.category === 'string') {
    nextFields.category = nextFields.category.toLowerCase().replace(/[ -]/g, '_') as typeof nextFields.category;
  }

  if (nextFields.amount != null && nextFields.amount < 0) {
    rejectedReasons.push('negative_amount');
  }

  if (nextFields.due_date) {
    const dueDate = new Date(nextFields.due_date);
    const now = new Date();
    const tooOldDays = typeof postprocessConfig.reject_due_date_older_than_days === 'number'
      ? Number(postprocessConfig.reject_due_date_older_than_days)
      : 45;
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - tooOldDays);
    if (!Number.isNaN(dueDate.getTime()) && dueDate < cutoff) {
      rejectedReasons.push('old_due_date');
    }
  }

  return {
    fields: nextFields,
    evidence: nextEvidence,
    rejectedReasons,
  };
}
