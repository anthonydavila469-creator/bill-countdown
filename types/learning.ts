import type { EmailType, ParsedBillFields, VendorTemplate } from '@/types/parser';

export type LearningEventType = 'correction' | 'confirmation' | 'rejection';
export type LearningScope = 'local' | 'global_opt_in';
export type DriftSeverity = 'low' | 'medium' | 'high';

export interface LearningFieldDelta {
  from: string | number | boolean | null;
  to: string | number | boolean | null;
}

export type LearningFieldDeltas = Partial<Record<keyof ParsedBillFields, LearningFieldDelta>>;

export interface LearningEventFeatures {
  anchor_windows: Partial<Record<keyof ParsedBillFields | string, string[]>>;
  label_positions: Record<string, number[]>;
  dom_fingerprint: string | null;
  subject_shape: string;
  sender_domain: string | null;
}

export interface LearningEvent {
  id: string;
  user_id: string;
  vendor_id: string;
  template_id: string | null;
  email_parse_run_id: string;
  event_type: LearningEventType;
  scope: LearningScope;
  original_fields: Record<string, unknown>;
  corrected_fields: Record<string, unknown>;
  field_deltas: LearningFieldDeltas;
  anchor_windows: LearningEventFeatures['anchor_windows'];
  label_positions: LearningEventFeatures['label_positions'];
  dom_fingerprint: string | null;
  subject_shape: string;
  sender_domain: string | null;
  created_at: string;
}

export interface CandidateTemplate extends VendorTemplate {
  training_example_count?: number;
  cluster_key?: string;
}

export interface DriftMetrics {
  id: string;
  template_id: string;
  period_start: string;
  period_end: string;
  total_runs: number;
  null_rate: number;
  correction_rate: number;
  ai_fallback_rate: number;
  avg_confidence: number;
  created_at: string;
}

export interface ShadowRunResult {
  id?: string;
  template_id: string | null;
  email_parse_run_id: string;
  candidate_template_id: string;
  shadow_result: Record<string, unknown>;
  production_result: Record<string, unknown>;
  agreement_score: number;
  created_at?: string;
}

export interface PromotionResult {
  templateId: string;
  promoted: boolean;
  promotedScope: 'local' | 'global' | null;
  precisionScore: number;
  recallScore: number;
  exampleCount: number;
  uniqueUsers: number;
  shadowRunCount: number;
  reason: string;
}

export interface DriftDetectionResult {
  templateId: string;
  severity: DriftSeverity;
  metrics: Omit<DriftMetrics, 'id' | 'created_at'>;
  previousMetrics: Omit<DriftMetrics, 'id' | 'created_at'> | null;
  action: 'none' | 'raise_verify_threshold' | 'disabled';
}

export interface LearningPassSummary {
  generatedCandidates: number;
  generatedTemplateIds: string[];
  promotions: PromotionResult[];
  vendorsProcessed: number;
}

export interface StoreLearningEventInput {
  userId: string;
  vendorId: string;
  emailParseRunId: string;
  templateId?: string | null;
  scope?: LearningScope;
  eventType?: LearningEventType;
  emailType?: EmailType;
  originalFields: ParsedBillFields;
  correction?: Partial<ParsedBillFields>;
  normalizedEmail: {
    subject: string;
    bodyText: string;
    bodyHtml?: string | null;
    senderDomain?: string | null;
  };
  evidence?: Array<{
    field?: keyof ParsedBillFields | string;
    snippet?: string;
    value?: string | number | boolean | null;
  }>;
}
