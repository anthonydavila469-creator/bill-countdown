import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

type SupportedField = 'name' | 'amount' | 'due_date';

interface BillerProfileRow {
  id: string;
  canonical_name: string;
  known_aliases: string[] | null;
  sample_count: number | null;
  field_accuracy_amount: number | null;
  field_accuracy_due_date: number | null;
}

interface BillCorrectionRow {
  id: string;
  scan_session_id: string;
  field_name: string;
  ai_value: string | null;
  final_value: string | null;
  was_changed: boolean;
  created_at: string;
}

interface ScanSessionRow {
  id: string;
  vendor_guess_normalized: string | null;
}

export interface VendorPromptHint {
  vendor: string;
  aliases: string[];
  hints: string[];
  lastUpdated: string;
}

interface VendorHintSummary {
  vendor: string;
  sampleCount: number;
  amountAccuracy: number | null;
  dueDateAccuracy: number | null;
  correctionCount: number;
  topCorrectedField: SupportedField | null;
  hints: string[];
}

export interface PromptImprovementJobResult {
  exitCode: 0 | 1;
  analyzedVendors: number;
  strugglingVendors: number;
  generatedHints: number;
  vendors: VendorHintSummary[];
  skipped: boolean;
  reason?: string;
  summary: string;
}

const PAGE_SIZE = 1000;

export async function runPromptImprovementJob(): Promise<PromptImprovementJobResult> {
  try {
    const eligibleProfiles = await fetchEligibleProfiles();

    if (eligibleProfiles === null) {
      return {
        exitCode: 0,
        analyzedVendors: 0,
        strugglingVendors: 0,
        generatedHints: 0,
        vendors: [],
        skipped: true,
        reason: 'biller_profiles table missing',
        summary: 'Prompt improvement job skipped: biller_profiles table missing',
      };
    }

    const strugglingProfiles = eligibleProfiles.filter((profile) =>
      (profile.field_accuracy_amount ?? 1) < 0.8 || (profile.field_accuracy_due_date ?? 1) < 0.8
    );

    if (strugglingProfiles.length === 0) {
      const summary = `Analyzed ${eligibleProfiles.length} vendors, 0 struggling, generated hints for: none`;
      console.log(`[PROMPT-IMPROVEMENT-JOB] ${summary}`);
      return {
        exitCode: 0,
        analyzedVendors: eligibleProfiles.length,
        strugglingVendors: 0,
        generatedHints: 0,
        vendors: [],
        skipped: false,
        summary,
      };
    }

    const scanSessions = await fetchAllRows<ScanSessionRow>(
      'bill_scan_sessions',
      'id, vendor_guess_normalized'
    );

    const sessionIdsByVendorKey = buildSessionIdsByVendorKey(scanSessions);
    const results: VendorHintSummary[] = [];
    const now = new Date().toISOString();

    for (const profile of strugglingProfiles) {
      const aliases = dedupeAliases(profile.canonical_name, profile.known_aliases ?? []);
      const vendorKeys = aliases
        .map(normalizeMatchValue)
        .filter((value): value is string => Boolean(value));
      const sessionIds = dedupeStrings(
        vendorKeys.flatMap((key) => sessionIdsByVendorKey.get(key) ?? [])
      );

      const corrections = sessionIds.length === 0
        ? []
        : await fetchCorrectionsForSessions(sessionIds);

      const hintObject = buildVendorPromptHint(profile, aliases, corrections, now);
      const accuracyBefore = Math.min(
        profile.field_accuracy_amount ?? 1,
        profile.field_accuracy_due_date ?? 1
      );

      await upsertVendorPromptHint({
        vendor_name: profile.canonical_name,
        aliases: hintObject.aliases,
        hints: hintObject.hints,
        correction_count: corrections.length,
        accuracy_before: Number(accuracyBefore.toFixed(4)),
        updated_at: now,
      });

      const topCorrectedField = findMostCorrectedField(corrections);
      results.push({
        vendor: profile.canonical_name,
        sampleCount: profile.sample_count ?? 0,
        amountAccuracy: profile.field_accuracy_amount,
        dueDateAccuracy: profile.field_accuracy_due_date,
        correctionCount: corrections.length,
        topCorrectedField,
        hints: hintObject.hints,
      });

      console.log(
        `[PROMPT-IMPROVEMENT-JOB] vendor=${profile.canonical_name} sample_count=${profile.sample_count ?? 0} amount_accuracy=${formatPercent(profile.field_accuracy_amount)} due_date_accuracy=${formatPercent(profile.field_accuracy_due_date)} correction_count=${corrections.length} top_field=${topCorrectedField ?? 'none'}`
      );
    }

    const generatedVendors = results
      .filter((result) => result.hints.length > 0)
      .map((result) => result.vendor);
    const summary = `Analyzed ${eligibleProfiles.length} vendors, ${strugglingProfiles.length} struggling, generated hints for: ${generatedVendors.length > 0 ? generatedVendors.join(', ') : 'none'}`;

    console.log(`[PROMPT-IMPROVEMENT-JOB] ${summary}`);

    return {
      exitCode: 0,
      analyzedVendors: eligibleProfiles.length,
      strugglingVendors: strugglingProfiles.length,
      generatedHints: generatedVendors.length,
      vendors: results,
      skipped: false,
      summary,
    };
  } catch (error) {
    console.error('[PROMPT-IMPROVEMENT-JOB] Failed to run', error);
    return {
      exitCode: 1,
      analyzedVendors: 0,
      strugglingVendors: 0,
      generatedHints: 0,
      vendors: [],
      skipped: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
      summary: 'Prompt improvement job failed',
    };
  }

  async function upsertVendorPromptHint(payload: {
    vendor_name: string;
    aliases: string[];
    hints: string[];
    correction_count: number;
    accuracy_before: number;
    updated_at: string;
  }) {
    const admin = createAdminClient();
    const { error } = await admin
      .from('vendor_prompt_hints')
      .upsert(payload, { onConflict: 'vendor_name' });

    if (error) {
      if (isMissingRelationError(error)) {
        throw new Error('vendor_prompt_hints table missing');
      }

      throw error;
    }
  }
}

