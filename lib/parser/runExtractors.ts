import type { BaseExtractor, ExtractorCandidate, ExtractorConfig, ExtractorRunResult, FieldEvidence, NormalizedEmail, ParsedBillFields } from '@/types/parser';
import { applyTransforms } from './transforms';
import { clamp, escapeRegex, normalizeWhitespace, wordWindowAround } from './utils';

function sortExtractors(extractors: BaseExtractor[] = []): BaseExtractor[] {
  return [...extractors].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
}

function toCandidate(extractor: BaseExtractor, rawValue: unknown, source: FieldEvidence['source'], snippet?: string): ExtractorCandidate {
  const value = applyTransforms(rawValue, extractor.transforms);
  return {
    extractorType: extractor.type,
    rawValue: rawValue as string | number | boolean | null,
    value: (value ?? null) as string | number | boolean | null,
    confidence: clamp(extractor.confidence ?? 0.85),
    evidence: {
      field: 'unknown',
      source,
      extractorType: extractor.type,
      snippet,
      value: (value ?? null) as string | number | boolean | null,
    },
  };
}

function runOneExtractor(extractor: BaseExtractor, haystack: string): ExtractorCandidate | null {
  if (extractor.type === 'constant') {
    return toCandidate(extractor, extractor.value ?? null, 'template', String(extractor.value ?? ''));
  }

  if (extractor.type === 'regex') {
    const regex = new RegExp(extractor.pattern || '', extractor.flags || 'i');
    const match = haystack.match(regex);
    if (!match) return null;
    const group = extractor.group ?? 1;
    const rawValue = typeof group === 'number' ? match[group] : match.groups?.[group];
    if (rawValue == null) return null;
    return toCandidate(extractor, rawValue, 'body', wordWindowAround(haystack, regex));
  }

  if (extractor.type === 'label_proximity') {
    const label = extractor.label || extractor.value;
    if (!label) return null;
    const labelRegex = new RegExp(escapeRegex(String(label)), 'i');
    const labelMatch = haystack.match(labelRegex);
    if (!labelMatch || labelMatch.index == null) return null;
    const window = extractor.window ?? 80;
    const start = labelMatch.index;
    const segment = haystack.slice(start, start + window);
    const regex = extractor.pattern
      ? new RegExp(extractor.pattern, extractor.flags || 'i')
      : /(\$?\s?\d[\d,]*(?:\.\d{2})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|[A-Za-z]{3,9}\s+\d{1,2}(?:,\s*\d{4})?)/i;
    const match = segment.match(regex);
    if (!match) return null;
    const rawValue = match[extractor.group as number || 1] || match[0];
    return toCandidate(extractor, normalizeWhitespace(rawValue), 'body', normalizeWhitespace(segment));
  }

  return null;
}

export function runExtractorChain(field: keyof ParsedBillFields, config: ExtractorConfig, email: NormalizedEmail): ExtractorRunResult {
  const candidates: ExtractorCandidate[] = [];
  const extractors = sortExtractors(config[field] || []);
  const haystack = [email.subject, email.bodyText].filter(Boolean).join('\n');

  for (const extractor of extractors) {
    const candidate = runOneExtractor(extractor, haystack);
    if (!candidate || candidate.value == null || candidate.value === '') {
      continue;
    }

    if (candidate.evidence) {
      candidate.evidence.field = field;
    }

    candidates.push(candidate);

    return {
      matched: true,
      value: candidate.value,
      confidence: candidate.confidence,
      evidence: candidate.evidence,
      candidates,
    };
  }

  return {
    matched: false,
    value: null,
    confidence: 0,
    evidence: null,
    candidates,
  };
}
