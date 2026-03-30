import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';

const ADMIN_USER_ID = process.env.ADMIN_USER_ID || 'a89729f6-54b4-4003-abc9-15dd7b3b69ed';

export async function GET(request: Request) {
  const { user } = await getAuthenticatedUser(request);

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
    // Fetch auth users (gets emails)
    const { data: authUsersData } = await admin.auth.admin.listUsers();
    const authUsers = authUsersData?.users || [];

    // Build email lookup
    const emailMap = new Map<string, string>();
    const providerMap = new Map<string, string>();
    const lastSignInMap = new Map<string, string>();
    authUsers.forEach((u) => {
      emailMap.set(u.id, u.email || '');
      providerMap.set(u.id, u.app_metadata?.provider || 'email');
      if (u.last_sign_in_at) {
        lastSignInMap.set(u.id, u.last_sign_in_at);
      }
    });

    const [
      totalUsersRes,
      newUsersTodayRes,
      allBillsRes,
      billsWithAmountRes,
      billsByUserRes,
      activeUsers7dRes,
      activeUsers30dRes,
      usersListRes,
      proUsersRes,
      signupsLast30Res,
      photoBillsRes,
    ] = await Promise.all([
      // Total users
      admin.from('user_preferences').select('user_id', { count: 'exact', head: true }),

      // New users today
      admin.from('user_preferences').select('user_id', { count: 'exact', head: true })
        .gte('created_at', todayISO),

      // Total bills
      admin.from('bills').select('id', { count: 'exact', head: true }),

      // Bills with amounts
      admin.from('bills').select('id', { count: 'exact', head: true })
        .not('amount', 'is', null),

      // Bills per user (for avg + per-user count)
      admin.from('bills').select('user_id, id, created_at'),

      // Active users (7d)
      admin.from('bills').select('user_id')
        .gte('created_at', sevenDaysAgoISO),

      // Active users (30d)
      admin.from('bills').select('user_id')
        .gte('created_at', thirtyDaysAgoISO),

      // Users list
      admin.from('user_preferences').select('user_id, created_at, is_pro, subscription_status'),

      // Pro subscribers
      admin.from('user_preferences').select('user_id, subscription_status')
        .eq('subscription_status', 'active'),

      // Signups last 30 days
      admin.from('user_preferences').select('user_id, created_at')
        .gte('created_at', thirtyDaysAgoISO),

      // Photo scan bills (source = 'photo_scan')
      admin.from('bills').select('id', { count: 'exact', head: true })
        .eq('source', 'photo_scan'),
    ]);

    const totalUsers = totalUsersRes.count || 0;
    const totalBills = allBillsRes.count || 0;
    const billsWithAmount = billsWithAmountRes.count || 0;
    const photoBills = photoBillsRes.count || 0;
    const manualBills = totalBills - photoBills;

    // Bills per user
    const billCountByUser = new Map<string, number>();
    const lastBillByUser = new Map<string, string>();
    (billsByUserRes.data || []).forEach((b: { user_id: string; id: string; created_at: string }) => {
      billCountByUser.set(b.user_id, (billCountByUser.get(b.user_id) || 0) + 1);
      const existing = lastBillByUser.get(b.user_id);
      if (!existing || b.created_at > existing) {
        lastBillByUser.set(b.user_id, b.created_at);
      }
    });

    const avgBillsPerUser = totalUsers > 0 ? Math.round((totalBills / totalUsers) * 10) / 10 : 0;

    // Distinct active users
    const activeUserIds7d = new Set(
      (activeUsers7dRes.data || []).map((r: { user_id: string }) => r.user_id)
    );
    const activeUserIds30d = new Set(
      (activeUsers30dRes.data || []).map((r: { user_id: string }) => r.user_id)
    );

    // Revenue
    const proUsers = (proUsersRes.data || []).length;
    const conversionRate = totalUsers > 0 ? ((proUsers / totalUsers) * 100) : 0;
    // Estimated MRR: assume $3.99/mo per pro user
    const estimatedMRR = proUsers * 3.99;

    // Retention
    const retentionCandidates = (usersListRes.data || []).filter((u: { created_at: string }) => {
      const signup = new Date(u.created_at);
      return signup < sevenDaysAgo && signup >= thirtyDaysAgo;
    });
    const retainedUsers = retentionCandidates.filter((u: { user_id: string }) => activeUserIds7d.has(u.user_id));
    const retentionRate = retentionCandidates.length > 0
      ? ((retainedUsers.length / retentionCandidates.length) * 100)
      : 0;

    // Daily signups chart
    const dailySignups: Record<string, number> = {};
    (signupsLast30Res.data || []).forEach((r: { created_at: string }) => {
      const day = r.created_at.substring(0, 10);
      dailySignups[day] = (dailySignups[day] || 0) + 1;
    });

    // Bill success rate
    const scanSuccessRate = totalBills > 0 ? ((billsWithAmount / totalBills) * 100) : 0;

    // Users list with real details
    const users = (usersListRes.data || []).map((row: { user_id: string; created_at: string; is_pro: boolean; subscription_status: string }) => ({
      id: row.user_id,
      email: emailMap.get(row.user_id) || 'unknown',
      signupDate: row.created_at,
      authProvider: providerMap.get(row.user_id) || 'email',
      lastSignIn: lastSignInMap.get(row.user_id) || null,
      isActive: activeUserIds7d.has(row.user_id),
      isPro: row.subscription_status === 'active',
      billCount: billCountByUser.get(row.user_id) || 0,
      lastBillDate: lastBillByUser.get(row.user_id) || null,
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
      retentionRate30d: Math.round(retentionRate * 10) / 10,

      // Engagement
      totalBills,
      avgBillsPerUser,
      photoBills,
      manualBills,
      scanSuccessRate: Math.round(scanSuccessRate * 10) / 10,

      // Revenue
      proSubscribers: proUsers,
      conversionRate: Math.round(conversionRate * 10) / 10,
      estimatedMRR: Math.round(estimatedMRR * 100) / 100,

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
