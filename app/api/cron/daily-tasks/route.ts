import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateInAppReminders } from '@/lib/notifications/generate-reminders';
import type { Bill } from '@/types';

/**
 * POST /api/cron/daily-tasks
 * Combined daily cron job that runs reminders + in-app feed generation.
 * Runs at 8am UTC daily (Hobby plan limits to 1 cron job).
 *
 * Note: mailbox auto-sync was removed here — email scanning is not part of the
 * current Duezo product (owner decision 2026-06-14). See
 * audits/EMAIL_PRIVACY_READINESS.md.
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

    if (!authHeader || authHeader !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: { reminders?: unknown; inAppReminders?: unknown; errors: string[] } = {
      errors: [],
    };

    // Run bill reminders
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.duezo.app';
      const remindersRes = await fetch(`${baseUrl}/api/cron/send-bill-reminders`, {
        method: 'POST',
        headers: { authorization: authHeader },
      });
      results.reminders = await remindersRes.json();
    } catch (error) {
      results.errors.push(`Reminders failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Generate in-app reminder notifications for all users with upcoming bills
    try {
      const supabase = createAdminClient();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 8);

      const { data: upcomingBills } = await supabase
        .from('bills')
        .select('*')
        .eq('is_paid', false)
        .lte('due_date', sevenDaysFromNow.toISOString().split('T')[0])
        .gte('due_date', new Date().toISOString().split('T')[0]);

      if (upcomingBills && upcomingBills.length > 0) {
        const billsByUser = new Map<string, Bill[]>();
        for (const bill of upcomingBills as Bill[]) {
          const userBills = billsByUser.get(bill.user_id) || [];
          userBills.push(bill);
          billsByUser.set(bill.user_id, userBills);
        }

        let totalCreated = 0;
        for (const [userId, bills] of billsByUser) {
          const { created } = await generateInAppReminders(supabase, bills, userId);
          totalCreated += created;
        }
        results.inAppReminders = { usersProcessed: billsByUser.size, created: totalCreated };
      } else {
        results.inAppReminders = { usersProcessed: 0, created: 0 };
      }
    } catch (error) {
      results.errors.push(`In-app reminders failed: ${error instanceof Error ? error.message : 'Unknown'}`);
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
    message: 'Daily tasks cron - combines reminders + in-app feed generation',
    schedule: '0 8 * * * (8am UTC daily)',
  });
}
