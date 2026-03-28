import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

type SupportedField = 'name' | 'amount' | 'due_date';

interface BillCorrectionRow {
  id: string;
  scan_session_id: string;
  extraction_result_id: string | null;
  field_name: string;
  ai_value: string | null;
  final_value: string | null;
  was_changed: boolean;
  created_at: string;
}

interface ScanSessionRow {
  id: string;
  vendor_guess_normalized: string | null;
  created_at: string;
}

interface ExtractionResultRow {
  id: string;
  overall_confidence: number | null;
  confidence_name: number | null;
  confidence_amount: number | null;
  confidence_due_date: number | null;
}

interface SessionSummary {
  sessionId: string;
  vendorKey: string;
  createdAt: string;
  fieldChanged: Record<SupportedField, boolean>;
  chosenName: string | null;
  confidenceOverall: number | null;
  confidenceName: number | null;
  confidenceAmount: number | null;
  confidenceDueDate: number | null;
}

interface VendorProfileAggregate {
  vendorKey: string;
  canonicalName: string;
  knownAliases: string[];
  sampleCount: number;
  fieldAccuracyName: number | null;
  fieldAccuracyAmount: number | null;
  fieldAccuracyDueDate: number | null;
  exactMatchRate: number | null;
  manualEditRate: number | null;
  averageConfidence: number | null;
  lastSeenAt: string;
}

interface ExistingProfileRow {
  id: string;
  canonical_name: string;
  known_aliases: string[] | null;
}

export interface BillerProfileBuilderResult {
  exitCode: 0 | 1;
  vendorsProcessed: number;
  createdProfiles: number;
  updatedProfiles: number;
  skipped: boolean;
  reason?: string;
}

const PAGE_SIZE = 1000;
const TRACKED_FIELDS: SupportedField[] = ['name', 'amount', 'due_date'];

