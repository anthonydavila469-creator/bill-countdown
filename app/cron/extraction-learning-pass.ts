import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

interface ScanMetricDailyRow {
  date: string;
  total_scans: number | null;
  successful_extractions: number | null;
  field_accuracy_name: number | null;
  field_accuracy_amount: number | null;
  field_accuracy_due_date: number | null;
  exact_match_rate: number | null;
  manual_edit_rate: number | null;
}

interface RecentSessionRow {
  id: string;
  vendor_guess_normalized: string | null;
  created_at: string;
}

interface RecentExtractionRow {
  id: string;
  scan_session_id: string;
  overall_confidence: number | null;
}

interface RecentCorrectionRow {
  scan_session_id: string;
  field_name: string;
  was_changed: boolean;
}

interface VendorRecommendation {
  vendor: string;
  sampleCount: number;
  amountAccuracy: number | null;
  editRate: number | null;
  message: string;
}

export interface ExtractionLearningPassResult {
  exitCode: 0 | 1;
  totalScans: number;
  successfulExtractions: number;
  successRate: number | null;
  averageConfidence: number | null;
  problemVendors: VendorRecommendation[];
  skipped: boolean;
  reason?: string;
}

const PAGE_SIZE = 1000;

export async function runExtractionLearningPass(): Promise<ExtractionLearningPassResult> {
  try {
    const admin = createAdminClient();
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 6);
    const startDateString = startDate.toISOString().slice(0, 10);

    const { data: metricsRows, error: metricsError } = await admin
      .from('scan_metrics_daily')
      .select('date, total_scans, successful_extractions, field_accuracy_name, field_accuracy_amount, field_accuracy_due_date, exact_match_rate, manual_edit_rate')
      .gte('date', startDateString)
      .order('date', { ascending: true });

    if (metricsError) {
      if (isMissingRelationError(metricsError)) {
        console.warn('[EXTRACTION-LEARNING-PASS] scan_metrics_daily table missing; skipping nightly pass');
        return {
          exitCode: 0,
          totalScans: 0,
          successfulExtractions: 0,
          successRate: null,
          averageConfidence: null,
          problemVendors: [],
          skipped: true,
          reason: 'scan_metrics_daily table missing',
        };
      }

      throw metricsError;
    }

    const metrics = (metricsRows ?? []) as ScanMetricDailyRow[];
    const totalScans = metrics.reduce((sum, row) => sum + (row.total_scans ?? 0), 0);
    const successfulExtractions = metrics.reduce((sum, row) => sum + (row.successful_extractions ?? 0), 0);
    const successRate = ratio(successfulExtractions, totalScans);

    const weightedFieldAccuracyName = weightedAverage(metrics, 'field_accuracy_name');
    const weightedFieldAccuracyAmount = weightedAverage(metrics, 'field_accuracy_amount');
    const weightedFieldAccuracyDueDate = weightedAverage(metrics, 'field_accuracy_due_date');
    const weightedExactMatchRate = weightedAverage(metrics, 'exact_match_rate');
    const weightedManualEditRate = weightedAverage(metrics, 'manual_edit_rate');

    const recentSessions = await fetchAllRows<RecentSessionRow>(
      'bill_scan_sessions',
      'id, vendor_guess_normalized, created_at',
      {
        filterColumn: 'created_at',
        filterValue: startDate.toISOString(),
      }
    );

    const recentSessionIds = recentSessions.map((row) => row.id);
    const [recentExtractions, recentCorrections] = await Promise.all([
      fetchRelatedRows<RecentExtractionRow>(
        'bill_extraction_results',
        'id, scan_session_id, overall_confidence',
        'scan_session_id',
        recentSessionIds
      ),
      fetchRelatedRows<RecentCorrectionRow>(
        'bill_corrections',
        'scan_session_id, field_name, was_changed',
        'scan_session_id',
        recentSessionIds
      ),
    ]);

    const averageConfidence = average(
      recentExtractions
        .map((row) => row.overall_confidence)
        .filter((value): value is number => value != null)
    );

    const problemVendors = buildProblemVendors(recentSessions, recentCorrections);

    console.log(
      `[EXTRACTION-LEARNING-PASS] total_scans=${totalScans} success_rate=${formatPercent(successRate)} avg_confidence=${formatDecimal(averageConfidence)}`
    );
    console.log(
      `[EXTRACTION-LEARNING-PASS] field_accuracy_name=${formatPercent(weightedFieldAccuracyName)} field_accuracy_amount=${formatPercent(weightedFieldAccuracyAmount)} field_accuracy_due_date=${formatPercent(weightedFieldAccuracyDueDate)} exact_match_rate=${formatPercent(weightedExactMatchRate)} manual_edit_rate=${formatPercent(weightedManualEditRate)}`
    );

    if (problemVendors.length === 0) {
      console.log('[EXTRACTION-LEARNING-PASS] No problematic vendors identified in the last 7 days');
    } else {
      console.log(`[EXTRACTION-LEARNING-PASS] problem_vendors=${problemVendors.length}`);
      for (const vendor of problemVendors) {
        console.log(`[EXTRACTION-LEARNING-PASS] recommendation: ${vendor.message}`);
      }
    }

    return {
      exitCode: 0,
      totalScans,
      successfulExtractions,
      successRate,
      averageConfidence,
      problemVendors,
      skipped: false,
    };
  } catch (error) {
    console.error('[EXTRACTION-LEARNING-PASS] Failed to run', error);
    return {
      exitCode: 1,
      totalScans: 0,
      successfulExtractions: 0,
      successRate: null,
      averageConfidence: null,
      problemVendors: [],
      skipped: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function buildProblemVendors(
  sessions: RecentSessionRow[],
  corrections: RecentCorrectionRow[]
): VendorRecommendation[] {
  const summaryByVendor = new Map<string, { sampleCount: number; amountChanged: number; anyChanged: number }>();
  const touchedSessions = new Map<string, { vendor: string; amountChanged: boolean; anyChanged: boolean }>();

  for (const session of sessions) {
    const vendor = normalizeVendor(session.vendor_guess_normalized) ?? 'unknown billers';
    touchedSessions.set(session.id, { vendor, amountChanged: false, anyChanged: false });
  }

  for (const correction of corrections) {
    const state = touchedSessions.get(correction.scan_session_id);
    if (!state || !correction.was_changed) {
      continue;
    }

    state.anyChanged = true;
    if (mapField(correction.field_name) === 'amount') {
      state.amountChanged = true;
    }
  }

  for (const [, state] of touchedSessions) {
    const summary = summaryByVendor.get(state.vendor) ?? { sampleCount: 0, amountChanged: 0, anyChanged: 0 };
    summary.sampleCount += 1;
    if (state.amountChanged) {
      summary.amountChanged += 1;
    }
    if (state.anyChanged) {
      summary.anyChanged += 1;
    }
    summaryByVendor.set(state.vendor, summary);
  }

  return [...summaryByVendor.entries()]
    .map(([vendor, summary]) => {
      const amountAccuracy = ratio(summary.sampleCount - summary.amountChanged, summary.sampleCount);
      const editRate = ratio(summary.anyChanged, summary.sampleCount);
      return {
        vendor,
        sampleCount: summary.sampleCount,
        amountAccuracy,
        editRate,
        message: buildRecommendationMessage(vendor, summary.sampleCount, amountAccuracy, editRate),
      };
    })
    .filter((summary) => (summary.amountAccuracy ?? 1) < 0.7 || (summary.editRate ?? 0) > 0.3)
    .sort((left, right) => {
      const leftScore = Math.max(1 - (left.amountAccuracy ?? 1), left.editRate ?? 0);
      const rightScore = Math.max(1 - (right.amountAccuracy ?? 1), right.editRate ?? 0);
      return rightScore - leftScore;
    });
}

function buildRecommendationMessage(
  vendor: string,
  sampleCount: number,
  amountAccuracy: number | null,
  editRate: number | null
): string {
  const displayName = vendor === 'unknown billers' ? 'Unknown billers' : vendor;

  if ((amountAccuracy ?? 1) < 0.7) {
    if (vendor === 'unknown billers') {
      return `${displayName}: ${sampleCount} scans, ${formatPercent(amountAccuracy)} amount accuracy -> add more vendor profiles`;
    }

    return `${displayName}: ${sampleCount} scans, ${formatPercent(amountAccuracy)} amount accuracy -> consider vendor-specific prompt hints`;
  }

  return `${displayName}: ${sampleCount} scans, ${formatPercent(editRate)} edit rate -> review extraction drift before adding prompt hints`;
}

async function fetchAllRows<T>(
  table: string,
  select: string,
  options: { filterColumn: string; filterValue: string }
): Promise<T[]> {
  const admin = createAdminClient();
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from(table)
      .select(select)
      .gte(options.filterColumn, options.filterValue)
      .range(from, from + PAGE_SIZE - 1)
      .order(options.filterColumn, { ascending: true });

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

async function fetchRelatedRows<T>(
  table: string,
  select: string,
  foreignKey: string,
  ids: string[]
): Promise<T[]> {
  if (ids.length === 0) {
    return [];
  }

  const admin = createAdminClient();
  const rows: T[] = [];

  for (const idChunk of chunkValues(ids, 200)) {
    const { data, error } = await admin
      .from(table)
      .select(select)
      .in(foreignKey, idChunk);

    if (error) {
      throw error;
    }

    rows.push(...((data ?? []) as T[]));
  }

  return rows;
}

function weightedAverage(
  rows: ScanMetricDailyRow[],
  key: 'field_accuracy_name' | 'field_accuracy_amount' | 'field_accuracy_due_date' | 'exact_match_rate' | 'manual_edit_rate'
): number | null {
  const validRows = rows.filter((row) => row[key] != null && (row.total_scans ?? 0) > 0);
  if (validRows.length === 0) {
    return null;
  }

  const numerator = validRows.reduce((sum, row) => sum + ((row[key] ?? 0) * (row.total_scans ?? 0)), 0);
  const denominator = validRows.reduce((sum, row) => sum + (row.total_scans ?? 0), 0);
  return ratio(numerator, denominator);
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) {
    return null;
  }

  return Number((numerator / denominator).toFixed(4));
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4));
}

function normalizeVendor(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function mapField(value: string): 'amount' | 'other' {
  const normalized = value.trim().toLowerCase();
  return normalized === 'amount' || normalized === 'amount_due' ? 'amount' : 'other';
}

function formatPercent(value: number | null): string {
  if (value == null) {
    return 'n/a';
  }

  return `${Math.round(value * 100)}%`;
}

function formatDecimal(value: number | null): string {
  if (value == null) {
    return 'n/a';
  }

  return value.toFixed(2);
}

function chunkValues<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeMessage = 'message' in error && typeof error.message === 'string' ? error.message.toLowerCase() : '';
  const maybeCode = 'code' in error && typeof error.code === 'string' ? error.code : '';

  return maybeCode === 'PGRST205'
    || maybeMessage.includes('does not exist')
    || maybeMessage.includes('could not find the table');
}
