import type { FieldConfidence, NormalizedEmail, ParsedBillFields, TemplateExecutionResult, VendorTemplate } from '@/types/parser';
import { applyPostProcessing } from './postprocess';
import { evaluateTemplateMatchers } from './runMatchers';
import { runExtractorChain } from './runExtractors';
import { clamp } from './utils';

export function executeTemplate(email: NormalizedEmail, template: VendorTemplate): TemplateExecutionResult {
  const matcher = evaluateTemplateMatchers(template.matcher_config, email);
  if (!matcher.matched) {
    return {
      matched: false,
      templateId: template.id,
      templateKey: template.template_key,
      templateVersion: template.version,
      vendorId: template.vendor_id,
      emailType: template.email_type,
      matcher,
      fields: {},
      fieldConfidence: {},
      evidence: matcher.signals,
      overallConfidence: 0,
    };
  }

  const fields: ParsedBillFields = {};
  const fieldConfidence: FieldConfidence = {};
  const evidence = [...matcher.signals];
  const keys: Array<keyof ParsedBillFields> = ['name', 'amount', 'due_date', 'category', 'is_recurring', 'recurrence_interval', 'account_last4'];

  for (const key of keys) {
    const result = runExtractorChain(key, template.extractor_config, email);
    if (!result.matched) continue;
    fields[key] = result.value as never;
    fieldConfidence[key] = result.confidence;
    if (result.evidence) evidence.push(result.evidence);
  }

  const postprocessed = applyPostProcessing(fields, template.postprocess_config, evidence);
  const confidenceValues = Object.values(fieldConfidence);
  const averageFieldConfidence = confidenceValues.length > 0
    ? confidenceValues.reduce((sum, value) => sum + (value || 0), 0) / confidenceValues.length
    : 0;

  return {
    matched: true,
    templateId: template.id,
    templateKey: template.template_key,
    templateVersion: template.version,
    vendorId: template.vendor_id,
    emailType: template.email_type,
    matcher,
    fields: postprocessed.fields,
    fieldConfidence,
    evidence: postprocessed.evidence,
    overallConfidence: clamp((matcher.normalizedScore * 0.45) + (averageFieldConfidence * 0.55) - (postprocessed.rejectedReasons.length ? 0.2 : 0)),
  };
}
