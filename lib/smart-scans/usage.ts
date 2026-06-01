import type {
  SmartScanKind,
  SmartScanQuotaResult,
  SmartScanSubscriptionSource,
  SmartScanUsageEvent,
  SmartScanUsageStatus,
} from './quota';

const SMART_SCAN_USAGE_TABLE = 'smart_scan_usage_events';

export interface SmartScanUsageEventRow extends SmartScanUsageEvent {
  id: string;
  user_id: string;
  created_at: string;
  period_start: string | null;
  scan_kind: SmartScanKind;
  units: number;
  route: string;
  status: SmartScanUsageStatus;
  charge_reason: string | null;
  model_provider: string | null;
  model_name: string | null;
  model_call_started_at: string | null;
  model_call_finished_at: string | null;
  bill_scan_session_id: string | null;
  pay_later_scan_attempt_id: string | null;
  idempotency_key: string | null;
  error_code: string | null;
  image_count: number | null;
  file_size_bytes: number | null;
  latency_ms: number | null;
}

export interface SmartScanUsageMetadata {
  modelProvider?: string | null;
  modelName?: string | null;
  imageCount?: number | null;
  fileSizeBytes?: number | null;
  errorCode?: string | null;
  latencyMs?: number | null;
  billScanSessionId?: string | null;
  payLaterScanAttemptId?: string | null;
  chargeReason?: string | null;
}

export interface ReserveSmartScanUsageOptions extends SmartScanUsageMetadata {
  userId: string;
  scanKind: SmartScanKind;
  route: string;
  idempotencyKey?: string | null;
  now?: Date;
  supabase?: SupabaseLike;
}

export interface MutateSmartScanUsageOptions extends SmartScanUsageMetadata {
  userId: string;
  eventId: string;
  now?: Date;
  supabase?: SupabaseLike;
}

export type ReserveSmartScanUsageResult =
  | {
      ok: true;
      status: 'reserved' | 'already_reserved' | 'already_charged';
      event: SmartScanUsageEventRow;
      quota: SmartScanQuotaResult;
      limitResponse: null;
    }
  | {
      ok: false;
      status: 'limit_reached';
      event: null;
      quota: SmartScanQuotaResult;
      limitResponse: ReturnType<QuotaModule['buildSmartScanLimitReachedResponse']>;
    };

export type ReleaseSmartScanUsageResult =
  | {
      ok: true;
      status: 'released';
      event: SmartScanUsageEventRow;
    }
  | {
      ok: false;
      status: 'already_charged' | 'not_found_or_not_reserved';
      event: SmartScanUsageEventRow | null;
    };

type SupabaseLike = {
  from(table: string): SupabaseQueryLike;
};
interface SupabaseQueryLike extends PromiseLike<QueryResponse<unknown[]>> {
  select(columns?: string): SupabaseQueryLike;
  insert(payload: unknown): SupabaseQueryLike;
  update(payload: unknown): SupabaseQueryLike;
  eq(column: string, value: unknown): SupabaseQueryLike;
  maybeSingle(): Promise<QueryResponse<unknown>>;
  single(): Promise<QueryResponse<unknown>>;
}
type QueryResponse<T> = { data: T | null; error: { message?: string; code?: string } | null };
type QuotaModule = typeof import('./quota');

export async function loadSmartScanSubscriptionState(
  userId: string,
  supabase?: SupabaseLike,
): Promise<SmartScanSubscriptionSource | null> {
  const db = supabase ?? await createServiceRoleClient();
  const { data, error } = await db
    .from('user_preferences')
    .select(
      [
        'subscription_tier',
        'subscription_status',
        'subscription_expires_at',
        'subscription_current_period_end',
        'is_pro',
      ].join(', '),
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Smart Scan subscription state: ${error.message ?? 'unknown error'}`);
  }

  return data as SmartScanSubscriptionSource | null;
}

export async function loadChargedSmartScanUsageEvents(options: {
  userId: string;
  tier: 'free' | 'pro';
  now?: Date;
  supabase?: SupabaseLike;
}): Promise<SmartScanUsageEvent[]> {
  const supabase = options.supabase ?? await createServiceRoleClient();
  const quota = await loadQuotaModule();
  const period = quota.getSmartScanPeriodInfo(options.tier, options.now ?? new Date());

  let query = supabase
    .from(SMART_SCAN_USAGE_TABLE)
    .select('units, status, created_at, period_start')
    .eq('user_id', options.userId)
    .eq('status', 'charged');

  if (options.tier === 'pro' && period.periodStart) {
    query = query.eq('period_start', period.periodStart);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load Smart Scan usage events: ${error.message ?? 'unknown error'}`);
  }

  return (data ?? []) as SmartScanUsageEvent[];
}

