import { NextResponse } from 'next/server';
import { apnsSender, buildBillDueSoonPayload } from '@/lib/apns/apns-sender';
import {
  deactivateApnsTokensByIds,
  listActiveApnsTokensForUser,
  markApnsTokensVerifiedByIds,
} from '@/lib/apns/token-store';
import { createAdminClient } from '@/lib/supabase/admin';
import { type Bill } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type BillRow = Pick<Bill, 'id' | 'user_id' | 'name' | 'amount' | 'due_date' | 'emoji' | 'payment_url'>;

type SentPushReminderRow = {
  bill_id: string;
};

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const cronSecretHeader = request.headers.get('x-cron-secret');
  const authHeader = request.headers.get('authorization');

  return Boolean(secret) && (cronSecretHeader === secret || authHeader === `Bearer ${secret}`);
}

function dateStringInUtc(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const today = dateStringInUtc();
    const summary = {
      sent: 0,
      users: 0,
      usersWithBills: 0,
      errors: [] as string[],
    };

    const windowStart = addDays(today, 3);
    const windowEnd = addDays(today, 7);

    const { data: billRows, error: billsError } = await supabase
      .from('bills')
      .select('id, user_id, name, amount, due_date, emoji, payment_url')
      .eq('is_paid', false)
      .gte('due_date', windowStart)
      .lte('due_date', windowEnd)
      .order('due_date', { ascending: true });

    if (billsError) {
      console.error('[send-push-reminders] Failed to load bills:', billsError);
      return NextResponse.json({ sent: 0, users: 0, errors: [billsError.message] }, { status: 500 });
    }

    const billsByUser = new Map<string, BillRow[]>();
    for (const bill of (billRows ?? []) as BillRow[]) {
      const existing = billsByUser.get(bill.user_id) ?? [];
      existing.push(bill);
      billsByUser.set(bill.user_id, existing);
    }

    summary.users = billsByUser.size;

    for (const [userId, userBills] of billsByUser.entries()) {
      summary.usersWithBills += 1;

      const [tokens, sentResult] = await Promise.all([
        listActiveApnsTokensForUser(supabase, userId),
        supabase
          .from('sent_push_reminders')
          .select('bill_id')
          .eq('user_id', userId)
          .eq('reminder_date', today),
      ]);

      if (sentResult.error) {
        summary.errors.push(`Failed fetching sent reminders for ${userId}: ${sentResult.error.message}`);
        continue;
      }

      if (tokens.length === 0) {
        continue;
      }

      const alreadySent = new Set(
        ((sentResult.data ?? []) as SentPushReminderRow[]).map((row) => row.bill_id)
      );
      const unsentBills = userBills.filter((bill) => !alreadySent.has(bill.id));

      if (unsentBills.length === 0) {
        continue;
      }

      const payload = buildBillDueSoonPayload(unsentBills);
      const invalidTokenIds: string[] = [];
      const verifiedTokenIds: string[] = [];
      let deliveredToAnyDevice = false;

      for (const token of tokens) {
        const result = await apnsSender.sendNotification({
          userId,
          tokenId: token.id,
          token: token.token,
          payload,
        });

        if (result.success) {
          deliveredToAnyDevice = true;
          verifiedTokenIds.push(token.id);
          summary.sent += 1;
          continue;
        }

        if (result.shouldDeactivateToken) {
          invalidTokenIds.push(token.id);
        }

        summary.errors.push(
          `Failed sending bill-due-soon push for ${userId} to token ${token.id}: ${result.errorCode ?? 'Unknown error'}`
        );
      }

      if (verifiedTokenIds.length > 0) {
        try {
          await markApnsTokensVerifiedByIds(supabase, userId, verifiedTokenIds);
        } catch (error) {
          summary.errors.push(
            `Failed updating APNs verification timestamps for ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      if (invalidTokenIds.length > 0) {
        try {
          await deactivateApnsTokensByIds(supabase, userId, invalidTokenIds);
        } catch (error) {
          summary.errors.push(
            `Failed deactivating invalid APNs tokens for ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      if (!deliveredToAnyDevice) {
        continue;
      }

      const reservationRows = unsentBills.map((bill) => ({
        user_id: userId,
        bill_id: bill.id,
        reminder_date: today,
      }));

      const reserveResult = await supabase
        .from('sent_push_reminders')
        .upsert(reservationRows, {
          onConflict: 'user_id,bill_id,reminder_date',
          ignoreDuplicates: true,
        });

      if (reserveResult.error) {
        summary.errors.push(`Failed recording sent push reminders for ${userId}: ${reserveResult.error.message}`);
      }
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[send-push-reminders] Cron error:', error);
    return NextResponse.json(
      { sent: 0, users: 0, errors: [error instanceof Error ? error.message : 'Internal server error'] },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    message: 'Send APNs bill-due-soon reminders for unpaid bills due in the next 3 to 7 days.',
    schedule: '15 8 * * *',
  });
}