export async function runBillerProfileBuilder(): Promise<BillerProfileBuilderResult> {
  try {
    const admin = createAdminClient();
    const corrections = await fetchAllRows<BillCorrectionRow>(
      'bill_corrections',
      'id, scan_session_id, extraction_result_id, field_name, ai_value, final_value, was_changed, created_at',
      { orderBy: 'created_at', ascending: true }
    );

    if (corrections.length === 0) {
      console.log('[BILLER-PROFILE-BUILDER] No correction history found');
      return {
        exitCode: 0,
        vendorsProcessed: 0,
        createdProfiles: 0,
        updatedProfiles: 0,
        skipped: false,
      };
    }

    const scanSessionIds = unique(corrections.map((row) => row.scan_session_id));
    const extractionResultIds = unique(
      corrections
        .map((row) => row.extraction_result_id)
        .filter((value): value is string => Boolean(value))
    );

    const [sessions, extractionResults] = await Promise.all([
      fetchByIds<ScanSessionRow>('bill_scan_sessions', 'id, vendor_guess_normalized, created_at', scanSessionIds),
      fetchByIds<ExtractionResultRow>(
        'bill_extraction_results',
        'id, overall_confidence, confidence_name, confidence_amount, confidence_due_date',
        extractionResultIds
      ),
    ]);

    const sessionById = new Map(sessions.map((row) => [row.id, row]));
    const extractionById = new Map(extractionResults.map((row) => [row.id, row]));
    const sessionSummaries = new Map<string, SessionSummary>();

    for (const correction of corrections) {
      const session = sessionById.get(correction.scan_session_id);
      const vendorKey = normalizeVendorKey(session?.vendor_guess_normalized);

      if (!vendorKey) {
        continue;
      }

      const field = mapCorrectionField(correction.field_name);
      const existing = sessionSummaries.get(correction.scan_session_id);
      const extraction = correction.extraction_result_id
        ? extractionById.get(correction.extraction_result_id)
        : undefined;

      const summary = existing ?? {
        sessionId: correction.scan_session_id,
        vendorKey,
        createdAt: session?.created_at ?? correction.created_at,
        fieldChanged: { name: false, amount: false, due_date: false },
        chosenName: null,
        confidenceOverall: extraction?.overall_confidence ?? null,
        confidenceName: extraction?.confidence_name ?? null,
        confidenceAmount: extraction?.confidence_amount ?? null,
        confidenceDueDate: extraction?.confidence_due_date ?? null,
      };

      if (field && correction.was_changed) {
        summary.fieldChanged[field] = true;
      }

      if (field === 'name') {
        summary.chosenName = normalizeAlias(correction.final_value)
          ?? normalizeAlias(correction.ai_value)
          ?? summary.chosenName;
      }

      if (summary.confidenceOverall == null && extraction?.overall_confidence != null) {
        summary.confidenceOverall = extraction.overall_confidence;
      }
      if (summary.confidenceName == null && extraction?.confidence_name != null) {
        summary.confidenceName = extraction.confidence_name;
      }
      if (summary.confidenceAmount == null && extraction?.confidence_amount != null) {
        summary.confidenceAmount = extraction.confidence_amount;
      }
      if (summary.confidenceDueDate == null && extraction?.confidence_due_date != null) {
        summary.confidenceDueDate = extraction.confidence_due_date;
      }

      sessionSummaries.set(correction.scan_session_id, summary);
    }

    const aggregates = buildVendorAggregates([...sessionSummaries.values()]);
    if (aggregates.length === 0) {
      console.log('[BILLER-PROFILE-BUILDER] No vendor aggregates produced');
      return {
        exitCode: 0,
        vendorsProcessed: 0,
        createdProfiles: 0,
        updatedProfiles: 0,
        skipped: false,
      };
    }

    const existingProfiles = await fetchAllRows<ExistingProfileRow>(
      'biller_profiles',
      'id, canonical_name, known_aliases'
    ).catch((error) => {
      if (isMissingRelationError(error)) {
        console.warn('[BILLER-PROFILE-BUILDER] biller_profiles table missing; skipping profile writes');
        return null;
      }
      throw error;
    });

    if (existingProfiles === null) {
      return {
        exitCode: 0,
        vendorsProcessed: aggregates.length,
        createdProfiles: 0,
        updatedProfiles: 0,
        skipped: true,
        reason: 'biller_profiles table missing',
      };
    }

    let createdProfiles = 0;
    let updatedProfiles = 0;

    for (const aggregate of aggregates) {
      const existingProfile = findExistingProfile(existingProfiles, aggregate);

      const payload = {
        canonical_name: aggregate.canonicalName,
        known_aliases: aggregate.knownAliases,
        sample_count: aggregate.sampleCount,
        field_accuracy_name: aggregate.fieldAccuracyName,
        field_accuracy_amount: aggregate.fieldAccuracyAmount,
        field_accuracy_due_date: aggregate.fieldAccuracyDueDate,
        exact_match_rate: aggregate.exactMatchRate,
        manual_edit_rate: aggregate.manualEditRate,
        average_confidence: aggregate.averageConfidence,
        last_seen_at: aggregate.lastSeenAt,
        updated_at: new Date().toISOString(),
      };

      if (existingProfile) {
        const { error } = await admin
          .from('biller_profiles')
          .update(payload)
          .eq('id', existingProfile.id);

        if (error) {
          throw error;
        }

        existingProfile.canonical_name = aggregate.canonicalName;
        existingProfile.known_aliases = aggregate.knownAliases;
        updatedProfiles += 1;
        continue;
      }

      const { data, error } = await admin
        .from('biller_profiles')
        .insert(payload)
        .select('id, canonical_name, known_aliases')
        .single();

      if (error) {
        throw error;
      }

      existingProfiles.push({
        id: data.id,
        canonical_name: data.canonical_name,
        known_aliases: data.known_aliases,
      });
      createdProfiles += 1;
    }

    console.log(
      `[BILLER-PROFILE-BUILDER] vendors_processed=${aggregates.length} created_profiles=${createdProfiles} updated_profiles=${updatedProfiles}`
    );

    return {
      exitCode: 0,
      vendorsProcessed: aggregates.length,
      createdProfiles,
      updatedProfiles,
      skipped: false,
    };
  } catch (error) {
    console.error('[BILLER-PROFILE-BUILDER] Failed to run', error);
    return {
      exitCode: 1,
      vendorsProcessed: 0,
      createdProfiles: 0,
      updatedProfiles: 0,
      skipped: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function buildVendorAggregates(sessionSummaries: SessionSummary[]): VendorProfileAggregate[] {
  const sessionsByVendor = new Map<string, SessionSummary[]>();

  for (const summary of sessionSummaries) {
    const bucket = sessionsByVendor.get(summary.vendorKey) ?? [];
    bucket.push(summary);
    sessionsByVendor.set(summary.vendorKey, bucket);
  }

  return [...sessionsByVendor.entries()].map(([vendorKey, sessions]) => {
    const aliasCounts = new Map<string, number>();

    for (const session of sessions) {
      const alias = normalizeAlias(session.chosenName) ?? titleCaseVendor(vendorKey);
      aliasCounts.set(alias, (aliasCounts.get(alias) ?? 0) + 1);
    }

    const knownAliases = [...aliasCounts.keys()].sort((left, right) => left.localeCompare(right));
    const canonicalName = [...aliasCounts.entries()]
      .sort((left, right) => {
        if (right[1] !== left[1]) return right[1] - left[1];
        return left[0].localeCompare(right[0]);
      })[0]?.[0] ?? titleCaseVendor(vendorKey);

    const sampleCount = sessions.length;
    const exactMatches = sessions.filter((session) => TRACKED_FIELDS.every((field) => !session.fieldChanged[field])).length;

    return {
      vendorKey,
      canonicalName,
      knownAliases,
      sampleCount,
      fieldAccuracyName: ratio(
        sessions.filter((session) => !session.fieldChanged.name).length,
        sampleCount
      ),
      fieldAccuracyAmount: ratio(
        sessions.filter((session) => !session.fieldChanged.amount).length,
        sampleCount
      ),
      fieldAccuracyDueDate: ratio(
        sessions.filter((session) => !session.fieldChanged.due_date).length,
        sampleCount
      ),
      exactMatchRate: ratio(exactMatches, sampleCount),
      manualEditRate: ratio(sampleCount - exactMatches, sampleCount),
      averageConfidence: average(
        sessions
          .map((session) => session.confidenceOverall)
          .filter((value): value is number => value != null)
      ),
      lastSeenAt: sessions.reduce((latest, session) => session.createdAt > latest ? session.createdAt : latest, sessions[0].createdAt),
    };
  });
}

async function fetchAllRows<T>(
  table: string,
  select: string,
  options?: { orderBy?: string; ascending?: boolean }
): Promise<T[]> {
  const admin = createAdminClient();
  const rows: T[] = [];
  let from = 0;

  while (true) {
    let query = admin
      .from(table)
      .select(select)
      .range(from, from + PAGE_SIZE - 1);

    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? true });
    }

    const { data, error } = await query;
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

async function fetchByIds<T>(table: string, select: string, ids: string[]): Promise<T[]> {
  const admin = createAdminClient();
  const rows: T[] = [];

  for (const chunk of chunked(ids, 200)) {
    const { data, error } = await admin
      .from(table)
      .select(select)
      .in('id', chunk);

    if (error) {
      throw error;
    }

    rows.push(...((data ?? []) as T[]));
  }

  return rows;
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

function normalizeVendorKey(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? '';
  return normalized || null;
}

function normalizeAlias(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';
  return normalized || null;
}

function titleCaseVendor(value: string): string {
  return value
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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

  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(4));
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function chunked<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function findExistingProfile(
  existingProfiles: ExistingProfileRow[],
  aggregate: VendorProfileAggregate
): ExistingProfileRow | undefined {
  const wantedAliases = new Set(
    [aggregate.canonicalName, ...aggregate.knownAliases].map((value) => value.trim().toLowerCase())
  );

  return existingProfiles.find((profile) => {
    const profileAliases = new Set(
      [profile.canonical_name, ...(profile.known_aliases ?? [])]
        .map((value) => value.trim().toLowerCase())
    );

    for (const alias of wantedAliases) {
      if (profileAliases.has(alias)) {
        return true;
      }
    }

    return false;
  });
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('message' in error) || typeof error.message !== 'string') {
    return false;
  }

  return error.message.toLowerCase().includes('does not exist');
}
