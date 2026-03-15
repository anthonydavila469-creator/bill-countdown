import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_USER_ID = 'a89729f6-54b4-4003-abc9-15dd7b3b69ed';

export async function GET() {
  // Verify the requesting user is admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const admin = createAdminClient();
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);
  const todayISO = todayUTC.toISOString();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  try {
    // Run all queries in parallel
    const [
      totalUsersRes,
      newUsersTodayRes,
      totalBillsRes,
      billsTodayRes,
      gmailConnectionsRes,
      activeUsersRes,
      usersListRes,
    ] = await Promise.all([
      // Total users (distinct user_id from user_preferences)
      admin.from('user_preferences').select('user_id', { count: 'exact', head: true }),

      // New users today
      admin.from('user_preferences').select('user_id', { count: 'exact', head: true })
        .gte('created_at', todayISO),

      // Total bills
      admin.from('bills').select('id', { count: 'exact', head: true }),

      // Bills added today
      admin.from('bills').select('id', { count: 'exact', head: true })
        .gte('created_at', todayISO),

      // Email connections (all providers)
      admin.from('gmail_tokens').select('id, email_provider'),

      // Active users (users with bills created in last 7 days)
      admin.from('bills').select('user_id')
        .gte('created_at', sevenDaysAgoISO),

      // Users list with bill counts and signup date
      admin.from('user_preferences').select('user_id, created_at'),
    ]);

    // Count distinct active users
    const activeUserIds = new Set(
      (activeUsersRes.data || []).map((row: { user_id: string }) => row.user_id)
    );

    // Get bill counts per user
    const { data: billCounts } = await admin.from('bills').select('user_id');
    const billCountMap: Record<string, number> = {};
    (billCounts || []).forEach((row: { user_id: string }) => {
      billCountMap[row.user_id] = (billCountMap[row.user_id] || 0) + 1;
    });

    // Build users list
    const users = (usersListRes.data || []).map((row: { user_id: string; created_at: string }) => ({
      id: row.user_id,
      billCount: billCountMap[row.user_id] || 0,
      signupDate: row.created_at,
    }));

    // Sort by signup date descending (newest first)
    users.sort((a: { signupDate: string }, b: { signupDate: string }) =>
      new Date(b.signupDate).getTime() - new Date(a.signupDate).getTime()
    );

    // Break out email connections by provider
    const emailConnections = gmailConnectionsRes.data || [];
    const emailByProvider = {
      gmail: emailConnections.filter((r: { email_provider: string }) => (r.email_provider || 'gmail') === 'gmail').length,
      yahoo: emailConnections.filter((r: { email_provider: string }) => r.email_provider === 'yahoo').length,
      outlook: emailConnections.filter((r: { email_provider: string }) => r.email_provider === 'outlook').length,
    };

    return NextResponse.json({
      totalUsers: totalUsersRes.count || 0,
      newUsersToday: newUsersTodayRes.count || 0,
      totalBills: totalBillsRes.count || 0,
      billsToday: billsTodayRes.count || 0,
      gmailConnections: emailByProvider.gmail,
      yahooConnections: emailByProvider.yahoo,
      outlookConnections: emailByProvider.outlook,
      totalEmailConnections: emailConnections.length,
      activeUsers: activeUserIds.size,
      users,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
