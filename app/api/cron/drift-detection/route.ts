import { NextResponse } from 'next/server';
import { runDriftDetection } from '@/lib/parser/learning/drift';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await runDriftDetection();
    return NextResponse.json({
      processed: results.length,
      highSeverity: results.filter((result) => result.severity === 'high'),
      mediumSeverity: results.filter((result) => result.severity === 'medium'),
    });
  } catch (error) {
    console.error('[DRIFT-CRON] Failed to run drift detection', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
