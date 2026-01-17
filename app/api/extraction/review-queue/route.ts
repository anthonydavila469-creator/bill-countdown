import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import {
  getReviewQueue,
  confirmExtraction,
  rejectExtraction,
} from '@/lib/bill-extraction';

/**
 * GET /api/extraction/review-queue
 * Get items in the review queue
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query params
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    const items = await getReviewQueue(user.id, limit);

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Review queue error:', error);
    return NextResponse.json(
      { error: 'Failed to get review queue' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/extraction/review-queue
 * Confirm or reject an extraction
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    if (!body.extractionId) {
      return NextResponse.json(
        { error: 'Missing extractionId' },
        { status: 400 }
      );
    }

    if (!body.action || !['confirm', 'reject'].includes(body.action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "confirm" or "reject"' },
        { status: 400 }
      );
    }

    if (body.action === 'confirm') {
      const result = await confirmExtraction(
        user.id,
        body.extractionId,
        body.corrections
      );
      return NextResponse.json(result);
    } else {
      const result = await rejectExtraction(user.id, body.extractionId);
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Review action error:', error);
    return NextResponse.json(
      { error: 'Failed to process review action' },
      { status: 500 }
    );
  }
}
