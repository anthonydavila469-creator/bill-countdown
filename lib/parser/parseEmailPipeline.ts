import { createAdminClient } from '@/lib/supabase/admin';
import { extractBillFromEmail } from '@/lib/ai/extract-bill';
import { getEmailConnection } from '@/lib/email/tokens';
import { processEmail } from '@/lib/bill-extraction';
import type { EmailProviderName } from '@/lib/email/providers';
import type { BillCategory, RecurrenceInterval } from '@/types';
import type { FieldConfidence, FieldEvidence, NormalizedEmail, ParseRunResult, ParsedBillFields, VendorTemplate } from '@/types/parser';
import { classifyEmail } from './classifyEmail';
import { executeTemplate } from './executeTemplate';
import { resolveVendor } from './resolveVendor';
import { scoreDeterministicResult } from './scoreDeterministic';
import { normalizeWhitespace, parseFromAddress } from './utils';

type PipelineInputEmail = {
  gmail_message_id: string;
  subject: string;
  from: string;
  date: string;
  body_plain?: string;
  body_html?: string;
};

function mapCategory(value: unknown): BillCategory | null {
  if (typeof value !== 'string') return null;
  const normalized = value.toLowerCase().replace(/[ -]/g, '_');
  const valid: BillCategory[] = ['utilities', 'subscription', 'rent', 'housing', 'insurance', 'phone', 'internet', 'credit_card', 'loan', 'health', 'other'];
  return valid.includes(normalized as BillCategory) ? (normalized as BillCategory) : 'other';
}

function mapRecurrence(value: unknown): RecurrenceInterval | null {
  if (typeof value !== 'string') return null;
  const normalized = value.toLowerCase();
  const valid: RecurrenceInterval[] = ['weekly', 'biweekly', 'monthly', 'yearly'];
  return valid.includes(normalized as RecurrenceInterval) ? (normalized as RecurrenceInterval) : null;
}

async function upsertRawEmail(userId: string, email: PipelineInputEmail): Promise<{ id: string } | null> {
  const admin = createAdminClient();
  const bodyCleaned = normalizeWhitespace([email.body_plain || '', email.body_html || ''].join(' '));

  const { data, error } = await admin
    .from('emails_raw')
    .upsert({
      user_id: userId,
      gmail_message_id: email.gmail_message_id,
      subject: email.subject,
      from_address: email.from,
      date_received: email.date,
      body_plain: email.body_plain || null,
      body_html: email.body_html || null,
      body_cleaned: bodyCleaned,
    }, { onConflict: 'user_id,gmail_message_id' })
    .select('id')
    .single();

  if (error) {
    console.error('[PARSER] Failed to upsert raw email', error);
    return null;
  }

  return data;
}

async function markProcessed(emailId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from('emails_raw').update({ processed_at: new Date().toISOString() }).eq('id', emailId);
}

