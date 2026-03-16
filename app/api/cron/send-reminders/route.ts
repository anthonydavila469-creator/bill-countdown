import { NextResponse } from 'next/server';
import { sendDueDateReminders } from '@/lib/notifications/send-reminders';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const cronSecretHeader = request.headers.get('x-cron-secret');
  const authHeader = request.headers.get('authorization');

  return Boolean(secret) && (cronSecretHeader === secret || authHeader === `Bearer ${secret}`);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendDueDateReminders();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[send-reminders] Cron error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    message: 'Send reminder emails for bills matching each user remind_me preference.',
    schedule: '0 8 * * *',
  });
}
