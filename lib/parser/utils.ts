import type { NormalizedEmail } from '@/types/parser';

export function safeLower(value?: string | null): string {
  return (value || '').toLowerCase();
}

export function normalizeWhitespace(value?: string | null): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => normalizeWhitespace(value)).filter(Boolean))];
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getHeaderValue(headers: Record<string, string>, name: string): string | undefined {
  const target = name.toLowerCase();
  return Object.entries(headers).find(([key]) => key.toLowerCase() === target)?.[1];
}

export function extractSenderDomain(fromEmail?: string | null): string | null {
  const email = (fromEmail || '').trim().toLowerCase();
  if (!email.includes('@')) return null;
  return email.split('@').pop() || null;
}

export function wordWindowAround(haystack: string, needle: string | RegExp, radius = 80): string {
  const source = haystack || '';
  const index =
    typeof needle === 'string'
      ? source.toLowerCase().indexOf(needle.toLowerCase())
      : source.search(needle);

  if (index < 0) {
    return normalizeWhitespace(source.slice(0, Math.min(source.length, radius * 2)));
  }

  const start = Math.max(0, index - radius);
  const end = Math.min(source.length, index + radius);
  return normalizeWhitespace(source.slice(start, end));
}

export function looksLikeCurrency(value?: string | null): boolean {
  if (!value) return false;
  return /\$?\s?\d[\d,]*(\.\d{2})?/.test(value);
}

export function looksLikeDate(value?: string | null): boolean {
  if (!value) return false;
  return /\b(\d{1,2}\/\d{1,2}(\/\d{2,4})?|[A-Za-z]{3,9}\s+\d{1,2}(,\s*\d{4})?|\d{4}-\d{2}-\d{2})\b/.test(value);
}

export function parseFromAddress(from: string): Pick<NormalizedEmail, 'from' | 'fromEmail' | 'fromName' | 'senderDomain'> {
  const match = from.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+@[^>]+)>?$/);
  const fromName = normalizeWhitespace(match?.[1] || '');
  const fromEmail = normalizeWhitespace(match?.[2] || from);

  return {
    from,
    fromName,
    fromEmail,
    senderDomain: extractSenderDomain(fromEmail),
  };
}
