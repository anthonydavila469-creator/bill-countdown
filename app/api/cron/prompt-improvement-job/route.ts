import { NextResponse } from 'next/server';

import { cronAuthGuard } from '@/lib/auth/cron-auth';
import { runPromptImprovementJob } from '@/app/cron/prompt-improvement-job';

export async function GET(request: Request) {
  const denied = cronAuthGuard(request);
  if (denied) return denied;

  const result = await runPromptImprovementJob();

  return NextResponse.json(result, {
    status: result.exitCode === 0 ? 200 : 500,
  });
}
