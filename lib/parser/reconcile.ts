import type { EmailProviderName } from '@/lib/email/providers';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ParsedBillFields, ReconciliationResult } from '@/types/parser';
import { normalizeWhitespace } from './utils';

interface ExistingBillRow {
  id: string;
  name: string;
  amount: number | null;
  due_date: string;
  gmail_message_id: string | null;
  account_last4: string | null;
}

function normalizeVendor(value?: string | null): string {
  return normalizeWhitespace(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function scoreVendorMatch(existingName: string, nextName?: string | null): number {
  const left = normalizeVendor(existingName);
  const right = normalizeVendor(nextName);
  if (!left || !right) return 0;
  if (left === right) return 0.45;
  if (left.includes(right) || right.includes(left)) return 0.36;

  const leftWords = new Set(left.split(' '));
  const rightWords = right.split(' ').filter(Boolean);
  const overlap = rightWords.filter((word) => leftWords.has(word)).length;
  return rightWords.length > 0 ? 0.45 * (overlap / rightWords.length) * 0.7 : 0;
}

function scoreLast4(existingLast4?: string | null, nextLast4?: string | null): number {
  if (!existingLast4 || !nextLast4) return 0;
  return existingLast4 === nextLast4 ? 0.25 : 0;
}

function scoreDueDate(existingDueDate?: string | null, nextDueDate?: string | null): number {
  if (!existingDueDate || !nextDueDate) return 0;
  const left = new Date(existingDueDate);
  const right = new Date(nextDueDate);
  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) return 0;
  const diffDays = Math.abs(left.getTime() - right.getTime()) / 86_400_000;
  if (diffDays > 3) return 0;
  return 0.15 * (1 - diffDays / 3);
}

function scoreAmount(existingAmount?: number | null, nextAmount?: number | null): number {
  if (existingAmount == null || nextAmount == null) return 0;
  if (existingAmount === nextAmount) return 0.15;
  const baseline = Math.max(Math.abs(existingAmount), Math.abs(nextAmount), 1);
  const pctDiff = Math.abs(existingAmount - nextAmount) / baseline;
  if (pctDiff > 0.05) return 0;
  return 0.15 * (1 - pctDiff / 0.05);
}

export async function reconcileBill(options: {
  userId: string;
  emailMessageId: string;
  fields: ParsedBillFields;
}): Promise<ReconciliationResult> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('bills')
    .select('id, name, amount, due_date, gmail_message_id, account_last4')
    .eq('user_id', options.userId)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error || !data) {
    return {
      decision: 'insert',
      confidence: 0,
      details: { error: error?.message || 'Failed to load bills' },
    };
  }

  const exactMessageMatch = (data as ExistingBillRow[]).find((bill) => bill.gmail_message_id && bill.gmail_message_id === options.emailMessageId);
  if (exactMessageMatch) {
    return {
      decision: 'skip',
      confidence: 1,
      matchedBillId: exactMessageMatch.id,
      details: { reason: 'same_message_id' },
    };
  }

  let best: { bill: ExistingBillRow | null; score: number; breakdown: Record<string, number> } = {
    bill: null,
    score: 0,
    breakdown: {},
  };

  for (const bill of data as ExistingBillRow[]) {
    const breakdown = {
      vendor: scoreVendorMatch(bill.name, options.fields.name),
      last4: scoreLast4(bill.account_last4, options.fields.account_last4),
      dueDate: scoreDueDate(bill.due_date, options.fields.due_date),
      amount: scoreAmount(bill.amount, options.fields.amount),
    };
    const score = breakdown.vendor + breakdown.last4 + breakdown.dueDate + breakdown.amount;

    if (score > best.score) {
      best = { bill, score, breakdown };
    }
  }

  if (!best.bill) {
    return { decision: 'insert', confidence: 0, details: { reason: 'no_candidates' } };
  }

  if (best.score >= 0.92) {
    return {
      decision: 'skip',
      confidence: best.score,
      matchedBillId: best.bill.id,
      details: best.breakdown,
    };
  }

  if (best.score >= 0.72) {
    return {
      decision: 'update',
      confidence: best.score,
      matchedBillId: best.bill.id,
      appliedFields: {
        ...options.fields,
        amount: options.fields.amount ?? best.bill.amount,
        due_date: options.fields.due_date ?? best.bill.due_date,
        name: options.fields.name ?? best.bill.name,
        account_last4: options.fields.account_last4 ?? best.bill.account_last4,
      },
      details: best.breakdown,
    };
  }

  if (best.score >= 0.5) {
    return {
      decision: 'review',
      confidence: best.score,
      matchedBillId: best.bill.id,
      reviewReason: 'duplicate_uncertain',
      details: best.breakdown,
    };
  }

  return {
    decision: 'insert',
    confidence: best.score,
    details: best.breakdown,
  };
}

export async function insertParsedBill(options: {
  userId: string;
  provider: EmailProviderName;
  emailMessageId: string;
  fields: ParsedBillFields;
  reviewReason?: string | null;
}): Promise<string | null> {
  if (!options.fields.name || !options.fields.due_date) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('bills')
    .insert({
      user_id: options.userId,
      name: options.fields.name,
      amount: options.fields.amount ?? null,
      due_date: options.fields.due_date,
      category: options.fields.category ?? null,
      is_recurring: options.fields.is_recurring ?? false,
      recurrence_interval: options.fields.recurrence_interval ?? null,
      account_last4: options.fields.account_last4 ?? null,
      review_reason: options.reviewReason ?? null,
      source: options.provider,
      gmail_message_id: options.emailMessageId,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[PARSER] Failed to insert reconciled bill', error);
    return null;
  }

  return data.id;
}

export async function updateParsedBill(options: {
  billId: string;
  emailMessageId: string;
  fields: ParsedBillFields;
  reviewReason?: string | null;
}): Promise<string | null> {
  const admin = createAdminClient();
  const updatePayload: Record<string, unknown> = {
    gmail_message_id: options.emailMessageId,
    review_reason: options.reviewReason ?? null,
  };

  if (options.fields.name) updatePayload.name = options.fields.name;
  if (options.fields.amount != null) updatePayload.amount = options.fields.amount;
  if (options.fields.due_date) updatePayload.due_date = options.fields.due_date;
  if (options.fields.category) updatePayload.category = options.fields.category;
  if (options.fields.is_recurring != null) updatePayload.is_recurring = options.fields.is_recurring;
  if (options.fields.recurrence_interval) updatePayload.recurrence_interval = options.fields.recurrence_interval;
  if (options.fields.account_last4) updatePayload.account_last4 = options.fields.account_last4;

  const { data, error } = await admin
    .from('bills')
    .update(updatePayload)
    .eq('id', options.billId)
    .select('id')
    .single();

  if (error) {
    console.error('[PARSER] Failed to update reconciled bill', error);
    return null;
  }

  return data.id;
}
