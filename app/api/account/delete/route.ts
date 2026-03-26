import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rate-limit';

// DELETE /api/account/delete - Permanently delete user account and all data
export async function DELETE(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Rate limit: max 1 request per minute per user
    if (isRateLimited(`delete-account:${userId}`, 1, 60_000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429 }
      );
    }

    // Require confirmation: user must re-authenticate by providing current password
    let confirmPassword: string | null = null;
    try {
      const body = await request.json();
      confirmPassword = body.confirm_password ?? null;
    } catch {
      // no body
    }

    if (!confirmPassword) {
      return NextResponse.json(
        { error: 'Confirmation required. Please provide your password to delete your account.', requires_confirmation: true },
        { status: 400 }
      );
    }

    // Verify password by attempting sign-in
    const adminClient = createAdminClient();
    const { error: signInError } = await adminClient.auth.signInWithPassword({
      email: user.email!,
      password: confirmPassword,
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Incorrect password. Account deletion denied.' },
        { status: 403 }
      );
    }

    // Use admin client to bypass RLS and delete all user data
    // Delete all user data from all tables (order matters for foreign keys)
    // 1. Delete notification queue entries (references bills)
    const { error: notifError } = await adminClient
      .from('bill_notifications_queue')
      .delete()
      .eq('user_id', userId);

    if (notifError) {
      console.error('Error deleting notifications:', notifError);
    }

    // 2. Delete push subscriptions
    const { error: pushError } = await adminClient
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (pushError) {
      console.error('Error deleting push subscriptions:', pushError);
    }

    // 3. Delete bill extractions (references bills)
    const { error: extractError } = await adminClient
      .from('bill_extractions')
      .delete()
      .eq('user_id', userId);

    if (extractError) {
      console.error('Error deleting bill extractions:', extractError);
    }

    // 4. Delete bills
    const { error: billsError } = await adminClient
      .from('bills')
      .delete()
      .eq('user_id', userId);

    if (billsError) {
      console.error('Error deleting bills:', billsError);
    }

    // 5. Delete raw emails
    const { error: emailsError } = await adminClient
      .from('emails_raw')
      .delete()
      .eq('user_id', userId);

    if (emailsError) {
      console.error('Error deleting emails:', emailsError);
    }

    // 6. Delete Gmail tokens
    const { error: tokensError } = await adminClient
      .from('gmail_tokens')
      .delete()
      .eq('user_id', userId);

    if (tokensError) {
      console.error('Error deleting Gmail tokens:', tokensError);
    }

    // 7. Delete user preferences
    const { error: prefsError } = await adminClient
      .from('user_preferences')
      .delete()
      .eq('user_id', userId);

    if (prefsError) {
      console.error('Error deleting user preferences:', prefsError);
    }

    // 8. Finally, delete the auth user
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      return NextResponse.json(
        { error: 'Failed to delete account. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Unexpected error deleting account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
