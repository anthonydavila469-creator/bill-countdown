export type FieldDecision =
  | 'accepted_claude'
  | 'overridden_by_ranker'
  | 'needs_review';

export type LocationHint =
  | 'upper_left'
  | 'upper_right'
  | 'middle'
  | 'lower_left'
  | 'lower_right'
  | 'unknown';

export interface AmountCandidate {
  value: string;
  normalizedValue: number | null;
  label?: string | null;
  sourceText: string;
  locationHint?: LocationHint;
  score?: number;
  reasons?: string[];
}

export interface DueDateCandidate {
  value: string;
  normalizedValue: string | null;
  label?: string | null;
  sourceText: string;
  locationHint?: LocationHint;
  score?: number;
  reasons?: string[];
}

export interface FieldResolution {
  originalValue: string | null;
  finalValue: string | null;
  decision: FieldDecision;
  reason: string;
  topScore: number | null;
  secondScore: number | null;
  candidateCount: number;
}

export interface ClaudeScanResult {
  vendor_name: string | null;
  amount_due: string | null;
  due_date: string | null;
  confidence?: {
    vendor_name?: number;
    amount_due?: number;
    due_date?: number;
    [key: string]: number | undefined;
  };
  evidence?: {
    vendor_text?: string;
    amount_text?: string;
    due_date_text?: string;
    raw_text?: string;
    [key: string]: string | undefined;
  };
  warnings?: string[];
  is_bill: boolean;
  document_type?: string | null;
  candidates?: {
    amounts?: AmountCandidate[];
    due_dates?: DueDateCandidate[];
  };
}

export interface RankedScanResult {
  name: string | null;
  amount: number | null;
  due_date: string | null;
  scan_session_id: string;
  confidence: {
    vendor_name: number | null;
    amount_due: number | null;
    due_date: number | null;
    overall: number | null;
  };
  is_bill: boolean;
  warnings: string[];
  review: {
    needs_review: boolean;
    amount_due: {
      decision: FieldDecision;
      highlighted: boolean;
    };
    due_date: {
      decision: FieldDecision;
      highlighted: boolean;
    };
  };
  ranking: {
    version: 'ranker-v1';
    candidates: {
      amounts: AmountCandidate[];
      due_dates: DueDateCandidate[];
    };
    resolution: {
      amount_due: FieldResolution;
      due_date: FieldResolution;
    };
  };
}

function normalizeText(input?: string | null): string {
  return (input ?? '').trim().toLowerCase();
}

function normalizeLabel(input?: string | null): string {
  return normalizeText(input);
}

