import { createAdminClient } from '@/lib/supabase/admin';
import type { FieldEvidence, NormalizedEmail } from '@/types/parser';
import { normalizeWhitespace, safeLower } from './utils';

export async function resolveVendor(email: NormalizedEmail): Promise<{
  vendorId: string | null;
  confidence: number;
  evidence: FieldEvidence[];
}> {
  const admin = createAdminClient();
  const subject = safeLower(email.subject);
  const senderName = safeLower(email.fromName);
  const senderEmail = safeLower(email.fromEmail);
  const senderDomain = safeLower(email.senderDomain);

  const { data, error } = await admin
    .from('vendor_aliases')
    .select('vendor_id, alias_type, alias_value, confidence')
    .in('alias_type', ['domain', 'sender_email', 'sender_name', 'subject_anchor']);

  if (error || !data) {
    return { vendorId: null, confidence: 0, evidence: [] };
  }

  let best: { vendorId: string | null; confidence: number; evidence: FieldEvidence[] } = {
    vendorId: null,
    confidence: 0,
    evidence: [],
  };

  for (const alias of data as Array<{ vendor_id: string; alias_type: string; alias_value: string; confidence: number }>) {
    const aliasValue = safeLower(alias.alias_value);
    let matched = false;
    let snippet = '';

    if (alias.alias_type === 'domain' && senderDomain === aliasValue) {
      matched = true;
      snippet = senderDomain;
    } else if (alias.alias_type === 'sender_email' && senderEmail.includes(aliasValue)) {
      matched = true;
      snippet = senderEmail;
    } else if (alias.alias_type === 'sender_name' && senderName.includes(aliasValue)) {
      matched = true;
      snippet = email.fromName;
    } else if (alias.alias_type === 'subject_anchor' && subject.includes(aliasValue)) {
      matched = true;
      snippet = normalizeWhitespace(email.subject);
    }

    if (!matched) continue;

    if (alias.confidence > best.confidence) {
      best = {
        vendorId: alias.vendor_id,
        confidence: alias.confidence,
        evidence: [{ field: 'vendor', source: alias.alias_type === 'subject_anchor' ? 'subject' : 'from', snippet, value: alias.alias_value }],
      };
    }
  }

  return best;
}