export async function getSmartScanQuotaSnapshot(options: {
  userId: string;
  scanKind: SmartScanKind;
  now?: Date;
  supabase?: SupabaseLike;
}): Promise<SmartScanQuotaResult> {
  const supabase = options.supabase ?? await createServiceRoleClient();
  const now = options.now ?? new Date();
  const quota = await loadQuotaModule();
  const subscription = await loadSmartScanSubscriptionState(options.userId, supabase);
  const tier = quota.resolveSmartScanTier(subscription, now);
  const usageEvents = await loadChargedSmartScanUsageEvents({
    userId: options.userId,
    tier,
    now,
    supabase,
  });

  return quota.calculateSmartScanQuota({
    subscription,
    usageEvents,
    scanKind: options.scanKind,
    now,
  });
}

export async function reserveSmartScanUsage(
  options: ReserveSmartScanUsageOptions,
): Promise<ReserveSmartScanUsageResult> {
  const supabase = options.supabase ?? await createServiceRoleClient();
  const quota = await loadQuotaModule();
  const now = options.now ?? new Date();

  if (options.idempotencyKey) {
    const existing = await loadUsageEventByIdempotencyKey({
      supabase,
      userId: options.userId,
      idempotencyKey: options.idempotencyKey,
    });

    if (existing) {
      return {
        ok: true,
        status: existing.status === 'charged' ? 'already_charged' : 'already_reserved',
        event: existing,
        quota: await getSmartScanQuotaSnapshot({
          userId: options.userId,
          scanKind: options.scanKind,
          now,
          supabase,
        }),
        limitResponse: null,
      };
    }
  }

  const quotaSnapshot = await getSmartScanQuotaSnapshot({
    userId: options.userId,
    scanKind: options.scanKind,
    now,
    supabase,
  });

  if (!quotaSnapshot.canScan) {
    return {
      ok: false,
      status: 'limit_reached',
      event: null,
      quota: quotaSnapshot,
      limitResponse: quota.buildSmartScanLimitReachedResponse(quotaSnapshot),
    };
  }

  const insertPayload = {
    user_id: options.userId,
    period_start: quotaSnapshot.period.periodStart,
    scan_kind: options.scanKind,
    units: quotaSnapshot.cost,
    route: options.route,
    status: 'reserved',
    charge_reason: options.chargeReason ?? null,
    model_provider: options.modelProvider ?? null,
    model_name: options.modelName ?? null,
    bill_scan_session_id: options.billScanSessionId ?? null,
    pay_later_scan_attempt_id: options.payLaterScanAttemptId ?? null,
    idempotency_key: options.idempotencyKey ?? null,
    error_code: options.errorCode ?? null,
    image_count: options.imageCount ?? null,
    file_size_bytes: options.fileSizeBytes ?? null,
    latency_ms: options.latencyMs ?? null,
  };

  const { data, error } = await supabase
    .from(SMART_SCAN_USAGE_TABLE)
    .insert(insertPayload)
    .select('*')
    .single();

  if (error || !data) {
    if (options.idempotencyKey) {
      const existing = await loadUsageEventByIdempotencyKey({
        supabase,
        userId: options.userId,
        idempotencyKey: options.idempotencyKey,
      });
      if (existing) {
        return {
          ok: true,
          status: existing.status === 'charged' ? 'already_charged' : 'already_reserved',
          event: existing,
          quota: quotaSnapshot,
          limitResponse: null,
        };
      }
    }
    throw new Error(`Failed to reserve Smart Scan usage: ${error?.message ?? 'unknown error'}`);
  }

  return {
    ok: true,
    status: 'reserved',
    event: data as SmartScanUsageEventRow,
    quota: quotaSnapshot,
    limitResponse: null,
  };
}

