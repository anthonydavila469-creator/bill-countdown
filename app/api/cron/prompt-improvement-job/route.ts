import { NextResponse } from 'next/server';

import { runPromptImprovementJob } from '@/app/cron/prompt-improvement-job';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runPromptImprovementJob();

  return NextResponse.json(result, {
    status: result.exitCode === 0 ? 200 : 500,
  });
}
