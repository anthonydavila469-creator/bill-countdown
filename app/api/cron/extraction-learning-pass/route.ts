import { NextResponse } from 'next/server';

import { runExtractionLearningPass } from '@/app/cron/extraction-learning-pass';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runExtractionLearningPass();

  return NextResponse.json(result, {
    status: result.exitCode === 0 ? 200 : 500,
  });
}
