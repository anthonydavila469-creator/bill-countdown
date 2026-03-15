import type { EmailProviderName } from '@/lib/email/providers';
import { getEmailConnection } from '@/lib/email/tokens';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ParsedBillFields, ReviewReason } from '@/types/parser';

export async function queueBillReview(options: {
  userId: string;
  emailParseRunId: string;
  billId?: string | null;
  reviewReason: ReviewReason;
  suggestedFields: ParsedBillFields;
}): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('bill_reviews')
    .insert({
      user_id: options.userId,
      email_parse_run_id: options.emailParseRunId,
      bill_id: options.billId ?? null,
      status: 'pending',
      review_reason: options.reviewReason,
      suggested_fields: options.suggestedFields,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[PARSER] Failed to queue bill review', error);
    return null;
  }

  return data.id;
}

export async function listPendingBillReviews(userId: string, limit = 50) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('bill_reviews')
    .select(`
      id,
      status,
      review_reason,
      suggested_fields,
      user_corrected_fields,
      created_at,
      resolved_at,
      bill_id,
      email_parse_run_id,
      bills (
        id,
        name,
        amount,
        due_date,
        category,
        account_last4,
        review_reason
      ),
      email_parse_runs (
        id,
        decision,
        overall_confidence,
        action_confidence,
        parsed_fields,
        field_confidence,
        evidence_json,
        email_id,
        emails_raw (
          subject,
          from_address,
          date_received
        )
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data;
}

export async function resolveBillReview(options: {
  userId: string;
  reviewId: string;
  correctedFields: ParsedBillFields;
}): Promise<{ reviewId: string; billId: string | null }> {
  const admin = createAdminClient();
  const { data: review, error } = await admin
    .from('bill_reviews')
    .select('id, bill_id, suggested_fields, email_parse_run_id')
    .eq('id', options.reviewId)
    .eq('user_id', options.userId)
    .single();

  if (error || !review) {
    throw new Error('Review not found');
  }

  const suggestedFields = (review.suggested_fields || {}) as ParsedBillFields;
  const mergedFields: ParsedBillFields = {
    ...suggestedFields,
    ...options.correctedFields,
  };

  if (!mergedFields.name || !mergedFields.due_date) {
    throw new Error('Resolved review requires at least name and due date');
  }

  let billId = review.bill_id as string | null;

  if (billId) {
    const { error: updateError } = await admin
      .from('bills')
      .update({
        name: mergedFields.name,
        amount: mergedFields.amount ?? null,
        due_date: mergedFields.due_date,
        category: mergedFields.category ?? null,
        is_recurring: mergedFields.is_recurring ?? false,
        recurrence_interval: mergedFields.recurrence_interval ?? null,
        account_last4: mergedFields.account_last4 ?? null,
        review_reason: null,
      })
      .eq('id', billId)
      .eq('user_id', options.userId);

    if (updateError) {
      throw updateError;
    }
  } else {
    const connection = await getEmailConnection(admin, options.userId);
    const provider = (connection?.email_provider || 'gmail') as EmailProviderName;
    const { data: parseRun } = await admin
      .from('email_parse_runs')
      .select('email_id')
      .eq('id', review.email_parse_run_id)
      .single();
    const { data: rawEmail } = parseRun?.email_id
      ? await admin.from('emails_raw').select('gmail_message_id').eq('id', parseRun.email_id).single()
      : { data: null };

    const { data: createdBill, error: createError } = await admin
      .from('bills')
      .insert({
        user_id: options.userId,
        name: mergedFields.name,
        amount: mergedFields.amount ?? null,
        due_date: mergedFields.due_date,
        category: mergedFields.category ?? null,
        is_recurring: mergedFields.is_recurring ?? false,
        recurrence_interval: mergedFields.recurrence_interval ?? null,
        account_last4: mergedFields.account_last4 ?? null,
        review_reason: null,
        source: provider,
        gmail_message_id: rawEmail?.gmail_message_id || null,
      })
      .select('id')
      .single();

    if (createError) {
      throw createError;
    }

    billId = createdBill.id;
  }

  const { error: resolveError } = await admin
    .from('bill_reviews')
    .update({
      bill_id: billId,
      status: 'resolved',
      user_corrected_fields: options.correctedFields,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', options.reviewId)
    .eq('user_id', options.userId);

  if (resolveError) {
    throw resolveError;
  }

  return { reviewId: options.reviewId, billId };
}

export async function dismissBillReview(options: { userId: string; reviewId: string }): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('bill_reviews')
    .update({
      status: 'dismissed',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', options.reviewId)
    .eq('user_id', options.userId);

  if (error) {
    throw error;
  }
}