async function createBillFromParsedFields(userId: string, email: PipelineInputEmail, fields: ParsedBillFields): Promise<string | null> {
  if (!fields.name || !fields.due_date) return null;

  const admin = createAdminClient();
  const userClient = createAdminClient();
  const connection = await getEmailConnection(userClient, userId);
  const source = (connection?.email_provider || 'gmail') as EmailProviderName;

  const { data, error } = await admin
    .from('bills')
    .insert({
      user_id: userId,
      name: fields.name,
      amount: fields.amount ?? null,
      due_date: fields.due_date,
      category: fields.category ?? null,
      is_recurring: fields.is_recurring ?? false,
      recurrence_interval: fields.recurrence_interval ?? null,
      source,
      gmail_message_id: email.gmail_message_id,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[PARSER] Failed to create bill', error);
    return null;
  }

  return data.id;
}

async function logParseRun(payload: {
  emailId: string | null;
  userId: string;
  classifierConfidence: number;
  vendorId?: string | null;
  vendorConfidence?: number;
  templateId?: string | null;
  templateMatchConfidence?: number;
  aiUsed: boolean;
  aiMode?: 'extract' | 'verify' | null;
  aiConfidence?: number | null;
  overallConfidence?: number | null;
  actionConfidence?: number | null;
  decision: 'accept' | 'ai_verify' | 'review' | 'rejected';
  parsedFields: ParsedBillFields;
  fieldConfidence: FieldConfidence;
  evidence: FieldEvidence[];
  rawAiOutput?: Record<string, unknown> | null;
}): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('email_parse_runs')
    .insert({
      email_id: payload.emailId,
      user_id: payload.userId,
      classifier_version: 'rules-v1',
      classifier_confidence: payload.classifierConfidence,
      vendor_resolution_version: 'aliases-v1',
      resolved_vendor_id: payload.vendorId ?? null,
      vendor_resolution_confidence: payload.vendorConfidence ?? null,
      template_id: payload.templateId ?? null,
      template_match_confidence: payload.templateMatchConfidence ?? null,
      ai_model: payload.aiUsed ? 'claude-sonnet-4-20250514' : null,
      ai_prompt_version: payload.aiUsed ? 'extract-bill-v1' : null,
      ai_used: payload.aiUsed,
      ai_mode: payload.aiMode ?? null,
      ai_confidence: payload.aiConfidence ?? null,
      overall_confidence: payload.overallConfidence ?? null,
      action_confidence: payload.actionConfidence ?? null,
      decision: payload.decision,
      parsed_fields: payload.parsedFields,
      field_confidence: payload.fieldConfidence,
      evidence_json: { evidence: payload.evidence },
      raw_ai_output: payload.rawAiOutput ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[PARSER] Failed to log parse run', error);
    return null;
  }

  return data.id;
}

async function loadTemplates(vendorId: string | null, emailType: string, userId: string): Promise<VendorTemplate[]> {
  const admin = createAdminClient();
  let query = admin
    .from('vendor_templates')
    .select('*')
    .eq('status', 'active')
    .in('scope', ['global', 'local'])
    .or(`email_type.eq.${emailType},email_type.eq.other`)
    .order('version', { ascending: false });

  if (vendorId) {
    query = query.eq('vendor_id', vendorId);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error('[PARSER] Failed to load templates', error);
    return [];
  }

  return (data as VendorTemplate[]).filter((template) => template.scope === 'global' || template.owner_user_id === userId);
}

function toNormalizedEmail(userId: string, provider: EmailProviderName, emailId: string, email: PipelineInputEmail): NormalizedEmail {
  const parsed = parseFromAddress(email.from);
  return {
    id: emailId,
    userId,
    provider,
    providerMessageId: email.gmail_message_id,
    subject: email.subject,
    from: email.from,
    fromName: parsed.fromName,
    fromEmail: parsed.fromEmail,
    senderDomain: parsed.senderDomain,
    receivedAt: email.date,
    headers: {},
    bodyPlain: email.body_plain || '',
    bodyHtml: email.body_html || null,
    bodyText: normalizeWhitespace([email.subject, email.body_plain || '', email.body_html || ''].join(' ')),
  };
}

function mergeAiResult(fields: ParsedBillFields, fieldConfidence: FieldConfidence, aiResult: Awaited<ReturnType<typeof extractBillFromEmail>>): {
  fields: ParsedBillFields;
  fieldConfidence: FieldConfidence;
  rawAiOutput: Record<string, unknown> | null;
  aiConfidence: number;
} {
  if (!aiResult.success) {
    return { fields, fieldConfidence, rawAiOutput: null, aiConfidence: 0 };
  }

  return {
    fields: {
      ...fields,
      name: aiResult.bill.name || fields.name,
      amount: aiResult.bill.amount ?? fields.amount ?? null,
      due_date: aiResult.bill.due_date || fields.due_date,
      category: mapCategory(aiResult.bill.category) || fields.category,
      is_recurring: aiResult.bill.is_recurring,
      recurrence_interval: mapRecurrence(aiResult.bill.recurrence_interval) || fields.recurrence_interval,
    },
    fieldConfidence: {
      ...fieldConfidence,
      name: Math.max(fieldConfidence.name ?? 0, aiResult.bill.confidence),
      amount: Math.max(fieldConfidence.amount ?? 0, aiResult.bill.confidence),
      due_date: Math.max(fieldConfidence.due_date ?? 0, aiResult.bill.confidence),
    },
    rawAiOutput: aiResult.bill as unknown as Record<string, unknown>,
    aiConfidence: aiResult.bill.confidence,
  };
}

export async function parseEmailPipeline(options: {
  userId: string;
  email: PipelineInputEmail;
  skipAI?: boolean;
  forceReprocess?: boolean;
  deferLegacyFallback?: boolean;
}): Promise<ParseRunResult> {
  const admin = createAdminClient();
  const rawEmail = await upsertRawEmail(options.userId, options.email);
  const connection = await getEmailConnection(admin, options.userId);
  const normalized = toNormalizedEmail(options.userId, connection?.email_provider || 'gmail', rawEmail?.id || options.email.gmail_message_id, options.email);
  const classification = classifyEmail(normalized);

  if (!classification.isBillRelated) {
    const parseRunId = await logParseRun({
      emailId: rawEmail?.id || null,
      userId: options.userId,
      classifierConfidence: classification.confidence,
      aiUsed: false,
      decision: 'rejected',
      parsedFields: {},
      fieldConfidence: {},
      evidence: classification.evidence,
    });
    if (rawEmail?.id) await markProcessed(rawEmail.id);
    return {
      accepted: false,
      decision: 'rejected',
      mode: 'deterministic',
      parseRunId,
      reason: classification.type,
      emailType: classification.type,
      classifierConfidence: classification.confidence,
      aiUsed: false,
      parsedFields: {},
      fieldConfidence: {},
      evidence: classification.evidence,
    };
  }

  const vendor = await resolveVendor(normalized);
  const templates = await loadTemplates(vendor.vendorId, classification.type, options.userId);
  const executions = templates.map((template) => executeTemplate(normalized, template)).filter((result) => result.matched);
  const best = executions.sort((a, b) => b.overallConfidence - a.overallConfidence)[0];

  if (!best) {
    if (options.deferLegacyFallback) {
      const parseRunId = await logParseRun({
        emailId: rawEmail?.id || null,
        userId: options.userId,
        classifierConfidence: classification.confidence,
        vendorId: vendor.vendorId,
        vendorConfidence: vendor.confidence,
        aiUsed: false,
        decision: 'review',
        parsedFields: {},
        fieldConfidence: {},
        evidence: [...classification.evidence, ...vendor.evidence],
      });
      return {
        accepted: false,
        decision: 'review',
        mode: 'legacy_fallback',
        parseRunId,
        reason: 'no_template_match',
        emailType: classification.type,
        classifierConfidence: classification.confidence,
        vendorId: vendor.vendorId,
        vendorConfidence: vendor.confidence,
        aiUsed: false,
        parsedFields: {},
        fieldConfidence: {},
        evidence: [...classification.evidence, ...vendor.evidence],
      };
    }

    const fallbackResult = await processEmail({
      userId: options.userId,
      email: options.email,
      skipAI: options.skipAI,
      forceReprocess: options.forceReprocess,
    });

    const parseRunId = await logParseRun({
      emailId: rawEmail?.id || null,
      userId: options.userId,
      classifierConfidence: classification.confidence,
      vendorId: vendor.vendorId,
      vendorConfidence: vendor.confidence,
      aiUsed: true,
      aiMode: 'extract',
      aiConfidence: fallbackResult.extraction?.confidence_overall ?? null,
      overallConfidence: fallbackResult.extraction?.confidence_overall ?? null,
      actionConfidence: fallbackResult.extraction?.confidence_overall ?? null,
      decision: fallbackResult.route === 'auto_accept' ? 'accept' : fallbackResult.route === 'needs_review' ? 'review' : 'rejected',
      parsedFields: {
        name: fallbackResult.extraction?.extracted_name,
        amount: fallbackResult.extraction?.extracted_amount,
        due_date: fallbackResult.extraction?.extracted_due_date,
        category: mapCategory(fallbackResult.extraction?.extracted_category),
      },
      fieldConfidence: {
        name: fallbackResult.extraction?.confidence_name ?? undefined,
        amount: fallbackResult.extraction?.confidence_amount ?? undefined,
        due_date: fallbackResult.extraction?.confidence_due_date ?? undefined,
      },
      evidence: [...classification.evidence, ...vendor.evidence],
      rawAiOutput: fallbackResult.extraction?.ai_raw_response ? { raw: fallbackResult.extraction.ai_raw_response } : null,
    });

    return {
      accepted: fallbackResult.route === 'auto_accept',
      decision: fallbackResult.route === 'auto_accept' ? 'accept' : fallbackResult.route === 'needs_review' ? 'review' : 'rejected',
      mode: 'ai_extract',
      parseRunId,
      reason: 'legacy_fallback',
      emailType: classification.type,
      classifierConfidence: classification.confidence,
      vendorId: vendor.vendorId,
      vendorConfidence: vendor.confidence,
      aiUsed: true,
      parsedFields: {
        name: fallbackResult.extraction?.extracted_name,
        amount: fallbackResult.extraction?.extracted_amount,
        due_date: fallbackResult.extraction?.extracted_due_date,
        category: mapCategory(fallbackResult.extraction?.extracted_category),
      },
      fieldConfidence: {
        name: fallbackResult.extraction?.confidence_name ?? undefined,
        amount: fallbackResult.extraction?.confidence_amount ?? undefined,
        due_date: fallbackResult.extraction?.confidence_due_date ?? undefined,
      },
      evidence: [...classification.evidence, ...vendor.evidence],
      fallbackResult,
    };
  }

  const scored = scoreDeterministicResult({
    matchResult: best.matcher,
    fields: best.fields,
    fieldConfidence: best.fieldConfidence,
    confidenceConfig: templates.find((template) => template.id === best.templateId)?.confidence_config,
    vendorConfidence: vendor.confidence,
  });

  let fields = { ...best.fields };
  let fieldConfidence = { ...best.fieldConfidence };
  let createdBillId: string | null = null;
  let rawAiOutput: Record<string, unknown> | null = null;
  let aiConfidence: number | null = null;
  let aiUsed = false;

  if (scored.decision === 'ai_verify' && !options.skipAI) {
    aiUsed = true;
    const aiResult = await extractBillFromEmail({
      id: rawEmail?.id || options.email.gmail_message_id,
      from: options.email.from,
      subject: options.email.subject,
      body: normalizeWhitespace([options.email.body_plain || '', options.email.body_html || ''].join(' ')),
    });
    const merged = mergeAiResult(fields, fieldConfidence, aiResult);
    fields = merged.fields;
    fieldConfidence = merged.fieldConfidence;
    rawAiOutput = merged.rawAiOutput;
    aiConfidence = merged.aiConfidence;
    if (aiResult.success && aiResult.bill.name && aiResult.bill.due_date) {
      scored.decision = aiResult.bill.confidence >= 0.75 ? 'accept' : 'review';
    }
  }

  if (scored.decision === 'accept') {
    createdBillId = await createBillFromParsedFields(options.userId, options.email, fields);
    if (rawEmail?.id) await markProcessed(rawEmail.id);
  }

  const parseRunId = await logParseRun({
    emailId: rawEmail?.id || null,
    userId: options.userId,
    classifierConfidence: classification.confidence,
    vendorId: vendor.vendorId,
    vendorConfidence: vendor.confidence,
    templateId: best.templateId,
    templateMatchConfidence: best.matcher.normalizedScore,
    aiUsed,
    aiMode: aiUsed ? 'verify' : null,
    aiConfidence,
    overallConfidence: scored.overallConfidence,
    actionConfidence: scored.actionConfidence,
    decision: scored.decision,
    parsedFields: fields,
    fieldConfidence,
    evidence: [...classification.evidence, ...vendor.evidence, ...best.evidence],
    rawAiOutput,
  });

  return {
    accepted: scored.decision === 'accept',
    decision: scored.decision,
    mode: aiUsed ? 'ai_verify' : 'deterministic',
    createdBillId,
    parseRunId,
    reason: scored.decision,
    emailType: classification.type,
    classifierConfidence: classification.confidence,
    vendorId: vendor.vendorId,
    vendorConfidence: vendor.confidence,
    templateId: best.templateId,
    templateConfidence: best.matcher.normalizedScore,
    overallConfidence: scored.overallConfidence,
    actionConfidence: scored.actionConfidence,
    aiUsed,
    parsedFields: fields,
    fieldConfidence,
    evidence: [...classification.evidence, ...vendor.evidence, ...best.evidence],
    rawAiOutput,
  };
}
