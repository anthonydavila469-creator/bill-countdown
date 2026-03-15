import type { BaseExtractor } from '@/types/parser';
import { normalizeWhitespace } from './utils';

export function parseCurrency(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const cleaned = value.replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseUsDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = normalizeWhitespace(value);
  if (!normalized) return null;

  const directDate = new Date(normalized);
  if (!Number.isNaN(directDate.getTime())) {
    return directDate.toISOString().slice(0, 10);
  }

  const slashMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (!slashMatch) return null;

  const month = Number.parseInt(slashMatch[1], 10);
  const day = Number.parseInt(slashMatch[2], 10);
  const yearPart = slashMatch[3];
  const now = new Date();
  const year = yearPart ? Number.parseInt(yearPart.length === 2 ? `20${yearPart}` : yearPart, 10) : now.getFullYear();
  const date = new Date(Date.UTC(year, month - 1, day));

  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export function normalizeVendorName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return normalizeWhitespace(value.replace(/[|_-]+/g, ' '));
}

export function normalizeLast4(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return null;
  return digits.slice(-4);
}

export function applyTransforms(value: unknown, transforms?: BaseExtractor['transforms']): unknown {
  let current: unknown = value;

  for (const transform of transforms || []) {
    switch (transform) {
      case 'trim':
        current = typeof current === 'string' ? normalizeWhitespace(current) : current;
        break;
      case 'parse_currency':
        current = parseCurrency(current);
        break;
      case 'parse_us_date':
        current = parseUsDate(current);
        break;
      case 'normalize_vendor_name':
        current = normalizeVendorName(current);
        break;
      case 'normalize_last4':
        current = normalizeLast4(current);
        break;
      default:
        break;
    }
  }

  return current;
}
