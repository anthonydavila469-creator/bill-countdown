import type { BaseMatcher, FieldEvidence, MatchEvaluationResult, MatcherConfig } from '@/types/parser';
import type { NormalizedEmail } from '@/types/parser';
import { clamp, getHeaderValue, safeLower, wordWindowAround } from './utils';

function evaluateSingleMatcher(group: keyof MatcherConfig, matcher: BaseMatcher, email: NormalizedEmail): { matched: boolean; evidence?: FieldEvidence } {
  const subject = email.subject || '';
  const body = email.bodyText || '';
  const fromName = email.fromName || '';
  const fromEmail = email.fromEmail || '';
  const senderDomain = email.senderDomain || '';

  switch (matcher.type) {
    case 'domain_regex': {
      const regex = new RegExp(matcher.pattern || '', matcher.flags || 'i');
      const matched = regex.test(senderDomain);
      return matched ? { matched, evidence: { field: 'vendor', source: 'from', matcherType: matcher.type, snippet: senderDomain } } : { matched };
    }
    case 'email_regex': {
      const regex = new RegExp(matcher.pattern || '', matcher.flags || 'i');
      const matched = regex.test(fromEmail);
      return matched ? { matched, evidence: { field: 'vendor', source: 'from', matcherType: matcher.type, snippet: fromEmail } } : { matched };
    }
    case 'display_name_regex': {
      const regex = new RegExp(matcher.pattern || '', matcher.flags || 'i');
      const matched = regex.test(fromName);
      return matched ? { matched, evidence: { field: 'vendor', source: 'from', matcherType: matcher.type, snippet: fromName } } : { matched };
    }
    case 'contains': {
      const target = matcher.value || matcher.pattern || '';
      const source = group === 'subject' ? subject : group === 'body' ? body : group === 'from' ? `${fromName} ${fromEmail}` : '';
      const matched = safeLower(source).includes(safeLower(target));
      return matched ? { matched, evidence: { field: 'vendor', source: group === 'body' ? 'body' : 'subject', matcherType: matcher.type, snippet: wordWindowAround(source, target) } } : { matched };
    }
    case 'regex': {
      const source = group === 'subject' ? subject : body;
      const regex = new RegExp(matcher.pattern || '', matcher.flags || 'i');
      const matched = regex.test(source);
      return matched ? { matched, evidence: { field: 'vendor', source: group === 'subject' ? 'subject' : 'body', matcherType: matcher.type, snippet: wordWindowAround(source, regex) } } : { matched };
    }
    case 'header_equals': {
      const headerValue = getHeaderValue(email.headers, matcher.header || '');
      const matched = safeLower(headerValue) === safeLower(matcher.value || matcher.pattern || '');
      return matched ? { matched, evidence: { field: 'vendor', source: 'header', matcherType: matcher.type, snippet: `${matcher.header}: ${headerValue}` } } : { matched };
    }
    case 'header_regex': {
      const headerValue = getHeaderValue(email.headers, matcher.header || '') || '';
      const regex = new RegExp(matcher.pattern || '', matcher.flags || 'i');
      const matched = regex.test(headerValue);
      return matched ? { matched, evidence: { field: 'vendor', source: 'header', matcherType: matcher.type, snippet: `${matcher.header}: ${headerValue}` } } : { matched };
    }
    case 'dom_fingerprint_prefix':
      return { matched: false };
    default:
      return { matched: false };
  }
}

export function evaluateTemplateMatchers(matcherConfig: MatcherConfig, email: NormalizedEmail): MatchEvaluationResult {
  const groups: Array<keyof MatcherConfig> = ['from', 'subject', 'body', 'headers'];
  let score = 0;
  let maxScore = 0;
  let negativeMatched = false;
  const signals: FieldEvidence[] = [];

  for (const group of groups) {
    for (const matcher of matcherConfig[group] || []) {
      const weight = matcher.weight ?? 1;
      maxScore += weight;

      const result = evaluateSingleMatcher(group, matcher, email);
      if (matcher.required && !result.matched) {
        return { matched: false, score: 0, maxScore, normalizedScore: 0, negativeMatched, signals };
      }

      if (result.matched) {
        score += weight;
        if (matcher.negative) {
          negativeMatched = true;
        }
        if (result.evidence) {
          signals.push(result.evidence);
        }
      }
    }
  }

  if (negativeMatched) {
    score *= 0.35;
  }

  const normalizedScore = maxScore > 0 ? clamp(score / maxScore) : 0;
  return {
    matched: normalizedScore > 0,
    score,
    maxScore,
    normalizedScore,
    negativeMatched,
    signals,
  };
}
