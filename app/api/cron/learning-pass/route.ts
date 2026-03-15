import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateCandidateTemplates } from '@/lib/parser/learning/candidates';
import { evaluateCandidateForPromotion } from '@/lib/parser/learning/promotion';
import type { CandidateTemplate, LearningPassSummary } from '@/types/learning';

interface LearningEventRow {
  vendor_id: string;
  user_id: string;
  created_at: string;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const vendorUserPairs = await findVendorUserPairsWithNewLearning();
    const generatedTemplates: CandidateTemplate[] = [];

    for (const pair of vendorUserPairs) {
      const created = await generateCandidateTemplates(pair.vendorId, pair.userId);
      generatedTemplates.push(...created);
    }

    const promotableCandidates = await findCandidatesReadyForPromotion();
    const promotions = [];

    for (const candidate of promotableCandidates) {
      promotions.push(await evaluateCandidateForPromotion(candidate.id));
    }

    const summary: LearningPassSummary = {
      generatedCandidates: generatedTemplates.length,
      generatedTemplateIds: generatedTemplates.map((template) => template.id),
      promotions,
      vendorsProcessed: vendorUserPairs.length,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[LEARNING-PASS] Failed to run learning pass', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

async function findVendorUserPairsWithNewLearning(): Promise<Array<{ vendorId: string; userId: string }>> {
  const admin = createAdminClient();
  const { data: events, error: eventsError } = await admin
    .from('learning_events')
    .select('vendor_id, user_id, created_at');

  if (eventsError) {
    throw new Error(`Failed to load learning events: ${eventsError.message}`);
  }

  const { data: candidates, error: candidatesError } = await admin
    .from('vendor_templates')
    .select('vendor_id, owner_user_id, updated_at')
    .eq('scope', 'local')
    .eq('source', 'learned');

  if (candidatesError) {
    throw new Error(`Failed to load learned templates: ${candidatesError.message}`);
  }

  const lastPassByPair = new Map<string, string>();
  for (const candidate of candidates || []) {
    if (!candidate.owner_user_id) continue;
    const key = `${candidate.vendor_id}:${candidate.owner_user_id}`;
    const current = lastPassByPair.get(key);
    if (!current || candidate.updated_at > current) {
      lastPassByPair.set(key, candidate.updated_at);
    }
  }

  const counts = new Map<string, number>();
  for (const event of (events || []) as LearningEventRow[]) {
    const key = `${event.vendor_id}:${event.user_id}`;
    const lastPass = lastPassByPair.get(key);
    if (lastPass && event.created_at <= lastPass) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 5)
    .map(([key]) => {
      const [vendorId, userId] = key.split(':');
      return { vendorId, userId };
    });
}

async function findCandidatesReadyForPromotion(): Promise<CandidateTemplate[]> {
  const admin = createAdminClient();
  const { data: candidates, error } = await admin
    .from('vendor_templates')
    .select('*')
    .eq('status', 'candidate')
    .eq('source', 'learned');

  if (error) {
    throw new Error(`Failed to load candidate templates: ${error.message}`);
  }

  const { data: shadowRuns, error: shadowError } = await admin
    .from('template_shadow_runs')
    .select('candidate_template_id');

  if (shadowError) {
    throw new Error(`Failed to load shadow runs: ${shadowError.message}`);
  }

  const counts = new Map<string, number>();
  for (const row of shadowRuns || []) {
    counts.set(row.candidate_template_id, (counts.get(row.candidate_template_id) || 0) + 1);
  }

  return ((candidates || []) as CandidateTemplate[]).filter((candidate) => (counts.get(candidate.id) || 0) >= 5);
}
