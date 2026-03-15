import { createAdminClient } from '@/lib/supabase/admin';
import type { CandidateTemplate } from '@/types/learning';
import type { BaseExtractor, BaseMatcher, ConfidenceConfig, DriftConfig, MatcherConfig, VendorTemplate } from '@/types/parser';
import {
  AMOUNT_LABELS,
  DATE_LABELS,
  buildTemplateKey,
  getLearningTargetFields,
  getStableSubjectTokens,
  groupLearningClusters,
  pickStableLabel,
  type LearningEventRow,
  type ParseRunRow,
} from './utils';

export async function generateCandidateTemplates(vendorId: string, userId: string): Promise<CandidateTemplate[]> {
  const events = await loadLearningEvents(vendorId, userId);
  if (events.length < 5) return [];

  const parseRuns = await loadParseRuns(events.map((event) => event.email_parse_run_id));
  const templates = await loadTemplates([
    ...events.map((event) => event.template_id).filter((value): value is string => Boolean(value)),
  ]);
  const existingTemplates = await loadExistingTemplates(vendorId, userId);
  const clusters = groupLearningClusters(events, parseRuns, templates).filter((cluster) => cluster.events.length >= 5);
  const createdOrUpdated: CandidateTemplate[] = [];
  const admin = createAdminClient();

  for (const cluster of clusters) {
    const templateKey = buildTemplateKey(cluster.key);
    const relatedTemplates = existingTemplates.filter((template) => template.template_key === templateKey);
    const existing = relatedTemplates.find((candidate) => {
      const learning = ((candidate.drift_config || {}) as Record<string, unknown>).learning as Record<string, unknown> | undefined;
      return candidate.status === 'candidate' && learning?.cluster_key === cluster.key;
    });
    const nextVersion = existing ? existing.version : (relatedTemplates.length > 0 ? Math.max(...relatedTemplates.map((template) => template.version)) + 1 : 1);
    const nextTemplate = await buildCandidateTemplate(vendorId, userId, cluster.events, cluster.key, cluster.emailType, cluster.subjectShape, cluster.senderDomain, nextVersion);

    if (existing) {
      const { data, error } = await admin
        .from('vendor_templates')
        .update(nextTemplate)
        .eq('id', existing.id)
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(`Failed to update candidate template ${existing.id}: ${error?.message || 'Unknown error'}`);
      }

      createdOrUpdated.push(data as CandidateTemplate);
      continue;
    }

    const { data, error } = await admin
      .from('vendor_templates')
      .insert(nextTemplate)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to insert candidate template: ${error?.message || 'Unknown error'}`);
    }

    createdOrUpdated.push(data as CandidateTemplate);
  }

  return createdOrUpdated;
}

async function buildCandidateTemplate(
  vendorId: string,
  userId: string,
  events: LearningEventRow[],
  clusterKey: string,
  emailType: VendorTemplate['email_type'],
  subjectShape: string,
  senderDomain: string,
  version: number
): Promise<Omit<VendorTemplate, 'id' | 'created_at' | 'updated_at'>> {
  const admin = createAdminClient();
  const { data: vendor, error: vendorError } = await admin
    .from('vendors')
    .select('display_name, category_default, recurrence_default')
    .eq('id', vendorId)
    .single();

  if (vendorError || !vendor) {
    throw new Error(`Failed to load vendor ${vendorId}: ${vendorError?.message || 'Unknown error'}`);
  }

  const matcherConfig = buildMatcherConfig(subjectShape, senderDomain);
  const extractorConfig = buildExtractorConfig(events, vendor.display_name, vendor.category_default, vendor.recurrence_default);
  const confidenceConfig: ConfidenceConfig = {
    acceptThreshold: 0.96,
    aiVerifyThreshold: 0.8,
    baseScore: 0.45,
  };
  const driftConfig: DriftConfig & Record<string, unknown> = {
    maxNullRate: 0.2,
    maxCorrectionRate: 0.12,
    maxAiFallbackRate: 0.5,
    learning: {
      cluster_key: clusterKey,
      subject_shape: subjectShape,
      sender_domain: senderDomain,
      email_type: emailType,
      training_event_count: events.length,
      example_user_count: [...new Set(events.map((event) => event.user_id))].length,
      source_event_ids: events.map((event) => event.id),
    },
  };

  return {
    vendor_id: vendorId,
    template_key: buildTemplateKey(clusterKey),
    version,
    status: 'candidate',
    scope: 'local',
    owner_user_id: userId,
    email_type: emailType,
    source: 'learned',
    matcher_config: matcherConfig,
    extractor_config: extractorConfig,
    postprocess_config: {
      reject_due_date_older_than_days: 45,
    },
    confidence_config: confidenceConfig,
    drift_config: driftConfig,
    precision_score: null,
    recall_score: null,
    eval_sample_size: 0,
  };
}

function buildMatcherConfig(subjectShape: string, senderDomain: string): MatcherConfig {
  const fromMatchers: BaseMatcher[] = [
    {
      type: 'domain_regex',
      pattern: `^${escapeForRegex(senderDomain)}$`,
      weight: 2.5,
      required: true,
    },
  ];

  const subjectMatchers: BaseMatcher[] = getStableSubjectTokens(subjectShape).map((token, index) => ({
    type: 'contains',
    value: token,
    weight: index === 0 ? 1.6 : 1.2,
  }));

  return {
    from: fromMatchers,
    subject: subjectMatchers,
    body: [],
    headers: [],
  };
}

function buildExtractorConfig(
  events: LearningEventRow[],
  displayName: string,
  categoryDefault: string | null,
  recurrenceDefault: string | null
): VendorTemplate['extractor_config'] {
  const amountLabel = pickStableLabel(events, AMOUNT_LABELS);
  const dueDateLabel = pickStableLabel(events, DATE_LABELS);
  const fields = events.map((event) => getLearningTargetFields(event));
  const recurringVotes = fields.map((field) => field.is_recurring).filter((value): value is boolean => typeof value === 'boolean');
  const recurrenceVotes = fields.map((field) => field.recurrence_interval).filter((value): value is NonNullable<typeof value> => typeof value === 'string');

  const amountExtractors: BaseExtractor[] = amountLabel ? [{
    type: 'label_proximity',
    label: amountLabel,
    window: 80,
    pattern: '(\\$?\\s?\\d[\\d,]*(?:\\.\\d{2})?)',
    priority: 1,
    transforms: ['parse_currency'],
    confidence: 0.92,
  }] : [];

  const dueDateExtractors: BaseExtractor[] = dueDateLabel ? [{
    type: 'label_proximity',
    label: dueDateLabel,
    window: 80,
    pattern: '([A-Za-z]{3,9}\\s+\\d{1,2}(?:,\\s*\\d{4})?|\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?)',
    priority: 1,
    transforms: ['parse_us_date'],
    confidence: 0.91,
  }] : [];

  const extractorConfig: VendorTemplate['extractor_config'] = {
    name: [{
      type: 'constant',
      value: displayName,
      priority: 1,
      transforms: ['normalize_vendor_name'],
      confidence: 0.98,
    }],
    amount: amountExtractors,
    due_date: dueDateExtractors,
  };

  if (categoryDefault) {
    extractorConfig.category = [{
      type: 'constant',
      value: categoryDefault,
      priority: 1,
      confidence: 0.95,
    }];
  }

  if (recurringVotes.length > 0 && recurringVotes.filter(Boolean).length >= Math.ceil(recurringVotes.length * 0.8)) {
    extractorConfig.is_recurring = [{
      type: 'constant',
      value: true,
      priority: 1,
      confidence: 0.92,
    }];
  }

  const stableRecurrence = findStableString(recurrenceVotes) || recurrenceDefault;
  if (stableRecurrence) {
    extractorConfig.recurrence_interval = [{
      type: 'constant',
      value: stableRecurrence,
      priority: 1,
      confidence: 0.92,
    }];
  }

  return extractorConfig;
}

async function loadLearningEvents(vendorId: string, userId: string): Promise<LearningEventRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('learning_events')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('user_id', userId)
    .in('event_type', ['correction', 'confirmation'])
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load learning events: ${error.message}`);
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

async function loadTemplates(ids: string[]): Promise<Map<string, VendorTemplate>> {
  const admin = createAdminClient();
  if (ids.length === 0) return new Map();

  const { data, error } = await admin
    .from('vendor_templates')
    .select('*')
    .in('id', ids);

  if (error) {
    throw new Error(`Failed to load templates: ${error.message}`);
  }

  return new Map(((data || []) as VendorTemplate[]).map((template) => [template.id, template]));
}

async function loadExistingTemplates(vendorId: string, userId: string): Promise<CandidateTemplate[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('vendor_templates')
    .select('*')
    .eq('vendor_id', vendorId)
    .eq('owner_user_id', userId)
    .eq('scope', 'local')
    .eq('status', 'candidate')
    .eq('source', 'learned');

  if (error) {
    throw new Error(`Failed to load existing learned templates: ${error.message}`);
  }

  return (data || []) as CandidateTemplate[];
}

function findStableString(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  let winner: string | null = null;
  let winnerCount = 0;
  for (const [value, count] of counts.entries()) {
    if (count > winnerCount) {
      winner = value;
      winnerCount = count;
    }
  }

  return winnerCount >= Math.ceil(values.length * 0.8) ? winner : null;
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
