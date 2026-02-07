// One-time script to clear all bills for a user
// Run with: npx tsx scripts/clear-bills.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function clearBills() {
  console.log('Fetching users...\n');

  // Get all users
  const { data: { users }, error: usersError } = await adminClient.auth.admin.listUsers();

  if (usersError) {
    console.error('Error fetching users:', usersError);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('No users found');
    process.exit(0);
  }

  // Show users and their bill counts
  console.log('Users in the system:');
  for (const user of users) {
    const { count } = await adminClient
      .from('bills')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    console.log(`  - ${user.email || user.id}: ${count || 0} bills`);
  }

  // For simplicity, clear bills for ALL users (since this is likely a single-user app)
  // If you want to target a specific user, modify this logic

  for (const user of users) {
    const userId = user.id;
    console.log(`\nClearing data for user: ${user.email || userId}`);

    // 1. Delete notification queue entries
    const { error: notifError } = await adminClient
      .from('bill_notifications_queue')
      .delete()
      .eq('user_id', userId);

    if (notifError) {
      console.error('  Error deleting notifications:', notifError.message);
    } else {
      console.log('  ✓ Cleared notification queue');
    }

    // 2. Delete bill extractions
    const { error: extractError } = await adminClient
      .from('bill_extractions')
      .delete()
      .eq('user_id', userId);

    if (extractError) {
      console.error('  Error deleting bill extractions:', extractError.message);
    } else {
      console.log('  ✓ Cleared bill extractions');
    }

    // 3. Delete all bills
    const { data: deletedBills, error: billsError } = await adminClient
      .from('bills')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (billsError) {
      console.error('  Error deleting bills:', billsError.message);
    } else {
      console.log(`  ✓ Deleted ${deletedBills?.length || 0} bills`);
    }
  }

  console.log('\n✅ Done! All bill data has been cleared.');
  console.log('\nYour app should now show empty states on:');
  console.log('  - Dashboard: "No bills yet"');
  console.log('  - Insights: "No payment history yet"');
  console.log('  - Calendar: Empty');
  console.log('  - History: Empty');
}

clearBills().catch(console.error);
