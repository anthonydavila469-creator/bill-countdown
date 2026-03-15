import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { dismissBillReview, listPendingBillReviews, resolveBillReview } from '@/lib/parser/reviewQueue';

export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') || '50'), 100);
    const reviews = await listPendingBillReviews(user.id, Number.isFinite(limit) ? limit : 50);

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('Bill review GET failed:', error);
    return NextResponse.json({ error: 'Failed to load bill reviews' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    if (!body.reviewId) {
      return NextResponse.json({ error: 'Missing reviewId' }, { status: 400 });
    }

    if (body.action === 'dismiss') {
      await dismissBillReview({ userId: user.id, reviewId: body.reviewId });
      return NextResponse.json({ success: true, reviewId: body.reviewId, status: 'dismissed' });
    }

    const correctedFields = body.correctedFields || {};
    const result = await resolveBillReview({
      userId: user.id,
      reviewId: body.reviewId,
      correctedFields,
    });

    return NextResponse.json({ success: true, ...result, status: 'resolved' });
  } catch (error) {
    console.error('Bill review POST failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve bill review' },
      { status: 500 },
    );
  }
}
