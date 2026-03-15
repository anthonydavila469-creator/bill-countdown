import { createAdminClient } from '@/lib/supabase/admin';
import { executeTemplate } from '@/lib/parser/executeTemplate';
import type { PromotionResult } from '@/types/learning';
import type { VendorTemplate } from '@/types/parser';
import {
  average,
  calculatePrecisionRecall,
  getClusterMetadata,
  getLearningTargetFields,
  groupLearningClusters,
  type EmailRow,
  type LearningEventRow,
  type ParseRunRow,
  toNormalizedEmailFromRow,
} from './utils';

export async function evaluateCandidateForPromotion(templateId: string): Promise<PromotionResult> {
  const admin = createAdminClient();
  const candidate = await loadCandidateTemplate(templateId);
  const metadata = getClusterMetadata(candidate);

  if (!metadata.clusterKey || !metadata.subjectShape || !metadata.senderDomain || !metadata.emailType) {
    return {
      templateId,
      promoted: false,
      promotedScope: null,
      precisionScore: 0,
      recallScore: 0,
      exampleCount: 0,
      uniqueUsers: 0,
      shadowRunCount: 0,
      reason: 'missing_cluster_metadata',
    };
  }

  const events = await loadClusterEvents(candidate.vendor_id, metadata.subjectShape, metadata.senderDomain);
  if (events.length === 0) {
    return {
      templateId,
      promoted: false,
      promotedScope: null,
      precisionScore: 0,
      recallScore: 0,
      exampleCount: 0,
      uniqueUsers: 0,
      shadowRunCount: 0,
      reason: 'no_training_examples',
    };
  }

  const parseRuns = await loadParseRuns(events.map((event) => event.email_parse_run_id));
  const relevantEvents = groupLearningClusters(events, parseRuns, new Map()).find((cluster) => cluster.key === metadata.clusterKey)?.events || [];
  const emailIds = relevantEvents.map((event) => parseRuns.get(event.email_parse_run_id)?.email_id).filter((value): value is string => Boolean(value));
  const emails = await loadEmails(emailIds);
  const shadowRunCount = await countShadowRuns(templateId);

  if (shadowRunCount < 5) {
    await persistScores(templateId, 0, 0, relevantEvents.length);
    return {
      templateId,
      promoted: false,
      promotedScope: null,
      precisionScore: 0,
      recallScore: 0,
      exampleCount: relevantEvents.length,
      uniqueUsers: [...new Set(relevantEvents.map((event) => event.user_id))].length,
      shadowRunCount,
      reason: 'shadow_testing_required',
    };
  }

  const precisionScores: number[] = [];
  const recallScores: number[] = [];

  for (const event of relevantEvents) {
    const parseRun = parseRuns.get(event.email_parse_run_id);
    if (!parseRun?.email_id) continue;
    const email = emails.get(parseRun.email_id);
    if (!email) continue;

    const execution = executeTemplate(toNormalizedEmailFromRow(email), candidate);
    const truth = getLearningTargetFields(event);
    const metrics = calculatePrecisionRecall(execution.fields, truth);
    precisionScores.push(metrics.precision);
    recallScores.push(metrics.recall);
  }

  const precisionScore = average(precisionScores);
  const recallScore = average(recallScores);
  const exampleCount = precisionScores.length;
  const uniqueUsers = [...new Set(relevantEvents.map((event) => event.user_id))].length;

  await persistScores(templateId, precisionScore, recallScore, exampleCount);

  if (exampleCount >= 20 && uniqueUsers >= 5 && shadowRunCount >= 20 && precisionScore >= 0.95 && recallScore >= 0.9) {
    const { error } = await admin
      .from('vendor_templates')
      .update({
        status: 'active',
        scope: 'global',
        owner_user_id: null,
        precision_score: precisionScore,
        recall_score: recallScore,
        eval_sample_size: exampleCount,
      })
      .eq('id', templateId);

    if (error) {
      throw new Error(`Failed to promote template ${templateId} globally: ${error.message}`);
    }

    return {
      templateId,
      promoted: true,
      promotedScope: 'global',
      precisionScore,
      recallScore,
      exampleCount,
      uniqueUsers,
      shadowRunCount,
      reason: 'global_threshold_met',
    };
  }

  if (exampleCount >= 5 && precisionScore >= 0.9) {
    const { error } = await admin
      .from('vendor_templates')
      .update({
        status: 'active',
        scope: 'local',
        precision_score: precisionScore,
        recall_score: recallScore,
        eval_sample_size: exampleCount,
      })
      .eq('id', templateId);

    if (error) {
      throw new Error(`Failed to promote template ${templateId} locally: ${error.message}`);
    }

    return {
      templateId,
      promoted: true,
      promotedScope: 'local',
      precisionScore,
      recallScore,
      exampleCount,
      uniqueUsers,
      shadowRunCount,
      reason: 'local_threshold_met',
    };
  }

  return {
    templateId,
    promoted: false,
    promotedScope: null,
    precisionScore,
    recallScore,
    exampleCount,
    uniqueUsers,
    shadowRunCount,
    reason: 'thresholds_not_met',
  };
}

async function loadCandidateTemplate(templateId: string): Promise<VendorTemplate> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('vendor_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to load candidate template ${templateId}: ${error?.message || 'Unknown error'}`);
  }

  return data as VendorTemplate;
}

async function loadClusterEvents(vendorId: string, subjectShape: string, senderDomain: string): Promise<LearningEventRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('learning_events')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('subject_shape', subjectShape)
    .eq('sender_domain', senderDomain)
    .in('event_type', ['correction', 'confirmation']);

  if (error) {
    throw new Error(`Failed to load cluster events: ${error.message}`);
  }

  return (data || []) as LearningEventRow[];
}

async function loadParseRuns(ids: string[]): Promise<Map<string, ParseRunRow>> {
  const admin = createAdminClient();
  if (ids.length === 0) return new Map();

  const { data, error } = await admin
    .from('email_parse_runs')
    .select('id, user_id, email_id, template_id, resolved_vendor_id, parsed_fields, field_confidence, overall_confidence, ai_used, created_at')
    .in('id', ids);

  if (error) {
    throw new Error(`Failed to load parse runs: ${error.message}`);
  }

  return new Map(((data || []) as ParseRunRow[]).map((row) => [row.id, row]));
}

async function loadEmails(ids: string[]): Promise<Map<string, EmailRow>> {
  const admin = createAdminClient();
  if (ids.length === 0) return new Map();

  const { data, error } = await admin
    .from('emails_raw')
    .select('id, user_id, gmail_message_id, subject, from_address, date_received, body_plain, body_html, body_cleaned')
    .in('id', ids);

  if (error) {
    throw new Error(`Failed to load emails: ${error.message}`);
  }

  return new Map(((data || []) as EmailRow[]).map((row) => [row.id, row]));
}

async function countShadowRuns(templateId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from('template_shadow_runs')
    .select('id', { count: 'exact', head: true })
    .eq('candidate_template_id', templateId);

  if (error) {
    throw new Error(`Failed to count shadow runs: ${error.message}`);
  }

  return count || 0;
}

async function persistScores(templateId: string, precisionScore: number, recallScore: number, sampleSize: number): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('vendor_templates')
    .update({
      precision_score: precisionScore,
      recall_score: recallScore,
      eval_sample_size: sampleSize,
    })
    .eq('id', templateId);

  if (error) {
    throw new Error(`Failed to persist scores for ${templateId}: ${error.message}`);
  }
}
