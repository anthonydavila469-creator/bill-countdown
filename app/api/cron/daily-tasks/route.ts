import { NextResponse } from 'next/server';

/**
 * POST /api/cron/daily-tasks
 * Combined daily cron job that runs reminders + auto-sync
 * Runs at 8am UTC daily (Hobby plan limits to 1 cron job)
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

    if (!authHeader || authHeader !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duezo.app';
    const results: { reminders?: unknown; autoSync?: unknown; errors: string[] } = {
      errors: [],
    };

    // Run bill reminders
    try {
      const remindersRes = await fetch(`${baseUrl}/api/cron/send-bill-reminders`, {
        method: 'POST',
        headers: { authorization: authHeader },
      });
      results.reminders = await remindersRes.json();
    } catch (error) {
      results.errors.push(`Reminders failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Run auto-sync
    try {
      const syncRes = await fetch(`${baseUrl}/api/cron/auto-sync-bills`, {
        method: 'POST',
        headers: { authorization: authHeader },
      });
      results.autoSync = await syncRes.json();
    } catch (error) {
      results.errors.push(`Auto-sync failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('[DAILY-TASKS] Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    message: 'Daily tasks cron - combines reminders + auto-sync',
    schedule: '0 8 * * * (8am UTC daily)',
  });
}
