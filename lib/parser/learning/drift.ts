import { createAdminClient } from '@/lib/supabase/admin';
import { executeTemplate } from '@/lib/parser/executeTemplate';
import type { DriftDetectionResult, ShadowRunResult } from '@/types/learning';
import type { VendorTemplate } from '@/types/parser';
import {
  calculateAgreementScore,
  coerceParsedBillFields,
  type EmailRow,
  type ParseRunRow,
  toNormalizedEmailFromRow,
} from './utils';

interface DriftMetricInsert {
  template_id: string;
  period_start: string;
  period_end: string;
  total_runs: number;
  null_rate: number;
  correction_rate: number;
  ai_fallback_rate: number;
  avg_confidence: number;
}

export async function runDriftDetection(): Promise<DriftDetectionResult[]> {
  const admin = createAdminClient();
  const { data: templates, error } = await admin
    .from('vendor_templates')
    .select('*')
    .eq('status', 'active');

  if (error) {
    throw new Error(`Failed to load active templates: ${error.message}`);
  }

  const results: DriftDetectionResult[] = [];
  for (const template of (templates || []) as VendorTemplate[]) {
    results.push(await runDriftDetectionForTemplate(template));
  }

  return results;
}

export async function runShadowTest(emailParseRunId: string, candidateTemplateId: string): Promise<ShadowRunResult> {
  const admin = createAdminClient();
  const parseRun = await loadParseRun(emailParseRunId);
  const candidate = await loadTemplate(candidateTemplateId);

  if (!parseRun.email_id) {
    throw new Error(`Parse run ${emailParseRunId} does not have a backing email`);
  }

  const email = await loadEmail(parseRun.email_id);
  const normalized = toNormalizedEmailFromRow(email);
  const shadowExecution = executeTemplate(normalized, candidate);
  const productionFields = coerceParsedBillFields(parseRun.parsed_fields);
  const agreementScore = calculateAgreementScore(shadowExecution.fields, productionFields);

  const payload = {
    template_id: parseRun.template_id,
    email_parse_run_id: emailParseRunId,
    candidate_template_id: candidateTemplateId,
    shadow_result: {
      matched: shadowExecution.matched,
      overall_confidence: shadowExecution.overallConfidence,
      fields: shadowExecution.fields,
      field_confidence: shadowExecution.fieldConfidence,
      evidence: shadowExecution.evidence,
    },
    production_result: {
      template_id: parseRun.template_id,
      fields: parseRun.parsed_fields,
      field_confidence: parseRun.field_confidence,
      overall_confidence: parseRun.overall_confidence,
      ai_used: parseRun.ai_used,
    },
    agreement_score: agreementScore,
  };

  const { data, error } = await admin
    .from('template_shadow_runs')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to store shadow run: ${error?.message || 'Unknown error'}`);
  }

  return data as ShadowRunResult;
}

async function runDriftDetectionForTemplate(template: VendorTemplate): Promise<DriftDetectionResult> {
  const admin = createAdminClient();
  const now = new Date();
  const periodEnd = now.toISOString();
  const periodStartDate = new Date(now);
  periodStartDate.setDate(periodStartDate.getDate() - 7);
  const periodStart = periodStartDate.toISOString();

  const { data: runs, error: runsError } = await admin
    .from('email_parse_runs')
    .select('id, user_id, email_id, template_id, resolved_vendor_id, parsed_fields, field_confidence, overall_confidence, ai_used, created_at')
    .eq('template_id', template.id)
    .gte('created_at', periodStart)
    .lt('created_at', periodEnd);

  if (runsError) {
    throw new Error(`Failed to load parse runs for drift detection: ${runsError.message}`);
  }

  const parsedRuns = (runs || []) as ParseRunRow[];
  const totalRuns = parsedRuns.length;
  const nullRate = totalRuns === 0
    ? 0
    : parsedRuns.filter((run) => {
      const fields = coerceParsedBillFields(run.parsed_fields);
      return fields.amount == null || fields.due_date == null;
    }).length / totalRuns;

  const { count: correctionCount, error: correctionError } = await admin
    .from('learning_events')
    .select('id', { count: 'exact', head: true })
    .eq('template_id', template.id)
    .eq('event_type', 'correction')
    .gte('created_at', periodStart)
    .lt('created_at', periodEnd);

  if (correctionError) {
    throw new Error(`Failed to load corrections for template ${template.id}: ${correctionError.message}`);
  }

  const correctionRate = totalRuns === 0 ? 0 : (correctionCount || 0) / totalRuns;
  const aiFallbackRate = totalRuns === 0 ? 0 : parsedRuns.filter((run) => run.ai_used).length / totalRuns;
  const avgConfidence = totalRuns === 0
    ? 0
    : parsedRuns.reduce((sum, run) => sum + (run.overall_confidence || 0), 0) / totalRuns;

  const metric: DriftMetricInsert = {
    template_id: template.id,
    period_start: periodStart,
    period_end: periodEnd,
    total_runs: totalRuns,
    null_rate: nullRate,
    correction_rate: correctionRate,
    ai_fallback_rate: aiFallbackRate,
    avg_confidence: avgConfidence,
  };

  const previousMetric = await loadPreviousMetric(template.id, periodStart);
  const severity = determineSeverity(metric, previousMetric);
  const action = await applyDriftAction(template, severity);

  const { error: insertError } = await admin
    .from('template_drift_metrics')
    .insert(metric);

  if (insertError) {
    throw new Error(`Failed to store drift metric for ${template.id}: ${insertError.message}`);
  }

  if (severity === 'high') {
    console.error('[DRIFT] High severity drift detected', { templateId: template.id, metric, previousMetric });
  } else if (severity === 'medium') {
    console.warn('[DRIFT] Medium severity drift detected', { templateId: template.id, metric, previousMetric });
  } else {
    console.log('[DRIFT] Low severity drift', { templateId: template.id, metric, previousMetric });
  }

  return {
    templateId: template.id,
    severity,
    metrics: metric,
    previousMetrics: previousMetric,
    action,
  };
}

async function applyDriftAction(
  template: VendorTemplate,
  severity: DriftDetectionResult['severity']
): Promise<'none' | 'raise_verify_threshold' | 'disabled'> {
  const admin = createAdminClient();

  if (severity === 'high') {
    const { error } = await admin
      .from('vendor_templates')
      .update({
        status: 'disabled',
      })
      .eq('id', template.id);

    if (error) {
      throw new Error(`Failed to disable drifting template ${template.id}: ${error.message}`);
    }

    return 'disabled';
  }

  if (severity === 'medium') {
    const currentConfig = template.confidence_config || {};
    const acceptThreshold = Math.min((currentConfig.acceptThreshold || 0.92) + 0.04, 0.99);
    const aiVerifyThreshold = Math.min((currentConfig.aiVerifyThreshold || 0.7) + 0.03, acceptThreshold - 0.01);

    const { error } = await admin
      .from('vendor_templates')
      .update({
        confidence_config: {
          ...currentConfig,
          acceptThreshold,
          aiVerifyThreshold,
        },
      })
      .eq('id', template.id);

    if (error) {
      throw new Error(`Failed to tighten thresholds for ${template.id}: ${error.message}`);
    }

    return 'raise_verify_threshold';
  }

  return 'none';
}

function determineSeverity(
  current: DriftMetricInsert,
  previous: DriftMetricInsert | null
): DriftDetectionResult['severity'] {
  if (current.null_rate > 0.3) {
    return 'high';
  }

  if (previous && (
    doubled(current.null_rate, previous.null_rate) ||
    doubled(current.correction_rate, previous.correction_rate) ||
    doubled(current.ai_fallback_rate, previous.ai_fallback_rate)
  )) {
    return 'high';
  }

  if (previous && (
    increasedByHalf(current.null_rate, previous.null_rate) ||
    increasedByHalf(current.correction_rate, previous.correction_rate) ||
    increasedByHalf(current.ai_fallback_rate, previous.ai_fallback_rate)
  )) {
    return 'medium';
  }

  return 'low';
}

async function loadPreviousMetric(templateId: string, before: string): Promise<DriftMetricInsert | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('template_drift_metrics')
    .select('template_id, period_start, period_end, total_runs, null_rate, correction_rate, ai_fallback_rate, avg_confidence')
    .eq('template_id', templateId)
    .lt('period_end', before)
    .order('period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load previous drift metric: ${error.message}`);
  }

  return (data as DriftMetricInsert | null) || null;
}

async function loadParseRun(emailParseRunId: string): Promise<ParseRunRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('email_parse_runs')
    .select('id, user_id, email_id, template_id, resolved_vendor_id, parsed_fields, field_confidence, overall_confidence, ai_used, created_at')
    .eq('id', emailParseRunId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to load parse run ${emailParseRunId}: ${error?.message || 'Unknown error'}`);
  }

  return data as ParseRunRow;
}

async function loadTemplate(templateId: string): Promise<VendorTemplate> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('vendor_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to load template ${templateId}: ${error?.message || 'Unknown error'}`);
  }

  return data as VendorTemplate;
}

async function loadEmail(emailId: string): Promise<EmailRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('emails_raw')
    .select('id, user_id, gmail_message_id, subject, from_address, date_received, body_plain, body_html, body_cleaned')
    .eq('id', emailId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to load email ${emailId}: ${error?.message || 'Unknown error'}`);
  }

  return data as EmailRow;
}

function doubled(current: number, previous: number): boolean {
  if (previous <= 0) return false;
  return current >= previous * 2;
}

function increasedByHalf(current: number, previous: number): boolean {
  if (previous <= 0) return false;
  return current >= previous * 1.5;
}
