export const FREE_SMART_SCAN_LIFETIME_LIMIT = 2;
export const PRO_SMART_SCAN_MONTHLY_LIMIT = 10;

export type SmartScanTier = 'free' | 'pro';
export type SmartScanKind = 'bill' | 'pay_later';
export type SmartScanPeriod = 'lifetime' | 'monthly';
export type SmartScanUsageStatus = 'reserved' | 'charged' | 'released';

export interface SmartScanSubscriptionSource {
  subscription_tier?: string | null;
  subscription_status?: string | null;
  subscription_expires_at?: string | null;
  subscription_current_period_end?: string | null;
  is_pro?: boolean | null;
}

export interface SmartScanUsageEvent {
  units: number | null;
  status: SmartScanUsageStatus | string | null;
  created_at?: string | null;
  period_start?: string | null;
}

export interface SmartScanPeriodInfo {
  type: SmartScanPeriod;
  periodStart: string | null;
  periodEnd: string | null;
  nextResetAt: string | null;
}

export interface SmartScanQuotaResult {
  tier: SmartScanTier;
  scanKind: SmartScanKind;
  cost: number;
  limit: number;
  used: number;
  remaining: number;
  canScan: boolean;
  period: SmartScanPeriodInfo;
}

const PRO_STATUSES = new Set(['active', 'trialing', 'billing_issue', 'past_due']);

export function resolveSmartScanTier(
  source: SmartScanSubscriptionSource | null | undefined,
  now = new Date(),
): SmartScanTier {
  if (!source) return 'free';

  const tier = source.subscription_tier === 'pro' || source.is_pro === true ? 'pro' : 'free';
  if (tier !== 'pro') return 'free';

  const status = source.subscription_status ?? 'active';
  if (!PRO_STATUSES.has(status)) return 'free';

  const expiresAt = source.subscription_expires_at ?? source.subscription_current_period_end;
  if (expiresAt && !isAfter(expiresAt, now)) return 'free';

  return 'pro';
}

export function getSmartScanUnitCost(scanKind: SmartScanKind): number {
  return scanKind === 'pay_later' ? 2 : 1;
}

export function getSmartScanLimit(tier: SmartScanTier): number {
  return tier === 'pro' ? PRO_SMART_SCAN_MONTHLY_LIMIT : FREE_SMART_SCAN_LIFETIME_LIMIT;
}

export function getSmartScanPeriodInfo(tier: SmartScanTier, now = new Date()): SmartScanPeriodInfo {
  if (tier === 'free') {
    return {
      type: 'lifetime',
      periodStart: null,
      periodEnd: null,
      nextResetAt: null,
    };
  }

  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const periodStart = new Date(Date.UTC(year, month, 1));
  const periodEnd = new Date(Date.UTC(year, month + 1, 1));
  const periodEndIso = periodEnd.toISOString();

  return {
    type: 'monthly',
    periodStart: toDateOnly(periodStart),
    periodEnd: toDateOnly(periodEnd),
    nextResetAt: periodEndIso,
  };
}

export function calculateUsedSmartScanUnits(
  events: SmartScanUsageEvent[],
  tier: SmartScanTier,
  now = new Date(),
): number {
  const period = getSmartScanPeriodInfo(tier, now);

  return events.reduce((total, event) => {
    if (event.status !== 'charged') return total;
    if (tier === 'pro' && !isEventInPeriod(event, period)) return total;

    const units = Number(event.units ?? 0);
    if (!Number.isFinite(units) || units <= 0) return total;

    return total + units;
  }, 0);
}

export function calculateSmartScanQuota(options: {
  subscription: SmartScanSubscriptionSource | null | undefined;
  usageEvents: SmartScanUsageEvent[];
  scanKind: SmartScanKind;
  now?: Date;
}): SmartScanQuotaResult {
  const now = options.now ?? new Date();
  const tier = resolveSmartScanTier(options.subscription, now);
  const cost = getSmartScanUnitCost(options.scanKind);
  const limit = getSmartScanLimit(tier);
  const used = calculateUsedSmartScanUnits(options.usageEvents, tier, now);
  const remaining = Math.max(0, limit - used);

  return {
    tier,
    scanKind: options.scanKind,
    cost,
    limit,
    used,
    remaining,
    canScan: remaining >= cost,
    period: getSmartScanPeriodInfo(tier, now),
  };
}

export function buildSmartScanLimitReachedResponse(quota: SmartScanQuotaResult) {
  return {
    error: 'smart_scan_limit_reached',
    message: 'You are out of Smart Scans.',
    smartScans: quota,
  };
}

function isEventInPeriod(event: SmartScanUsageEvent, period: SmartScanPeriodInfo): boolean {
  if (period.type !== 'monthly' || !period.periodStart || !period.periodEnd) {
    return true;
  }

  if (event.period_start) {
    return toDateOnly(event.period_start) === period.periodStart;
  }

  if (!event.created_at) return false;
  const createdAt = new Date(event.created_at);
  if (Number.isNaN(createdAt.getTime())) return false;

  const start = new Date(`${period.periodStart}T00:00:00.000Z`);
  const end = new Date(`${period.periodEnd}T00:00:00.000Z`);
  return createdAt >= start && createdAt < end;
}

function isAfter(value: string, now: Date): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() > now.getTime();
}

function toDateOnly(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value.slice(0, 10);
}
