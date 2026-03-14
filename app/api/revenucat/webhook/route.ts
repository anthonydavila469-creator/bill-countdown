import crypto from 'node:crypto';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { applyRevenueCatWebhookEvent } from '@/lib/storekit';
import type { RevenueCatWebhookPayload } from '@/types';

export const dynamic = 'force-dynamic';

function timingSafeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isValidWebhookAuthorization(
  authorizationHeader: string | null,
  secret: string
): boolean {
  if (!authorizationHeader) {
    return false;
  }

  if (timingSafeEqual(authorizationHeader, secret)) {
    return true;
  }

  const bearerValue = authorizationHeader.startsWith('Bearer ')
    ? authorizationHeader.slice('Bearer '.length)
    : authorizationHeader;

  return timingSafeEqual(bearerValue, secret);
}

export async function POST(request: Request) {
  const webhookSecret =
    process.env.REVENUECAT_WEBHOOK_SECRET ??
    process.env.REVENUECAT_AUTHORIZATION_HEADER;

  if (!webhookSecret) {
    console.error('Missing RevenueCat webhook secret configuration');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  const headersList = await headers();
  const authorizationHeader = headersList.get('authorization');

  if (!isValidWebhookAuthorization(authorizationHeader, webhookSecret)) {
    console.error('Invalid RevenueCat webhook authorization header');
    return NextResponse.json(
      { error: 'Invalid webhook authorization' },
      { status: 401 }
    );
  }

  let payload: RevenueCatWebhookPayload;

  try {
    payload = (await request.json()) as RevenueCatWebhookPayload;
  } catch (error) {
    console.error('Failed to parse RevenueCat webhook payload:', error);
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  if (!payload?.event?.type || !payload.event.app_user_id) {
    return NextResponse.json(
      { error: 'Missing RevenueCat event payload' },
      { status: 400 }
    );
  }

  try {
    const result = await applyRevenueCatWebhookEvent(payload.event);
    return NextResponse.json({
      received: true,
      handled: result.handled,
      reason: result.reason ?? null,
    });
  } catch (error) {
    console.error('Error processing RevenueCat webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
