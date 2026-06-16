import { NextResponse } from 'next/server';

import { cronAuthGuard } from '@/lib/auth/cron-auth';
import { runExtractionLearningPass } from '@/app/cron/extraction-learning-pass';

export async function GET(request: Request) {
  const denied = cronAuthGuard(request);
  if (denied) return denied;

  const result = await runExtractionLearningPass();

  return NextResponse.json(result, {
    status: result.exitCode === 0 ? 200 : 500,
  });
}
