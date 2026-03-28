import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

interface VendorPromptHintsRow {
  vendor_name: string;
  aliases: string[] | null;
  hints: string[] | null;
}

export async function getVendorHints(vendorName: string): Promise<string[]> {
  const normalizedVendorName = vendorName.trim();
  if (!normalizedVendorName) {
    return [];
  }

  const admin = createAdminClient();

  const { data: exactMatch, error: exactError } = await admin
    .from('vendor_prompt_hints')
    .select('vendor_name, aliases, hints')
    .eq('vendor_name', normalizedVendorName)
    .limit(1)
    .maybeSingle();

  if (exactError) {
    if (isMissingRelationError(exactError)) {
      return [];
    }

    throw exactError;
  }

  if (exactMatch?.hints?.length) {
    return exactMatch.hints;
  }

  const { data: aliasMatch, error: aliasError } = await admin
    .from('vendor_prompt_hints')
    .select('vendor_name, aliases, hints')
    .contains('aliases', [normalizedVendorName])
    .limit(1)
    .maybeSingle();

  if (aliasError) {
    if (isMissingRelationError(aliasError)) {
      return [];
    }

    throw aliasError;
  }

  if (aliasMatch?.hints?.length) {
    return aliasMatch.hints;
  }

  const { data: allRows, error: allRowsError } = await admin
    .from('vendor_prompt_hints')
    .select('vendor_name, aliases, hints');

  if (allRowsError) {
    if (isMissingRelationError(allRowsError)) {
      return [];
    }

    throw allRowsError;
  }

  const lowerName = normalizedVendorName.toLowerCase();
  const fallbackMatch = ((allRows ?? []) as VendorPromptHintsRow[]).find((row) => {
    if (row.vendor_name.trim().toLowerCase() === lowerName) {
      return true;
    }

    return (row.aliases ?? []).some((alias) => alias.trim().toLowerCase() === lowerName);
  });

  return normalizeHints(fallbackMatch ?? null);
}

function normalizeHints(row: VendorPromptHintsRow | null): string[] {
  return row?.hints?.filter((value): value is string => typeof value === 'string' && value.trim().length > 0) ?? [];
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('message' in error) || typeof error.message !== 'string') {
    return false;
  }

  return error.message.toLowerCase().includes('does not exist');
}