function parseAmount(input?: string | number | null): number | null {
  if (input == null) return null;
  const cleaned = String(input).replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function toAmountString(n: number | null): string | null {
  return n == null ? null : n.toFixed(2);
}

function toIsoDate(input?: string | null, now = new Date()): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const explicitYearMatch = trimmed.match(/\b(20\d{2}|19\d{2})\b/);
  if (explicitYearMatch) {
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const monthDayMatch = trimmed.match(/\b([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (monthDayMatch) {
    const monthToken = monthDayMatch[1];
    const dayToken = monthDayMatch[2];
    const currentYear = now.getFullYear();
    const candidates = [currentYear, currentYear + 1]
      .map((year) => new Date(`${monthToken} ${dayToken}, ${year}`))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    const futureCandidate = candidates.find((date) => daysFromToday(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`, now)! >= 0);
    const chosen = futureCandidate ?? candidates[0];
    if (!chosen) return null;
    const y = chosen.getFullYear();
    const m = String(chosen.getMonth() + 1).padStart(2, '0');
    const day = String(chosen.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysFromToday(isoDate: string, now = new Date()): number | null {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - base.getTime()) / 86400000);
}

function hasExplicitYear(input?: string | null): boolean {
  if (!input) return false;
  return /\b(19\d{2}|20\d{2})\b/.test(input);
}

function normalizeDueDateCandidateValue(
  value?: string | null,
  normalizedValue?: string | null,
  sourceText?: string | null,
  now = new Date(),
): string | null {
  const valueHasYear = hasExplicitYear(value);
  const sourceHasYear = hasExplicitYear(sourceText);

  if (!valueHasYear && !sourceHasYear && value) {
    const monthDayMatch = value.trim().match(/\b([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
    if (monthDayMatch) {
      const monthToken = monthDayMatch[1];
      const dayToken = monthDayMatch[2];
      const currentYear = now.getFullYear();
      const currentYearDate = new Date(`${monthToken} ${dayToken}, ${currentYear}`);
      if (!Number.isNaN(currentYearDate.getTime())) {
        const currentIso = `${currentYearDate.getFullYear()}-${String(currentYearDate.getMonth() + 1).padStart(2, '0')}-${String(currentYearDate.getDate()).padStart(2, '0')}`;
        const delta = daysFromToday(currentIso, now);
        if (delta != null && delta >= -45) {
          return currentIso;
        }
      }
    }
    return toIsoDate(value, now);
  }

  if (normalizedValue) {
    return toIsoDate(normalizedValue, now);
  }

  if (value) {
    return toIsoDate(value, now);
  }

  return null;
}

function uniqueBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function isStrongAmountLabel(label: string): boolean {
  return [
    'total due',
    'amount due',
    'payment due',
    'balance due',
    'new balance',
  ].some((x) => label.includes(x));
}

function isNegativeAmountLabel(label: string): boolean {
  return [
    'minimum payment',
    'minimum due',
    'service fee',
    'late fee',
    'tax',
    'usage',
    'subtotal',
    'previous balance',
    'credit',
    'adjustment',
    'autopay',
    'fee',
  ].some((x) => label.includes(x));
}

function isStrongDueDateLabel(label: string): boolean {
  return [
    'due date',
    'payment due date',
    'pay by',
    'due by',
    'due on',
    'amount due by',
  ].some((x) => label.includes(x));
}

function isNegativeDueDateLabel(label: string): boolean {
  return [
    'statement date',
    'billing date',
    'service period',
    'period ending',
    'issue date',
    'autopay date',
    'bill date',
  ].some((x) => label.includes(x));
}

export function buildAmountCandidates(result: ClaudeScanResult): AmountCandidate[] {
  const rawText = [result.evidence?.amount_text, result.evidence?.raw_text]
    .filter(Boolean)
    .join('\n');

  const fromClaude = (result.candidates?.amounts ?? []).map((c) => ({
    value: c.value,
    normalizedValue: c.normalizedValue ?? parseAmount(c.value),
    label: c.label ?? null,
    sourceText: c.sourceText ?? '',
    locationHint: c.locationHint ?? 'unknown',
  }));

  const regexCandidates: AmountCandidate[] = [];
  const lines = rawText.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const strongAmountRegex =
    /(total due|amount due|payment due|balance due|new balance)[^\d$-]{0,20}\$?\s?(\d[\d,]*\.?\d{0,2})/gi;

  for (const line of lines) {
    let match: RegExpExecArray | null;
    while ((match = strongAmountRegex.exec(line)) !== null) {
      regexCandidates.push({
        value: match[2],
        normalizedValue: parseAmount(match[2]),
        label: match[1],
        sourceText: line,
        locationHint: 'unknown',
      });
    }
  }

  if (!fromClaude.length && result.amount_due) {
    fromClaude.push({
      value: result.amount_due,
      normalizedValue: parseAmount(result.amount_due),
      label: 'claude_amount_due',
      sourceText: result.evidence?.amount_text ?? '',
      locationHint: 'unknown',
    });
  }

  return uniqueBy(
    [...fromClaude, ...regexCandidates].filter((c) => c.normalizedValue != null),
    (c) => `${c.normalizedValue}|${normalizeLabel(c.label)}|${normalizeText(c.sourceText)}`,
  ).slice(0, 8);
}

export function buildDueDateCandidates(result: ClaudeScanResult): DueDateCandidate[] {
  const rawText = [result.evidence?.due_date_text, result.evidence?.raw_text]
    .filter(Boolean)
    .join('\n');

  const fromClaude = (result.candidates?.due_dates ?? []).map((c) => ({
    value: c.value,
    normalizedValue: normalizeDueDateCandidateValue(c.value, c.normalizedValue, c.sourceText, new Date()),
    label: c.label ?? null,
    sourceText: c.sourceText ?? '',
    locationHint: c.locationHint ?? 'unknown',
  }));

  const regexCandidates: DueDateCandidate[] = [];
  const lines = rawText.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const strongDateRegex =
    /(due date|payment due date|pay by|due by|due on|amount due by)[^A-Za-z0-9]{0,10}([A-Za-z]{3,9}\s+\d{1,2}(?:,\s+\d{4})?|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/gi;

  for (const line of lines) {
    let match: RegExpExecArray | null;
    while ((match = strongDateRegex.exec(line)) !== null) {
      regexCandidates.push({
        value: match[2],
        normalizedValue: toIsoDate(match[2], new Date()),
        label: match[1],
        sourceText: line,
        locationHint: 'unknown',
      });
    }
  }

  if (!fromClaude.length && result.due_date) {
    fromClaude.push({
      value: result.due_date,
      normalizedValue: normalizeDueDateCandidateValue(result.due_date, result.due_date, result.evidence?.due_date_text ?? '', new Date()),
      label: 'claude_due_date',
      sourceText: result.evidence?.due_date_text ?? '',
      locationHint: 'unknown',
    });
  }

  return uniqueBy(
    [...fromClaude, ...regexCandidates].filter((c) => c.normalizedValue != null),
    (c) => `${c.normalizedValue}|${normalizeLabel(c.label)}|${normalizeText(c.sourceText)}`,
  ).slice(0, 8);
}

export function scoreAmountCandidate(
  candidate: AmountCandidate,
  allCandidates: AmountCandidate[],
  claudeAmount: string | null,
): AmountCandidate {
  let score = 0;
  const reasons: string[] = [];

  const label = normalizeLabel(candidate.label);
  const text = normalizeText(candidate.sourceText);
  const value = candidate.normalizedValue;
  const claudeValue = parseAmount(claudeAmount);

  const values = allCandidates
    .map((c) => c.normalizedValue)
    .filter((n): n is number => n != null && n > 0);

  const maxValue = values.length ? Math.max(...values) : null;

  if (isStrongAmountLabel(label)) {
    score += 10;
    reasons.push('strong_label');
  }

  if (['total due', 'amount due', 'payment due', 'due by'].some((x) => text.includes(x))) {
    score += 6;
    reasons.push('due_phrase');
  }

  if (value != null && maxValue != null && value === maxValue) {
    score += 4;
    reasons.push('largest_amount');
  }

  if (candidate.locationHint === 'upper_right' || candidate.locationHint === 'lower_right') {
    score += 2;
    reasons.push('right_side_bias');
  }

  if (value != null && claudeValue != null && value === claudeValue) {
    score += 2;
    reasons.push('matches_claude');
  }

  if (isNegativeAmountLabel(label)) {
    score -= 10;
    reasons.push('negative_label');
  }

  if (['service fee', 'tax', 'usage', 'charge', 'subtotal', 'credit', 'adjustment'].some((x) => text.includes(x))) {
    score -= 5;
    reasons.push('line_item_like');
  }

  if (value != null && maxValue != null && value < maxValue * 0.5 && !isStrongAmountLabel(label)) {
    score -= 4;
    reasons.push('small_relative_to_max');
  }

  if (value == null) {
    score -= 3;
    reasons.push('invalid_amount');
  }

  return { ...candidate, score, reasons };
}

export function scoreDueDateCandidate(
  candidate: DueDateCandidate,
  claudeDueDate: string | null,
  now = new Date(),
): DueDateCandidate {
  let score = 0;
  const reasons: string[] = [];

  const label = normalizeLabel(candidate.label);
  const text = normalizeText(candidate.sourceText);
  const iso = normalizeDueDateCandidateValue(candidate.value, candidate.normalizedValue, candidate.sourceText, now);
  const claudeIso = toIsoDate(claudeDueDate, now);
  const delta = iso ? daysFromToday(iso, now) : null;

  if (isStrongDueDateLabel(label)) {
    score += 12;
    reasons.push('strong_label');
  }

  if (delta != null && delta >= 0) {
    score += 6;
    reasons.push('future_date');
  }

  if (delta != null && delta >= 3 && delta <= 45) {
    score += 4;
    reasons.push('typical_due_window');
  }

  if (iso && claudeIso && iso === claudeIso) {
    score += 2;
    reasons.push('matches_claude');
  }

  if (candidate.locationHint === 'upper_right') {
    score += 2;
    reasons.push('upper_right_bias');
  }

  if (text.includes('due') || text.includes('pay by') || text.includes('due on')) {
    score += 2;
    reasons.push('explicit_due_text');
  }

  if (isNegativeDueDateLabel(label)) {
    score -= 12;
    reasons.push('negative_label');
  }

  if (delta != null && delta < 0) {
    score -= 8;
    reasons.push('past_date');
  }

  if (delta != null && delta > 90) {
    score -= 5;
    reasons.push('too_far_out');
  }

  if (!iso) {
    score -= 4;
    reasons.push('invalid_date');
  }

  return { ...candidate, normalizedValue: iso, score, reasons };
}

export function resolveAmount(params: {
  claudeAmount: string | null;
  claudeConfidence?: number;
  candidates: AmountCandidate[];
}): {
  finalValue: string | null;
  candidates: AmountCandidate[];
  resolution: FieldResolution;
} {
  const { claudeAmount, claudeConfidence = 0, candidates } = params;

  const ranked = candidates
    .map((c) => scoreAmountCandidate(c, candidates, claudeAmount))
    .sort((a, b) => (b.score ?? -999) - (a.score ?? -999));

  const top = ranked[0];
  const second = ranked[1];
  const topScore = top?.score ?? null;
  const secondScore = second?.score ?? null;
  const scoreGap = topScore != null ? topScore - (secondScore ?? 0) : null;

  const claudeValue = parseAmount(claudeAmount);
  const topValue = top?.normalizedValue ?? null;
  const sameAsClaude = claudeValue != null && topValue != null && claudeValue === topValue;

  if (!top || topValue == null) {
    return {
      finalValue: claudeAmount,
      candidates: ranked,
      resolution: {
        originalValue: claudeAmount,
        finalValue: claudeAmount,
        decision: 'needs_review',
        reason: 'no_valid_amount_candidate',
        topScore,
        secondScore,
        candidateCount: ranked.length,
      },
    };
  }

  const strongTop = topScore != null && topScore >= 10;
  const clearGap = scoreGap != null && scoreGap >= 4;
  const strongLabel = isStrongAmountLabel(normalizeLabel(top.label));

  if (!sameAsClaude && strongTop && clearGap && (claudeConfidence < 0.9 || strongLabel)) {
    return {
      finalValue: toAmountString(topValue),
      candidates: ranked,
      resolution: {
        originalValue: claudeAmount,
        finalValue: toAmountString(topValue),
        decision: 'overridden_by_ranker',
        reason: 'strong_amount_candidate_override',
        topScore,
        secondScore,
        candidateCount: ranked.length,
      },
    };
  }

  if (sameAsClaude) {
    return {
      finalValue: claudeAmount ? toAmountString(parseAmount(claudeAmount)) ?? claudeAmount : null,
      candidates: ranked,
      resolution: {
        originalValue: claudeAmount,
        finalValue: claudeAmount ? toAmountString(parseAmount(claudeAmount)) ?? claudeAmount : null,
        decision: 'accepted_claude',
        reason: 'top_candidate_matches_claude',
        topScore,
        secondScore,
        candidateCount: ranked.length,
      },
    };
  }

  return {
    finalValue: claudeAmount ? toAmountString(parseAmount(claudeAmount)) ?? claudeAmount : claudeAmount,
    candidates: ranked,
    resolution: {
      originalValue: claudeAmount,
      finalValue: claudeAmount ? toAmountString(parseAmount(claudeAmount)) ?? claudeAmount : claudeAmount,
      decision: 'needs_review',
      reason: 'amount_candidates_not_strong_enough',
      topScore,
      secondScore,
      candidateCount: ranked.length,
    },
  };
}

export function resolveDueDate(params: {
  claudeDueDate: string | null;
  claudeConfidence?: number;
  candidates: DueDateCandidate[];
  now?: Date;
}): {
  finalValue: string | null;
  candidates: DueDateCandidate[];
  resolution: FieldResolution;
} {
  const { claudeDueDate, claudeConfidence = 0, candidates, now = new Date() } = params;

  const ranked = candidates
    .map((c) => scoreDueDateCandidate(c, claudeDueDate, now))
    .sort((a, b) => (b.score ?? -999) - (a.score ?? -999));

  const top = ranked[0];
  const second = ranked[1];
  const topScore = top?.score ?? null;
  const secondScore = second?.score ?? null;
  const scoreGap = topScore != null ? topScore - (secondScore ?? 0) : null;

  const claudeIso = toIsoDate(claudeDueDate);
  const topIso = top?.normalizedValue ?? null;
  const sameAsClaude = !!claudeIso && !!topIso && claudeIso === topIso;
  const claudePast = !!claudeIso && (daysFromToday(claudeIso, now) ?? 0) < 0;

  if (!top || !topIso) {
    return {
      finalValue: claudeIso,
      candidates: ranked,
      resolution: {
        originalValue: claudeIso,
        finalValue: claudeIso,
        decision: 'needs_review',
        reason: 'no_valid_due_date_candidate',
        topScore,
        secondScore,
        candidateCount: ranked.length,
      },
    };
  }

  const strongTop = topScore != null && topScore >= 12;
  const clearGap = scoreGap != null && scoreGap >= 4;
  const strongLabel = isStrongDueDateLabel(normalizeLabel(top.label));

  if (!sameAsClaude && strongTop && clearGap && (claudeConfidence < 0.9 || strongLabel || claudePast)) {
    return {
      finalValue: topIso,
      candidates: ranked,
      resolution: {
        originalValue: claudeIso,
        finalValue: topIso,
        decision: 'overridden_by_ranker',
        reason: 'strong_due_date_candidate_override',
        topScore,
        secondScore,
        candidateCount: ranked.length,
      },
    };
  }

  if (sameAsClaude) {
    return {
      finalValue: claudeIso,
      candidates: ranked,
      resolution: {
        originalValue: claudeIso,
        finalValue: claudeIso,
        decision: 'accepted_claude',
        reason: 'top_candidate_matches_claude',
        topScore,
        secondScore,
        candidateCount: ranked.length,
      },
    };
  }

  return {
    finalValue: claudeIso,
    candidates: ranked,
    resolution: {
      originalValue: claudeIso,
      finalValue: claudeIso,
      decision: 'needs_review',
      reason: 'due_date_candidates_not_strong_enough',
      topScore,
      secondScore,
      candidateCount: ranked.length,
    },
  };
}
