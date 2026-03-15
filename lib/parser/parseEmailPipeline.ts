import { createAdminClient } from '@/lib/supabase/admin';
import { getEmailConnection } from '@/lib/email/tokens';
import { processEmail } from '@/lib/bill-extraction';
import type { EmailProviderName } from '@/lib/email/providers';
import type { BillCategory } from '@/types';
import type {
  AiVerificationResult,
  FieldConfidence,
  FieldEvidence,
  ParseRunResult,
  ParsedBillFields,
  ReviewReason,
  VendorTemplate,
} from '@/types/parser';
import { verifyDeterministicExtraction } from './aiVerify';
import { classifyEmail } from './classifyEmail';
import { normalizeEmail } from './normalize';
import { executeTemplate } from './executeTemplate';
import { insertParsedBill, reconcileBill, updateParsedBill } from './reconcile';
import { resolveVendor } from './resolveVendor';
import { queueBillReview } from './reviewQueue';
import { scoreDeterministicResult } from './scoreDeterministic';

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

async function upsertRawEmail(userId: string, email: PipelineInputEmail, bodyCleaned: string): Promise<{ id: string } | null> {
  const admin = createAdminClient();

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
  bodyHash: string;
  domFingerprint: string;
  textFingerprint: string;
  subjectShape: string;
  aiCorrections?: Partial<ParsedBillFields>;
  reconciliationDecision?: 'insert' | 'update' | 'skip' | 'review' | null;
  reconciliationConfidence?: number | null;
  reconciledBillId?: string | null;
  reviewReason?: ReviewReason | null;
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
      ai_prompt_version: payload.aiUsed ? 'verify-bill-v1' : null,
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
      body_hash: payload.bodyHash,
      dom_fingerprint: payload.domFingerprint,
      text_fingerprint: payload.textFingerprint,
      subject_shape: payload.subjectShape,
      ai_corrections: payload.aiCorrections ?? {},
      reconciliation_decision: payload.reconciliationDecision ?? null,
      reconciliation_confidence: payload.reconciliationConfidence ?? null,
      reconciled_bill_id: payload.reconciledBillId ?? null,
      review_reason: payload.reviewReason ?? null,
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

function mergeAiVerification(fields: ParsedBillFields, fieldConfidence: FieldConfidence, aiResult: AiVerificationResult): {
  fields: ParsedBillFields;
  fieldConfidence: FieldConfidence;
} {
  const nextFields = { ...fields, ...aiResult.fields };
  const nextConfidence = { ...fieldConfidence };

  for (const key of Object.keys(aiResult.corrections) as Array<keyof ParsedBillFields>) {
    nextConfidence[key] = Math.max(nextConfidence[key] ?? 0, aiResult.confidence);
  }

  if (aiResult.accepted) {
    if (nextFields.name) nextConfidence.name = Math.max(nextConfidence.name ?? 0, aiResult.confidence);
    if (nextFields.amount != null) nextConfidence.amount = Math.max(nextConfidence.amount ?? 0, aiResult.confidence);
    if (nextFields.due_date) nextConfidence.due_date = Math.max(nextConfidence.due_date ?? 0, aiResult.confidence);
  }

  return { fields: nextFields, fieldConfidence: nextConfidence };
}

function deriveReviewReason(fields: ParsedBillFields, baseReason?: ReviewReason | null, aiResult?: AiVerificationResult | null): ReviewReason {
  if (baseReason) return baseReason;
  if (aiResult?.disagreements.includes('name')) return 'vendor_mismatch';
  if (aiResult && aiResult.disagreements.length > 0) return 'ai_disagreement';
  if (fields.amount == null) return 'missing_amount';
  if (!fields.due_date) return 'missing_due_date';
  return 'low_confidence';
}

export async function parseEmailPipeline(options: {
  userId: string;
  email: PipelineInputEmail;
  skipAI?: boolean;
  forceReprocess?: boolean;
  deferLegacyFallback?: boolean;
}): Promise<ParseRunResult> {
  const admin = createAdminClient();
  const connection = await getEmailConnection(admin, options.userId);
  const provider = (connection?.email_provider || 'gmail') as EmailProviderName;

  const normalizedPreview = normalizeEmail({
    id: options.email.gmail_message_id,
    userId: options.userId,
    provider,
    providerMessageId: options.email.gmail_message_id,
    subject: options.email.subject,
    from: options.email.from,
    receivedAt: options.email.date,
    bodyPlain: options.email.body_plain || '',
    bodyHtml: options.email.body_html || '',
  });

  const rawEmail = await upsertRawEmail(options.userId, options.email, normalizedPreview.bodyText);
  const normalized = normalizeEmail({
    id: rawEmail?.id || options.email.gmail_message_id,
    userId: options.userId,
    provider,
    providerMessageId: options.email.gmail_message_id,
    subject: options.email.subject,
    from: options.email.from,
    receivedAt: options.email.date,
    bodyPlain: options.email.body_plain || '',
    bodyHtml: options.email.body_html || '',
  });

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
      bodyHash: normalized.bodyHash,
      domFingerprint: normalized.domFingerprint,
      textFingerprint: normalized.textFingerprint,
      subjectShape: normalized.subjectShape,
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
        bodyHash: normalized.bodyHash,
        domFingerprint: normalized.domFingerprint,
        textFingerprint: normalized.textFingerprint,
        subjectShape: normalized.subjectShape,
        reviewReason: 'low_confidence',
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
        reviewReason: 'low_confidence',
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
      bodyHash: normalized.bodyHash,
      domFingerprint: normalized.domFingerprint,
      textFingerprint: normalized.textFingerprint,
      subjectShape: normalized.subjectShape,
      reviewReason: fallbackResult.route === 'needs_review' ? 'low_confidence' : null,
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
      rawAiOutput: fallbackResult.extraction?.ai_raw_response ? { raw: fallbackResult.extraction.ai_raw_response } : null,
      reviewReason: fallbackResult.route === 'needs_review' ? 'low_confidence' : null,
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
  let matchedBillId: string | null = null;
  let rawAiOutput: Record<string, unknown> | null = null;
  let aiConfidence: number | null = null;
  let aiUsed = false;
  let reviewReason: ReviewReason | null = null;
  let aiResult: AiVerificationResult | null = null;
  let reconciliationDecision: 'insert' | 'update' | 'skip' | 'review' | null = null;
  let reconciliationConfidence: number | null = null;

  if (scored.decision === 'ai_verify') {
    if (options.skipAI) {
      scored.decision = 'review';
      reviewReason = 'low_confidence';
    } else {
      aiUsed = true;
      aiResult = await verifyDeterministicExtraction({
        email: normalized,
        fields,
        fieldConfidence,
        evidence: [...classification.evidence, ...vendor.evidence, ...best.evidence],
      });
      const merged = mergeAiVerification(fields, fieldConfidence, aiResult);
      fields = merged.fields;
      fieldConfidence = merged.fieldConfidence;
      rawAiOutput = aiResult.rawResponse;
      aiConfidence = aiResult.confidence;

      if (aiResult.accepted && fields.name && fields.due_date) {
        scored.decision = 'accept';
      } else {
        scored.decision = 'review';
        reviewReason = deriveReviewReason(fields, 'ai_disagreement', aiResult);
      }
    }
  }

  if (scored.decision === 'accept') {
    const reconciliation = await reconcileBill({
      userId: options.userId,
      emailMessageId: options.email.gmail_message_id,
      fields,
    });
    reconciliationDecision = reconciliation.decision;
    reconciliationConfidence = reconciliation.confidence;
    matchedBillId = reconciliation.matchedBillId ?? null;

    if (reconciliation.decision === 'skip') {
      createdBillId = null;
    } else if (reconciliation.decision === 'update' && reconciliation.matchedBillId) {
      createdBillId = await updateParsedBill({
        billId: reconciliation.matchedBillId,
        emailMessageId: options.email.gmail_message_id,
        fields: reconciliation.appliedFields || fields,
      });
      if (!createdBillId) {
        scored.decision = 'review';
        reviewReason = 'low_confidence';
      }
      matchedBillId = createdBillId;
    } else if (reconciliation.decision === 'review') {
      scored.decision = 'review';
      reviewReason = reconciliation.reviewReason || 'duplicate_uncertain';
    } else {
      createdBillId = await insertParsedBill({
        userId: options.userId,
        provider,
        emailMessageId: options.email.gmail_message_id,
        fields,
      });
      if (!createdBillId) {
        scored.decision = 'review';
        reviewReason = 'low_confidence';
      }
      matchedBillId = createdBillId;
    }
  }

  const finalReviewReason = scored.decision === 'review' ? deriveReviewReason(fields, reviewReason, aiResult) : null;
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
    evidence: [...classification.evidence, ...vendor.evidence, ...best.evidence, ...(aiResult?.evidence || [])],
    rawAiOutput,
    bodyHash: normalized.bodyHash,
    domFingerprint: normalized.domFingerprint,
    textFingerprint: normalized.textFingerprint,
    subjectShape: normalized.subjectShape,
    aiCorrections: aiResult?.corrections || {},
    reconciliationDecision,
    reconciliationConfidence,
    reconciledBillId: matchedBillId,
    reviewReason: finalReviewReason,
  });

  if (scored.decision === 'review' && parseRunId) {
    await queueBillReview({
      userId: options.userId,
      emailParseRunId: parseRunId,
      billId: matchedBillId,
      reviewReason: finalReviewReason || 'low_confidence',
      suggestedFields: fields,
    });
  }

  if (rawEmail?.id) {
    await markProcessed(rawEmail.id);
  }

  return {
    accepted: scored.decision === 'accept',
    decision: scored.decision,
    mode: aiUsed ? 'ai_verify' : 'deterministic',
    createdBillId,
    matchedBillId,
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
    evidence: [...classification.evidence, ...vendor.evidence, ...best.evidence, ...(aiResult?.evidence || [])],
    rawAiOutput,
    reviewReason: finalReviewReason,
    reconciliation: reconciliationDecision ? {
      decision: reconciliationDecision,
      confidence: reconciliationConfidence || 0,
      matchedBillId,
      reviewReason: finalReviewReason,
      appliedFields: fields,
    } : undefined,
  };
}