async function fetchEligibleProfiles(): Promise<BillerProfileRow[] | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('biller_profiles')
    .select('id, canonical_name, known_aliases, sample_count, field_accuracy_amount, field_accuracy_due_date')
    .gte('sample_count', 5)
    .order('sample_count', { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) {
      console.warn('[PROMPT-IMPROVEMENT-JOB] biller_profiles table missing; skipping');
      return null;
    }

    throw error;
  }

  return (data ?? []) as BillerProfileRow[];
}

async function fetchCorrectionsForSessions(sessionIds: string[]): Promise<BillCorrectionRow[]> {
  const admin = createAdminClient();
  const rows: BillCorrectionRow[] = [];

  for (const chunk of chunked(sessionIds, 200)) {
    const { data, error } = await admin
      .from('bill_corrections')
      .select('id, scan_session_id, field_name, ai_value, final_value, was_changed, created_at')
      .in('scan_session_id', chunk)
      .eq('was_changed', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    rows.push(...((data ?? []) as BillCorrectionRow[]));
  }

  return rows;
}

function buildVendorPromptHint(
  profile: BillerProfileRow,
  aliases: string[],
  corrections: BillCorrectionRow[],
  lastUpdated: string
): VendorPromptHint {
  const hints = buildHints(profile, corrections);

  return {
    vendor: profile.canonical_name,
    aliases,
    hints,
    lastUpdated,
  };
}

function buildHints(profile: BillerProfileRow, corrections: BillCorrectionRow[]): string[] {
  const vendor = profile.canonical_name;
  const hints: string[] = [];
  const corrected = corrections.filter((row) => mapCorrectionField(row.field_name) !== null);
  const topField = findMostCorrectedField(corrected);

  if (topField) {
    const pairSummary = findMostCommonValueTransition(
      corrected.filter((row) => mapCorrectionField(row.field_name) === topField)
    );

    if (pairSummary && topField === 'amount') {
      hints.push(
        `For ${vendor}, prefer the amount labeled like "${pairSummary.toValue}" over "${pairSummary.fromValue}" when both appear.`
      );
    } else if (pairSummary && topField === 'due_date') {
      hints.push(
        `For ${vendor}, the due date usually needs correction from "${pairSummary.fromValue}" to "${pairSummary.toValue}". Verify the actual payment due date before returning it.`
      );
    } else if (pairSummary && topField === 'name') {
      hints.push(
        `For ${vendor}, normalize the biller name to "${pairSummary.toValue}" instead of "${pairSummary.fromValue}" when the statement wording varies.`
      );
    } else if (topField === 'amount') {
      hints.push(
        `For ${vendor}, review multiple amount candidates carefully and prefer the full statement balance or amount due over teaser or minimum-payment values.`
      );
    } else if (topField === 'due_date') {
      hints.push(
        `For ${vendor}, double-check the payment due date and avoid using statement period dates or issue dates as the bill due date.`
      );
    } else if (topField === 'name') {
      hints.push(
        `For ${vendor}, normalize the vendor name consistently using the statement branding rather than incidental account or product labels.`
      );
    }
  }

  if ((profile.field_accuracy_amount ?? 1) < 0.8) {
    hints.push(
      `For ${vendor}, amount extraction accuracy is ${formatPercent(profile.field_accuracy_amount)}. Resolve conflicts conservatively instead of choosing the first currency value in the document.`
    );
  }

  if ((profile.field_accuracy_due_date ?? 1) < 0.8) {
    hints.push(
      `For ${vendor}, due date accuracy is ${formatPercent(profile.field_accuracy_due_date)}. Prefer the actual payment due date label over service period or statement dates.`
    );
  }

  return dedupeStrings(hints);
}

function findMostCorrectedField(corrections: BillCorrectionRow[]): SupportedField | null {
  const counts = new Map<SupportedField, number>();

  for (const correction of corrections) {
    const field = mapCorrectionField(correction.field_name);
    if (!field) {
      continue;
    }

    counts.set(field, (counts.get(field) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0]);
    })[0]?.[0] ?? null;
}

