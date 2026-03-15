import type { ConfidenceConfig, FieldConfidence, ParseDecision, ParsedBillFields } from '@/types/parser';
import type { MatchEvaluationResult } from '@/types/parser';
import { clamp } from './utils';

export function scoreDeterministicResult(options: {
  matchResult: MatchEvaluationResult;
  fields: ParsedBillFields;
  fieldConfidence: FieldConfidence;
  confidenceConfig?: ConfidenceConfig;
  vendorConfidence?: number;
  rejectedReasons?: string[];
}): { overallConfidence: number; actionConfidence: number; decision: ParseDecision } {
  const { matchResult, fields, fieldConfidence, confidenceConfig, vendorConfidence = 0, rejectedReasons = [] } = options;
  const baseScore = confidenceConfig?.baseScore ?? 0.35;
  let overall = baseScore + (matchResult.normalizedScore * 0.35) + (vendorConfidence * 0.1);

  const extractedFields = Object.values(fields).filter((value) => value !== null && value !== undefined && value !== '').length;
  overall += Math.min(0.25, extractedFields * 0.05);

  if (matchResult.negativeMatched) overall -= 0.2;
  if (rejectedReasons.length > 0) overall -= 0.35;

  const fieldValues = Object.values(fieldConfidence);
  const actionConfidence = clamp(fieldValues.length > 0 ? fieldValues.reduce((sum, value) => sum + (value || 0), 0) / fieldValues.length : overall);
  overall = clamp(Math.max(overall, actionConfidence * 0.85));

  const acceptThreshold = confidenceConfig?.acceptThreshold ?? 0.92;
  const aiVerifyThreshold = confidenceConfig?.aiVerifyThreshold ?? 0.7;

  if (rejectedReasons.length > 0) {
    return { overallConfidence: overall, actionConfidence, decision: 'rejected' };
  }

  if (overall >= acceptThreshold && fields.name && fields.due_date) {
    return { overallConfidence: overall, actionConfidence, decision: 'accept' };
  }

  if (overall >= aiVerifyThreshold && fields.name) {
    return { overallConfidence: overall, actionConfidence, decision: 'ai_verify' };
  }

  return { overallConfidence: overall, actionConfidence, decision: 'review' };
}