export async function chargeSmartScanUsageEvent(
  options: MutateSmartScanUsageOptions,
): Promise<SmartScanUsageEventRow> {
  const supabase = options.supabase ?? await createServiceRoleClient();
  const nowIso = (options.now ?? new Date()).toISOString();

  const updatePayload = compactRecord({
    status: 'charged',
    charge_reason: options.chargeReason ?? null,
    model_provider: options.modelProvider,
    model_name: options.modelName,
    model_call_started_at: nowIso,
    error_code: options.errorCode,
    image_count: options.imageCount,
    file_size_bytes: options.fileSizeBytes,
    latency_ms: options.latencyMs,
    bill_scan_session_id: options.billScanSessionId,
    pay_later_scan_attempt_id: options.payLaterScanAttemptId,
  });

  const { data, error } = await supabase
    .from(SMART_SCAN_USAGE_TABLE)
    .update(updatePayload)
    .eq('id', options.eventId)
    .eq('user_id', options.userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to charge Smart Scan usage: ${error?.message ?? 'unknown error'}`);
  }

  return data as SmartScanUsageEventRow;
}

export async function finishChargedSmartScanUsageEvent(
  options: MutateSmartScanUsageOptions,
): Promise<SmartScanUsageEventRow> {
  const supabase = options.supabase ?? await createServiceRoleClient();
  const nowIso = (options.now ?? new Date()).toISOString();

  const updatePayload = compactRecord({
    model_call_finished_at: nowIso,
    error_code: options.errorCode,
    image_count: options.imageCount,
    file_size_bytes: options.fileSizeBytes,
    latency_ms: options.latencyMs,
    bill_scan_session_id: options.billScanSessionId,
    pay_later_scan_attempt_id: options.payLaterScanAttemptId,
  });

  const { data, error } = await supabase
    .from(SMART_SCAN_USAGE_TABLE)
    .update(updatePayload)
    .eq('id', options.eventId)
    .eq('user_id', options.userId)
    .eq('status', 'charged')
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to finish Smart Scan usage: ${error?.message ?? 'unknown error'}`);
  }

  return data as SmartScanUsageEventRow;
}

export async function releaseSmartScanUsageEvent(
  options: MutateSmartScanUsageOptions,
): Promise<ReleaseSmartScanUsageResult> {
  const supabase = options.supabase ?? await createServiceRoleClient();

  const updatePayload = compactRecord({
    status: 'released',
    error_code: options.errorCode,
    image_count: options.imageCount,
    file_size_bytes: options.fileSizeBytes,
    latency_ms: options.latencyMs,
    bill_scan_session_id: options.billScanSessionId,
    pay_later_scan_attempt_id: options.payLaterScanAttemptId,
  });

  const { data, error } = (await supabase
    .from(SMART_SCAN_USAGE_TABLE)
    .update(updatePayload)
    .eq('id', options.eventId)
    .eq('user_id', options.userId)
    .eq('status', 'reserved')
    .select('*')
    .maybeSingle()) as QueryResponse<SmartScanUsageEventRow>;

  if (error) {
    throw new Error(`Failed to release Smart Scan usage: ${error.message ?? 'unknown error'}`);
  }

  if (data) {
    return { ok: true, status: 'released', event: data };
  }

  const existing = await loadUsageEventById({
    supabase,
    userId: options.userId,
    eventId: options.eventId,
  });

  return {
    ok: false,
    status: existing?.status === 'charged' ? 'already_charged' : 'not_found_or_not_reserved',
    event: existing,
  };
}

async function loadUsageEventById(options: {
  supabase: SupabaseLike;
  userId: string;
  eventId: string;
}): Promise<SmartScanUsageEventRow | null> {
  const { data, error } = await options.supabase
    .from(SMART_SCAN_USAGE_TABLE)
    .select('*')
    .eq('user_id', options.userId)
    .eq('id', options.eventId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Smart Scan usage event: ${error.message ?? 'unknown error'}`);
  }

  return (data as SmartScanUsageEventRow | null) ?? null;
}

async function loadUsageEventByIdempotencyKey(options: {
  supabase: SupabaseLike;
  userId: string;
  idempotencyKey: string;
}): Promise<SmartScanUsageEventRow | null> {
  const { data, error } = await options.supabase
    .from(SMART_SCAN_USAGE_TABLE)
    .select('*')
    .eq('user_id', options.userId)
    .eq('idempotency_key', options.idempotencyKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Smart Scan idempotency event: ${error.message ?? 'unknown error'}`);
  }

  return (data as SmartScanUsageEventRow | null) ?? null;
}

function compactRecord<T extends Record<string, unknown>>(record: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

async function loadQuotaModule(): Promise<QuotaModule> {
  const quotaModulePath = './quota.ts';
  return import(quotaModulePath) as Promise<QuotaModule>;
}

async function createServiceRoleClient(): Promise<SupabaseLike> {
  const adminModulePath = '../supabase/admin.ts';
  const { createAdminClient } = await import(adminModulePath) as typeof import('../supabase/admin');
  return createAdminClient() as unknown as SupabaseLike;
}