function findMostCommonValueTransition(corrections: BillCorrectionRow[]): { fromValue: string; toValue: string; count: number } | null {
  const counts = new Map<string, { fromValue: string; toValue: string; count: number }>();

  for (const correction of corrections) {
    const fromValue = normalizePromptValue(correction.ai_value);
    const toValue = normalizePromptValue(correction.final_value);

    if (!fromValue || !toValue || fromValue === toValue) {
      continue;
    }

    const key = `${fromValue}=>${toValue}`;
    const existing = counts.get(key) ?? { fromValue, toValue, count: 0 };
    existing.count += 1;
    counts.set(key, existing);
  }

  const winner = [...counts.values()].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.toValue.localeCompare(right.toValue);
  })[0];

  if (!winner || winner.count < 2) {
    return null;
  }

  return winner;
}

async function fetchAllRows<T>(table: string, select: string): Promise<T[]> {
  const admin = createAdminClient();
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from(table)
      .select(select)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const page = (data ?? []) as T[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      return rows;
    }

    from += PAGE_SIZE;
  }
}

function buildSessionIdsByVendorKey(scanSessions: ScanSessionRow[]): Map<string, string[]> {
  const mapping = new Map<string, string[]>();

  for (const session of scanSessions) {
    const key = normalizeMatchValue(session.vendor_guess_normalized);
    if (!key) {
      continue;
    }

    const bucket = mapping.get(key) ?? [];
    bucket.push(session.id);
    mapping.set(key, bucket);
  }

  return mapping;
}

function mapCorrectionField(fieldName: string): SupportedField | null {
  const normalized = fieldName.trim().toLowerCase();

  if (normalized === 'name' || normalized === 'vendor' || normalized === 'vendor_name') {
    return 'name';
  }

  if (normalized === 'amount' || normalized === 'amount_due') {
    return 'amount';
  }

  if (normalized === 'due_date' || normalized === 'due date') {
    return 'due_date';
  }

  return null;
}

function dedupeAliases(canonicalName: string, aliases: string[]): string[] {
  return dedupeStrings([canonicalName, ...aliases].filter(Boolean));
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeMatchValue(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? '';
  return normalized || null;
}

function normalizePromptValue(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/\s+/g, ' ') ?? '';
  return normalized || null;
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) {
    return 'n/a';
  }

  return `${Math.round(value * 100)}%`;
}

function chunked<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('message' in error) || typeof error.message !== 'string') {
    return false;
  }

  return error.message.toLowerCase().includes('does not exist');
}
