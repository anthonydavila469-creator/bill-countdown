/**
 * POST /api/pay-later/scan
 *
 * Dedicated Pay Later screenshot scanner. Accepts 1–8 images from the
 * iOS client, runs Claude Sonnet 4.6 with tool-use forcing, validates
 * the structured output, persists a telemetry row, and returns the
 * validated plan.
 *
 * This is intentionally separate from /api/bills/scan — bills and
 * Pay Later have very different layouts, and a dedicated extractor
 * with vision-on-images (not OCR-text-post-processing) is significantly
 * more reliable for BNPL screenshots.
 *
 * Request body:
 *   {
 *     images: string[],    // 1..8 "data:image/...;base64,..." data URLs
 *     timezone: string,    // e.g. "America/Chicago"
 *     currentDate: string  // YYYY-MM-DD in the user's local timezone
 *   }
 *
 * Response: 200 with the validated PayLaterScanResult, plus `scanStatus`
 * and `scanAttemptId`. Never 500 on extraction failure — returns
 * `scanStatus: "unreadable"` with warnings instead so the iOS client
 * always lands on a usable surface.
 */

import { NextResponse } from 'next/server';
import {
  createBearerSupabaseClient,
  getAuthenticatedUser,
} from '@/lib/auth/get-authenticated-user';
import { isRateLimited } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import {
  PAY_LATER_SCANNER_VERSION,
  PAY_LATER_VISION_MODEL,
  scanPayLaterPlan,
  type PayLaterImage,
  type PayLaterScanResult,
} from '@/lib/pay-later-vision';
import {
  PAY_LATER_VALIDATOR_VERSION,
  validatePayLaterScan,
  type ValidatedPayLaterScanResult,
} from '@/lib/pay-later-validator';

const MAX_IMAGES_PER_SCAN = 8;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    const { user, method } = auth;
    const supabase = method === 'bearer' ? createBearerSupabaseClient(auth) : await createClient();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isRateLimited(`pay-later-scan:${user.id}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = (await request.json()) as Record<string, unknown> | null;
    const images = Array.isArray(body?.images) ? (body!.images as unknown[]) : [];
    const timezone = typeof body?.timezone === 'string' ? body!.timezone : 'UTC';
    const currentDate =
      typeof body?.currentDate === 'string' ? body!.currentDate : todayLocal();
    // Optional on-device OCR text. When the client sends usable text it may
    // omit the image(s) entirely — the scanner takes the faster text path.
    const ocrText = typeof body?.ocrText === 'string' ? body!.ocrText : null;
    const hasOcrText = !!ocrText && ocrText.trim().length > 0;

    if (images.length === 0 && !hasOcrText) {
      return NextResponse.json(
        { error: 'images (1–8 data URLs) or ocrText is required' },
        { status: 400 },
      );
    }
    if (images.length > MAX_IMAGES_PER_SCAN) {
      return NextResponse.json(
        { error: `images may contain at most ${MAX_IMAGES_PER_SCAN} entries` },
        { status: 400 },
      );
    }

    const screenshots: PayLaterImage[] = [];
    for (const img of images) {
      if (typeof img !== 'string') {
        return NextResponse.json({ error: 'images must be base64 data URLs' }, { status: 400 });
      }
      // Coarse byte check on the base64 payload so we don't ship the
      // image to Anthropic only to bounce off their 5MB limit.
      const base64Part = img.split(',', 2)[1] ?? '';
      if (base64Part.length > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: 'image too large (max 5MB)' }, { status: 400 });
      }
      screenshots.push({ dataURL: img });
    }

    const scanResult = await scanPayLaterPlan({
      userId: user.id,
      screenshots,
      timezone,
      currentDate,
      ocrText,
    });

    let raw: PayLaterScanResult;
    let visionError: string | null = null;
    let latencyMs = 0;

    if (scanResult.ok) {
      raw = scanResult.raw;
      latencyMs = scanResult.latencyMs;
    } else {
      visionError = `${scanResult.reason}: ${scanResult.message}`;
      raw = unreadableFallback(visionError);
    }

    const validated: ValidatedPayLaterScanResult = validatePayLaterScan(raw);

    // Persist a telemetry row. RAW IMAGES ARE NOT STORED — Phase 13
    // privacy rule: keep only structured/validated output unless the
    // user has explicitly opted in (opt-in flow is deferred to a
    // follow-up turn). `image_count` lets us track how many
    // screenshots people typically submit per scan without keeping
    // the bytes.
    const attemptId = await insertScanAttempt(supabase, {
      userId: user.id,
      validated,
      imageCount: screenshots.length,
      latencyMs,
      visionError,
      sourceType: validated.sourceType,
      providerNormalized: validated.providerNormalized,
    });

    // `...validated` already carries `model` + `scanVersion` +
    // `validatorVersion` — don't re-specify them here or TypeScript
    // flags them as duplicate keys.
    return NextResponse.json({
      scanAttemptId: attemptId,
      ...validated,
    });
  } catch (error) {
    console.error('Pay Later scan route error:', error);
    // Never throw a 500 to the iOS client — return the unreadable
    // shape so the review sheet always opens.
    const fallback = validatePayLaterScan(
      unreadableFallback(
        error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error',
      ),
    );
    return NextResponse.json({
      scanAttemptId: null,
      ...fallback,
    });
  }
}

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function unreadableFallback(visionError: string): PayLaterScanResult {
  return {
    scanVersion: PAY_LATER_SCANNER_VERSION,
    model: PAY_LATER_VISION_MODEL,
    sourceType: 'unknown',
    providerName: null,
    providerNormalized: null,
    merchantName: null,
    planName: null,
    orderNumber: null,
    totalPlanAmountCents: null,
    paidToDateCents: null,
    remainingBalanceCents: null,
    nextPaymentAmountCents: null,
    nextPaymentDate: null,
    paymentMethodBrand: null,
    paymentMethodLast4: null,
    installments: [],
    confidence: 0,
    needsReview: true,
    missingFields: ['merchantName', 'totalPlanAmount', 'nextPaymentDate'],
    warnings: [`vision_failed: ${visionError}`],
    evidenceSummary: '',
  };
}

interface InsertScanAttemptArgs {
  userId: string;
  validated: ValidatedPayLaterScanResult;
  imageCount: number;
  latencyMs: number;
  visionError: string | null;
  sourceType: string | null;
  providerNormalized: string | null;
}

async function insertScanAttempt(
  supabase: Awaited<ReturnType<typeof createClient>>,
  args: InsertScanAttemptArgs,
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('scan_attempts')
      .insert({
        user_id: args.userId,
        scanner_version: PAY_LATER_SCANNER_VERSION,
        validator_version: PAY_LATER_VALIDATOR_VERSION,
        // Actual model used — vision (Sonnet) or the OCR fast path (Haiku).
        model: args.validated.model,
        source_type: args.sourceType,
        provider_normalized: args.providerNormalized,
        confidence: args.validated.confidence,
        scan_status: args.validated.scanStatus,
        needs_review: args.validated.needsReview,
        warnings: args.validated.warnings,
        missing_fields: args.validated.missingFields,
        image_count: args.imageCount,
        latency_ms: args.latencyMs,
        vision_error: args.visionError,
        // Validated structured output stored as JSONB — useful for
        // diff-against-corrections in the follow-up self-improvement
        // turn. NEVER store raw image bytes.
        validated_output: args.validated,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('[pay-later/scan] insert scan_attempts failed:', error);
      return null;
    }
    return data.id as string;
  } catch (insertError) {
    console.error('[pay-later/scan] insert scan_attempts threw:', insertError);
    return null;
  }
}
