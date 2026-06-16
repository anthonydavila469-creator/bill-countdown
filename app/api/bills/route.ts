import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createBearerSupabaseClient, getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { scheduleNotificationsForBillWithSettings } from '@/lib/notifications/scheduler';
import { generateInAppReminders } from '@/lib/notifications/generate-reminders';
import { getFallbackPaymentUrl } from '@/lib/vendor-payment-urls';
import { isRateLimited } from '@/lib/rate-limit';
import type { Bill } from '@/types';

// GET /api/bills - Get all bills for the current user
export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    const { user, method } = auth;
    const supabase = method === 'bearer' ? createBearerSupabaseClient(auth) : await createClient();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query params for filtering
    const { searchParams } = new URL(request.url);
    const showPaid = searchParams.get('showPaid') === 'true';
    const category = searchParams.get('category');

    // Build query
    let query = supabase
      .from('bills')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });

    // Filter by paid status
    if (!showPaid) {
      query = query.eq('is_paid', false);
    }

    // Filter by category
    if (category) {
      query = query.eq('category', category);
    }

    const { data: bills, error } = await query;

    if (error) {
      console.error('Error fetching bills:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bills' },
        { status: 500 }
      );
    }

    // Apply fallback payment URLs in-memory only (no writes on GET)
    // Use POST /api/bills/backfill-payment-urls to persist updates
    if (bills && bills.length > 0) {
      for (const bill of bills) {
        const fallbackUrl = getFallbackPaymentUrl(bill.name);
        if (fallbackUrl && bill.payment_url !== fallbackUrl) {
          bill.payment_url = fallbackUrl;
        }
      }
    }

    return NextResponse.json(bills);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/bills - Create a new bill
export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    const { user, method } = auth;
    const supabase = method === 'bearer' ? createBearerSupabaseClient(auth) : await createClient();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.due_date) {
      return NextResponse.json(
        { error: 'Name and due date are required' },
        { status: 400 }
      );
    }

    // Create bill
    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      name: body.name,
      amount: body.amount || null,
      due_date: body.due_date,
      emoji: body.emoji || '📄',
      category: body.category || null,
      is_recurring: body.is_recurring || false,
      recurrence_interval: body.recurrence_interval || null,
      recurrence_day_of_month: body.recurrence_day_of_month || null,
      recurrence_weekday: body.recurrence_weekday || null,
      notes: body.notes || null,
      payment_url: body.payment_url || getFallbackPaymentUrl(body.name) || null,
      is_autopay: body.is_autopay || false,
      source: body.source || 'manual',
      gmail_message_id: body.gmail_message_id || null,
      is_variable: body.is_variable || false,
      typical_min: body.typical_min || null,
      typical_max: body.typical_max || null,
      icon_key: body.icon_key || null,
    };

    // v2 bill-identity fields — included ONLY when the client actually
    // sends them, so the insert never references an identity column on
    // a Supabase project that hasn't run the identity migration yet.
    // (The `.select()` below echoes back whatever was stored.)
    const IDENTITY_KEYS = [
      'vendor_brand', 'vendor_legal_name', 'bill_display_name', 'account_type',
      'service_category', 'account_identifier_last4', 'account_nickname',
      'service_address', 'bill_account_key', 'identity_confidence',
      'source_document_type', 'payment_status', 'minimum_due',
      'statement_balance', 'document_type', 'raw_source_text', 'detected_subject_text',
    ] as const;
    for (const key of IDENTITY_KEYS) {
      if (body[key] !== undefined && body[key] !== null) {
        insertPayload[key] = body[key];
      }
    }

    const { data: bill, error } = await supabase
      .from('bills')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Error creating bill:', error);
      return NextResponse.json(
        { error: 'Failed to create bill' },
        { status: 500 }
      );
    }

    // Schedule notifications for the new bill (fire and forget)
    if (bill) {
      scheduleNotificationsForBillWithSettings(bill as Bill).catch(err => {
        console.error('Failed to schedule notifications for new bill:', err);
      });

      // Generate in-app reminder notifications
      generateInAppReminders(supabase, [bill as Bill], user.id).catch(err => {
        console.error('Failed to generate in-app reminders:', err);
      });
    }

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
