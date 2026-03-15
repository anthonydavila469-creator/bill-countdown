import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_USER_ID = 'a89729f6-54b4-4003-abc9-15dd7b3b69ed';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);
  const todayISO = todayUTC.toISOString();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

  try {
    const [
      totalUsersRes,
      newUsersTodayRes,
      emailConnectionsRes,
      activeUsers7dRes,
      usersListRes,
      proUsersRes,
      scanRunsRes,
      scanSuccessRes,
      signupsLast30Res,
      activeUsers30dRes,
    ] = await Promise.all([
      // Total users
      admin.from('user_preferences').select('user_id', { count: 'exact', head: true }),

      // New users today
      admin.from('user_preferences').select('user_id', { count: 'exact', head: true })
        .gte('created_at', todayISO),

      // Email connections (all providers)
      admin.from('gmail_tokens').select('id, email_provider'),

      // Active users (7d) — users who logged in or added bills recently
      admin.from('bills').select('user_id')
        .gte('created_at', sevenDaysAgoISO),

      // Users list with signup date
      admin.from('user_preferences').select('user_id, created_at, notification_settings'),

      // Pro subscribers (users with subscription_status = active)
      admin.from('user_preferences').select('user_id, subscription_status')
        .eq('subscription_status', 'active'),

      // Total scan runs (email parse attempts)
      admin.from('email_parse_runs')
        .select('id', { count: 'exact', head: true })
        .catch(() => ({ count: 0, data: null, error: null })),

      // Successful scans (accepted decisions)
      admin.from('email_parse_runs')
        .select('id', { count: 'exact', head: true })
        .eq('decision', 'accept')
        .catch(() => ({ count: 0, data: null, error: null })),

      // Signups last 30 days (for growth chart)
      admin.from('user_preferences').select('user_id, created_at')
        .gte('created_at', thirtyDaysAgoISO),

      // Active users 30d
      admin.from('bills').select('user_id')
        .gte('created_at', thirtyDaysAgoISO),
    ]);

    // Distinct active users 7d
    const activeUserIds7d = new Set(
      (activeUsers7dRes.data || []).map((r: { user_id: string }) => r.user_id)
    );

    // Distinct active users 30d
    const activeUserIds30d = new Set(
      (activeUsers30dRes.data || []).map((r: { user_id: string }) => r.user_id)
    );

    // Email provider breakdown
    const emailConnections = emailConnectionsRes.data || [];
    const emailByProvider = {
      gmail: emailConnections.filter((r: { email_provider: string }) => (r.email_provider || 'gmail') === 'gmail').length,
      yahoo: emailConnections.filter((r: { email_provider: string }) => r.email_provider === 'yahoo').length,
      outlook: emailConnections.filter((r: { email_provider: string }) => r.email_provider === 'outlook').length,
    };

    const totalUsers = totalUsersRes.count || 0;
    const proUsers = (proUsersRes.data || []).length;
    const conversionRate = totalUsers > 0 ? ((proUsers / totalUsers) * 100) : 0;

    // Scan success rate
    const totalScans = (scanRunsRes as { count: number }).count || 0;
    const successfulScans = (scanSuccessRes as { count: number }).count || 0;
    const scanSuccessRate = totalScans > 0 ? ((successfulScans / totalScans) * 100) : 0;

    // 30d retention: users who signed up 8-30 days ago AND were active in last 7 days
    const retentionCandidates = (usersListRes.data || []).filter((u: { created_at: string }) => {
      const signup = new Date(u.created_at);
      return signup < sevenDaysAgo && signup >= thirtyDaysAgo;
    });
    const retainedUsers = retentionCandidates.filter((u: { user_id: string }) => activeUserIds7d.has(u.user_id));
    const retentionRate = retentionCandidates.length > 0
      ? ((retainedUsers.length / retentionCandidates.length) * 100)
      : 0;

    // Daily signups for last 30 days (for sparkline/chart)
    const dailySignups: Record<string, number> = {};
    (signupsLast30Res.data || []).forEach((r: { created_at: string }) => {
      const day = r.created_at.substring(0, 10);
      dailySignups[day] = (dailySignups[day] || 0) + 1;
    });

    // Build users list with email connection status
    const connectedUserIds = new Set(
      emailConnections.map((r: { id: string }) => r.id)
    );
    const users = (usersListRes.data || []).map((row: { user_id: string; created_at: string; notification_settings: unknown }) => ({
      id: row.user_id,
      signupDate: row.created_at,
      isActive: activeUserIds7d.has(row.user_id),
      hasEmail: connectedUserIds.has(row.user_id),
    }));
    users.sort((a: { signupDate: string }, b: { signupDate: string }) =>
      new Date(b.signupDate).getTime() - new Date(a.signupDate).getTime()
    );

    return NextResponse.json({
      // Growth
      totalUsers,
      newUsersToday: newUsersTodayRes.count || 0,
      activeUsers7d: activeUserIds7d.size,
      activeUsers30d: activeUserIds30d.size,

      // Revenue
      proSubscribers: proUsers,
      conversionRate: Math.round(conversionRate * 10) / 10,

      // Retention
      retentionRate30d: Math.round(retentionRate * 10) / 10,

      // Email
      totalEmailConnections: emailConnections.length,
      emailByProvider,

      // Product health
      scanSuccessRate: Math.round(scanSuccessRate * 10) / 10,
      totalScans,

      // Charts
      dailySignups,

      // Users
      users,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
