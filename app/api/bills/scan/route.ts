import { NextResponse } from 'next/server';
import { createBearerSupabaseClient, getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { isRateLimited } from '@/lib/rate-limit';
import { logScanError } from '@/lib/scan-error-codes';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';
import { classifyDocument } from '@/lib/bill-classifier';
import {
  buildAmountCandidates,
  buildDueDateCandidates,
  type ClaudeScanResult,
  resolveAmount,
  resolveDueDate,
} from '@/lib/bill-scan-ranker';
import { buildBillScanV2, mapSourceDocumentType, wantsV2Response } from '@/lib/bill-scan-v2';
import {
  BILL_SCAN_V2_PROMPT,
  mapClaudeV2ToBillScanV2,
  parseBillScanV2Claude,
} from '@/lib/bill-scan-v2-extract';
import { postProcessBillScanV2 } from '@/lib/bill-scan-v2-postprocess';
import {
  chargeSmartScanUsageEvent,
  finishChargedSmartScanUsageEvent,
  releaseSmartScanUsageEvent,
  reserveSmartScanUsage,
  type SmartScanUsageEventRow,
} from '@/lib/smart-scans/usage';
import {
  classifyAndExtractPayLater,
  parseScanPurpose,
  wantsV3Response,
} from '@/lib/pay-later-scan';

function hasExplicitYear(input?: string | null) {
  if (!input) return false;
  return /\b(19\d{2}|20\d{2})\b/.test(input);
}

function reconcileAmbiguousYear(isoDate: string | null, now = new Date()) {
  if (!isoDate) return null;
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;

  const base = new Date(now);
  base.setHours(0, 0, 0, 0);

  const month = parsed.getMonth();
  const day = parsed.getDate();
  const currentYearCandidate = new Date(base.getFullYear(), month, day);
  const nextYearCandidate = new Date(base.getFullYear() + 1, month, day);

  const currentIso = `${currentYearCandidate.getFullYear()}-${String(currentYearCandidate.getMonth() + 1).padStart(2, '0')}-${String(currentYearCandidate.getDate()).padStart(2, '0')}`;
  const nextIso = `${nextYearCandidate.getFullYear()}-${String(nextYearCandidate.getMonth() + 1).padStart(2, '0')}-${String(nextYearCandidate.getDate()).padStart(2, '0')}`;

  const currentDelta = Math.round((currentYearCandidate.getTime() - base.getTime()) / 86400000);
  const nextDelta = Math.round((nextYearCandidate.getTime() - base.getTime()) / 86400000);

  if (currentDelta >= -45 && currentDelta <= 330) {
    return currentIso;
  }

  if (nextDelta >= 0) {
    return nextIso;
  }

  return isoDate;
}

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const BILL_SCANS_BUCKET = 'bill-scans';

function getFileExtension(mediaType: string) {
  switch (mediaType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    default:
      return 'bin';
  }
}

function getImageDimensions(buffer: Buffer, mediaType: string) {
  try {
    if (mediaType === 'image/png' && buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
      };
    }

    if (mediaType === 'image/gif' && buffer.length >= 10 && buffer.toString('ascii', 0, 3) === 'GIF') {
      return {
        width: buffer.readUInt16LE(6),
        height: buffer.readUInt16LE(8),
      };
    }

    if (mediaType === 'image/webp' && buffer.length >= 30 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
      const chunkType = buffer.toString('ascii', 12, 16);

      if (chunkType === 'VP8X' && buffer.length >= 30) {
        return {
          width: 1 + buffer.readUIntLE(24, 3),
          height: 1 + buffer.readUIntLE(27, 3),
        };
      }
    }

    if (mediaType === 'image/jpeg' && buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;

      while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) {
          offset += 1;
          continue;
        }

        const marker = buffer[offset + 1];
        const size = buffer.readUInt16BE(offset + 2);

        if (
          marker >= 0xc0 &&
          marker <= 0xcf &&
          marker !== 0xc4 &&
          marker !== 0xc8 &&
          marker !== 0xcc
        ) {
          return {
            height: buffer.readUInt16BE(offset + 5),
            width: buffer.readUInt16BE(offset + 7),
          };
        }

        if (size < 2) {
          break;
        }

        offset += 2 + size;
      }
    }
  } catch (error) {
    console.error('Failed to extract image dimensions:', error);
  }

  return { width: null, height: null };
}

async function ensureBillScansBucket(adminSupabase: ReturnType<typeof createAdminClient>) {
  const { data: bucket, error: bucketError } = await adminSupabase.storage.getBucket(BILL_SCANS_BUCKET);

  if (!bucketError && bucket) {
    return;
  }

  const { error: createBucketError } = await adminSupabase.storage.createBucket(BILL_SCANS_BUCKET, {
    public: false,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  });

  if (createBucketError && !createBucketError.message.toLowerCase().includes('already')) {
    throw createBucketError;
  }
}

export async function POST(request: Request) {
  let scanSessionId: string | null = null;
  let smartScanUsageEvent: SmartScanUsageEventRow | null = null;
  let smartScanCharged = false;
  let authenticatedUserId: string | null = null;
  // Hoisted so the catch-all can return a graceful 200 body shaped for
  // the version of the response the caller asked for (v1 / v2 / v3),
  // even when the v1 extraction itself fails.
  let capturedRequestBody: unknown = null;

  try {
    const auth = await getAuthenticatedUser(request);
    const { user, method } = auth;
    const supabase = method === 'bearer' ? createBearerSupabaseClient(auth) : await createClient();
    const storageSupabase = method === 'bearer' ? supabase : createAdminClient();
    const canCreateStorageBucket = method !== 'bearer';

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    authenticatedUserId = user.id;

    if (isRateLimited(`bill-scan:${user.id}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const requestBody = await request.json();
    capturedRequestBody = requestBody;
    const { image, source_type } = requestBody ?? {};
    // Opt-in to the v2 response shape via `?v=2` or `responseVersion: 2`.
    // v1 remains the default for every existing client.
    const includeV2 = wantsV2Response(request.url, requestBody);
    // Opt-in to the v3 response shape via `?v=3` or `responseVersion: 3`.
    // v3 is additive: it carries everything v2 does, plus a `classification`
    // field and an optional `payLater` object (when scanPurpose != "bill"
    // and the screenshot reads as a Pay Later plan). Existing v1/v2
    // callers are unaffected.
    const includeV3 = wantsV3Response(request.url, requestBody);
    // v3 always carries the v2 fields too — a v3 caller never has to ask
    // for v2 separately.
    const wantsV2 = includeV2 || includeV3;
    // Default "bill" keeps every existing v1/v2 caller on the bills-only
    // path verbatim — they never set `scanPurpose`. Only v3 callers
    // typically set it to "payLater" or "auto".
    const scanPurpose = parseScanPurpose(requestBody);
    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Missing image data' }, { status: 400 });
    }

    // Extract media type and base64 data from data URL
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid image format. Expected data URL.' }, { status: 400 });
    }
    const mediaType = match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    const base64Data = match[2];
    const sourceType =
      source_type === 'camera' ||
      source_type === 'photo_library' ||
      source_type === 'document_scanner' ||
      source_type === 'quick_add'
        ? source_type
        : 'camera';

    if (base64Data.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 5MB)' }, { status: 400 });
    }

    const promptVersion = 'bill-scan-v2';
    const modelName = 'claude-sonnet-4-20250514';
    const imageHash = createHash('sha256').update(base64Data).digest('hex');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const fileSizeBytes = imageBuffer.byteLength;
    const { width: imageWidth, height: imageHeight } = getImageDimensions(imageBuffer, mediaType);
    const usageReservation = await reserveSmartScanUsage({
      userId: user.id,
      scanKind: 'bill',
      route: '/api/bills/scan',
      imageCount: 1,
      fileSizeBytes,
      modelProvider: 'anthropic',
      modelName,
    });

    if (!usageReservation.ok) {
      return NextResponse.json(usageReservation.limitResponse, { status: 403 });
    }
    smartScanUsageEvent = usageReservation.event;

    const { data: scanSession, error: scanSessionError } = await supabase
      .from('bill_scan_sessions')
      .insert({
        user_id: user.id,
        source_type: sourceType,
        image_hash: imageHash,
        file_size_bytes: fileSizeBytes,
        image_width: imageWidth,
        image_height: imageHeight,
        model_name: modelName,
        prompt_version: promptVersion,
        extraction_status: 'pending',
      })
      .select('id')
      .single();

    if (scanSessionError || !scanSession) {
      console.error('Error creating bill scan session:', scanSessionError);
      await releaseReservedSmartScan('bill_scan_session_failed');
      return NextResponse.json({ error: 'Failed to initialize bill scan' }, { status: 500 });
    }

    scanSessionId = scanSession.id;
    const imageExtension = getFileExtension(mediaType);
    const imageStoragePath = `${user.id}/${scanSessionId}.${imageExtension}`;

    if (canCreateStorageBucket) {
      await ensureBillScansBucket(storageSupabase);
    }

    const { error: uploadError } = await storageSupabase.storage
      .from(BILL_SCANS_BUCKET)
      .upload(imageStoragePath, imageBuffer, {
        contentType: mediaType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading bill scan image:', uploadError);
      await supabase
        .from('bill_scan_sessions')
        .update({
          extraction_status: 'failed',
          error_code: 'image_upload_failed',
        })
        .eq('id', scanSessionId);

      await releaseReservedSmartScan('image_upload_failed');
      return NextResponse.json({ error: 'Failed to store bill scan image' }, { status: 500 });
    }

    const { error: imagePathUpdateError } = await supabase
      .from('bill_scan_sessions')
      .update({
        image_storage_path: imageStoragePath,
      })
      .eq('id', scanSessionId);

    if (imagePathUpdateError) {
      console.error('Error updating image storage path:', imagePathUpdateError);
      await supabase
        .from('bill_scan_sessions')
        .update({
          extraction_status: 'failed',
          error_code: 'image_path_update_failed',
        })
        .eq('id', scanSessionId);

      await releaseReservedSmartScan('image_path_update_failed');
      return NextResponse.json({ error: 'Failed to persist bill scan metadata' }, { status: 500 });
    }

    // Phase 5: Pre-screen with classifier (logs only, does not block)
    const classification = classifyDocument('scan', fileSizeBytes, imageHash);
    if (classification.confidence > 0 && !classification.isBill) {
      console.log(`Bill classifier pre-screen: ${classification.reason} (confidence: ${classification.confidence})`);
      // For now, just log — don't reject. Let Claude decide.
      // Future: reject obvious non-bills before spending Claude tokens
    }

    const startedAt = Date.now();
    await chargeSmartScan('model_call_started', {
      billScanSessionId: scanSessionId,
    });

    const response = await getAnthropic().messages.create({
      model: modelName,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: `You are extracting bill information from a photo or screenshot. Return ONLY valid JSON with no markdown formatting or code fences:
{
  "is_bill": true,
  "document_type": "utility_bill",
  "vendor_name": "AT&T",
  "amount_due": 142.5,
  "due_date": "2026-04-12",
  "confidence": {
    "vendor_name": 0.93,
    "amount_due": 0.89,
    "due_date": 0.76,
    "overall": 0.84
  },
  "evidence": {
    "vendor_text": "AT&T",
    "amount_text": "Total Amount Due $142.50",
    "due_date_text": "Due Date Apr 12, 2026"
  },
  "warnings": []
}

Rules:
- is_bill: true if this document is a bill, statement, invoice, or payment notice requesting money. false otherwise.
- document_type: short snake_case classification such as "utility_bill", "credit_card_statement", "invoice", "medical_bill", "non_bill", or "unknown".
- vendor_name: The company or service name (e.g. "AT&T", "Netflix", "Capital One Savor"). Use the brand name, not generic terms.
- amount_due: The TOTAL amount due, statement balance, or balance due. NEVER use the minimum payment. Always use the largest balance/total shown when that is the payable amount. If multiple amounts appear, pick the total/statement balance over minimum payment.
- due_date: The payment due date in YYYY-MM-DD format.
- confidence: Include a 0 to 1 confidence score for vendor_name, amount_due, due_date, and overall.
- evidence: Copy the exact supporting text snippet for each field when available; otherwise use null.
- evidence.raw_text: Include a compact plain-text summary of the most relevant bill text you used for extraction (especially lines around totals and due dates).
- warnings: Include an array of short strings for ambiguity, missing fields, or conflicts. Use [] when none.
- candidates.amounts: optional array of top amount candidates with fields value, normalizedValue, label, sourceText, and locationHint.
- candidates.due_dates: optional array of top due date candidates with fields value, normalizedValue, label, sourceText, and locationHint.
- If a field cannot be determined, use null.
- Return all keys shown above, even when values are null or false.`,
            },
          ],
        },
      ],
    });
    const latencyMs = Date.now() - startedAt;

    const textBlock = response.content.find((block) => block.type === 'text');
    const content = textBlock?.type === 'text' ? textBlock.text.trim() : null;
    if (!content) {
      await supabase
        .from('bill_scan_sessions')
        .update({
          extraction_status: 'failed',
          error_code: 'empty_model_response',
          latency_ms: latencyMs,
        })
        .eq('id', scanSessionId);

      await finishChargedSmartScan('empty_model_response', {
        billScanSessionId: scanSessionId,
        latencyMs,
      });
      return NextResponse.json({
        scan_session_id: scanSessionId,
        name: null,
        amount: null,
        due_date: null,
      });
    }

    // Strip markdown code fences if present
    const jsonStr = content.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    // Lenient parse: some models wrap the JSON in a sentence of prose
    // ("This appears to be a Shop Pay installment plan, not a bill:
    // { ... }"). A strict JSON.parse throws on that, dropping the
    // whole request into the catch-all 500 below. Try the strict
    // parse first; on failure, fall back to extracting the first
    // {...} block from the response so we still get usable data.
    let parsed: ClaudeScanResult;
    try {
      parsed = JSON.parse(jsonStr) as ClaudeScanResult;
    } catch (parseError) {
      const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          parsed = JSON.parse(objectMatch[0]) as ClaudeScanResult;
        } catch {
          throw parseError; // propagate the original — outer catch handles it.
        }
      } else {
        throw parseError;
      }
    }
    const normalizedName = typeof parsed.vendor_name === 'string' ? parsed.vendor_name : null;
    const normalizedAmountString = typeof parsed.amount_due === 'string'
      ? parsed.amount_due
      : typeof parsed.amount_due === 'number'
        ? String(parsed.amount_due)
        : null;
    const normalizedDueDate = typeof parsed.due_date === 'string' ? parsed.due_date : null;
    const isBill = typeof parsed.is_bill === 'boolean' ? parsed.is_bill : normalizedName !== null || normalizedAmountString !== null || normalizedDueDate !== null;
    const documentType = typeof parsed.document_type === 'string' ? parsed.document_type : null;
    const warnings = Array.isArray(parsed.warnings)
      ? parsed.warnings.filter((warning: unknown): warning is string => typeof warning === 'string')
      : [];

    const confidence = parsed.confidence && typeof parsed.confidence === 'object' ? parsed.confidence : {};
    const evidence = parsed.evidence && typeof parsed.evidence === 'object' ? parsed.evidence : {};

    const confidenceName = typeof confidence.vendor_name === 'number' ? confidence.vendor_name : null;
    const confidenceAmount = typeof confidence.amount_due === 'number' ? confidence.amount_due : null;
    const confidenceDueDate = typeof confidence.due_date === 'number' ? confidence.due_date : null;
    const overallConfidence = typeof confidence.overall === 'number' ? confidence.overall : null;

    const evidenceVendorText = typeof evidence.vendor_text === 'string' ? evidence.vendor_text : null;
    const evidenceAmountText = typeof evidence.amount_text === 'string' ? evidence.amount_text : null;
    const evidenceDueDateText = typeof evidence.due_date_text === 'string' ? evidence.due_date_text : null;
    const documentClassification = isBill ? 'bill' : 'non_bill';

    const amountCandidates = buildAmountCandidates({
      ...parsed,
      vendor_name: normalizedName,
      amount_due: normalizedAmountString,
      due_date: normalizedDueDate,
      warnings,
      is_bill: isBill,
      document_type: documentType,
    });
    const dueDateCandidates = buildDueDateCandidates({
      ...parsed,
      vendor_name: normalizedName,
      amount_due: normalizedAmountString,
      due_date: normalizedDueDate,
      warnings,
      is_bill: isBill,
      document_type: documentType,
    });

    const amountResult = resolveAmount({
      claudeAmount: normalizedAmountString,
      claudeConfidence: confidenceAmount ?? 0,
      candidates: amountCandidates,
    });
    const dueDateResult = resolveDueDate({
      claudeDueDate: normalizedDueDate,
      claudeConfidence: confidenceDueDate ?? 0,
      candidates: dueDateCandidates,
    });

    const finalAmount = amountResult.finalValue;
    const dueDateEvidenceHasYear = hasExplicitYear(evidenceDueDateText) || hasExplicitYear(parsed.evidence?.raw_text);
    const safeDueDate = !dueDateEvidenceHasYear
      ? reconcileAmbiguousYear(dueDateResult.finalValue)
      : dueDateResult.finalValue;
    const finalDueDate = safeDueDate;
    const dueDateDecision =
      safeDueDate !== dueDateResult.finalValue
        ? 'overridden_by_ranker'
        : dueDateResult.resolution.decision;
    const dueDateReason =
      safeDueDate !== dueDateResult.finalValue
        ? 'rolled_forward_ambiguous_past_due_date'
        : dueDateResult.resolution.reason;
    const needsReview =
      amountResult.resolution.decision === 'needs_review' ||
      dueDateDecision === 'needs_review';

    const rankingPayload = {
      version: 'ranker-v1' as const,
      candidates: {
        amounts: amountResult.candidates,
        due_dates: dueDateResult.candidates,
      },
      resolution: {
        amount_due: amountResult.resolution,
        due_date: {
          ...dueDateResult.resolution,
          finalValue: finalDueDate,
          decision: dueDateDecision,
          reason: dueDateReason,
        },
      },
    };

    const finalResolvedPayload = {
      amount_due: finalAmount,
      due_date: finalDueDate,
      needs_review: needsReview,
    };

    const { error: extractionResultError } = await supabase
      .from('bill_extraction_results')
      .insert({
        scan_session_id: scanSessionId,
        model_name: modelName,
        prompt_version: promptVersion,
        raw_json: parsed,
        name_raw: normalizedName,
        amount_raw: normalizedAmountString ? Number(normalizedAmountString) : null,
        due_date_raw: normalizedDueDate,
        name_normalized: normalizedName,
        amount_normalized: finalAmount ? Number(finalAmount) : null,
        due_date_normalized: finalDueDate,
        confidence_name: confidenceName,
        confidence_amount: confidenceAmount,
        confidence_due_date: confidenceDueDate,
        overall_confidence: overallConfidence,
        evidence_vendor_text: evidenceVendorText,
        evidence_amount_text: evidenceAmountText,
        evidence_due_date_text: evidenceDueDateText,
        is_bill: isBill,
        document_type: documentType,
        ranking_json: rankingPayload,
        final_resolved_json: finalResolvedPayload,
      });

    if (extractionResultError) {
      console.error('Error creating bill extraction result:', extractionResultError);
      await supabase
        .from('bill_scan_sessions')
        .update({
          extraction_status: 'failed',
          error_code: 'extraction_result_insert_failed',
          latency_ms: latencyMs,
          vendor_guess_raw: normalizedName,
          vendor_guess_normalized: normalizedName,
        })
        .eq('id', scanSessionId);

      await finishChargedSmartScan('extraction_result_insert_failed', {
        billScanSessionId: scanSessionId,
        latencyMs,
      });
      return NextResponse.json({ error: 'Failed to persist bill scan result' }, { status: 500 });
    }

    const { error: scanSessionUpdateError } = await supabase
      .from('bill_scan_sessions')
      .update({
        extraction_status: 'success',
        document_classification: documentClassification,
        classification_confidence: overallConfidence,
        vendor_guess_raw: normalizedName,
        vendor_guess_normalized: normalizedName,
        latency_ms: latencyMs,
      })
      .eq('id', scanSessionId);

    if (scanSessionUpdateError) {
      console.error('Error updating bill scan session:', scanSessionUpdateError);
    }

    const finalAmountNumber = finalAmount ? Number(finalAmount) : null;

    // v1 response body — unchanged. Built as an object so the optional
    // v2 block can be attached without altering any v1 field.
    const responseBody: Record<string, unknown> = {
      scan_session_id: scanSessionId,
      name: normalizedName,
      amount: finalAmountNumber,
      due_date: finalDueDate,
      confidence: {
        vendor_name: confidenceName,
        amount_due: confidenceAmount,
        due_date: confidenceDueDate,
        overall: overallConfidence,
      },
      is_bill: isBill,
      warnings,
      review: {
        needs_review: needsReview,
        amount_due: {
          decision: amountResult.resolution.decision,
          highlighted: amountResult.resolution.decision !== 'accepted_claude',
        },
        due_date: {
          decision: dueDateDecision,
          highlighted: dueDateDecision !== 'accepted_claude',
        },
      },
      ranking: rankingPayload,
    };

    // v2: additive, only when the caller opted in. Phase 2 runs a
    // dedicated vision call that OCRs the full screenshot (subject bar
    // included) and classifies bill identity per the v2 prompt. The v1
    // body above is untouched. The ranker-resolved amount/due date are
    // reused so v1 and v2 agree on those numbers.
    if (wantsV2) {
      // Phase 1 fallback: a null-filled v2 object derived from the v1
      // pipeline. Used if the v2 vision call fails or returns invalid
      // JSON so the response always carries a well-formed v2 object.
      const fallbackV2 = buildBillScanV2({
        scanSessionId: scanSessionId!,
        vendorRawName: normalizedName,
        amountDue: finalAmountNumber,
        dueDate: finalDueDate,
        documentType,
        isBill,
        sourceType,
        rawVisibleText: typeof parsed.evidence?.raw_text === 'string' ? parsed.evidence.raw_text : null,
        overallConfidence,
        fieldConfidence: {
          vendorName: confidenceName,
          amountDue: confidenceAmount,
          dueDate: confidenceDueDate,
        },
        evidence: {
          vendorText: evidenceVendorText,
          amountText: evidenceAmountText,
          dueDateText: evidenceDueDateText,
          rawText: typeof parsed.evidence?.raw_text === 'string' ? parsed.evidence.raw_text : null,
        },
        reviewNeeded: needsReview,
        reviewReason: needsReview ? (dueDateReason ?? amountResult.resolution.reason ?? null) : null,
        warnings,
      });

      // Phase 10: Pay Later classification + extraction, attached when
      // the caller opted into v3. Runs deterministically over the v1
      // ranker's vendor/amount/date + the OCR raw_text already gathered.
      // For v3 callers who left `scanPurpose: "bill"`, the classifier
      // short-circuits and we return classification: "bill" with no
      // payLater object — no behavioral change.
      if (includeV3) {
        const payLaterResult = classifyAndExtractPayLater({
          rawText: typeof parsed.evidence?.raw_text === 'string' ? parsed.evidence.raw_text : null,
          vendorName: normalizedName,
          amountDue: finalAmountNumber,
          dueDate: finalDueDate,
          scanPurpose,
        });
        responseBody.classification = payLaterResult.classification;
        if (payLaterResult.payLater) {
          responseBody.payLater = payLaterResult.payLater;
        } else {
          responseBody.payLater = null;
        }
      }

      try {
        const v2Response = await getAnthropic().messages.create({
          model: modelName,
          max_tokens: 1500,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: mediaType, data: base64Data },
                },
                { type: 'text', text: BILL_SCAN_V2_PROMPT },
              ],
            },
          ],
        });
        const v2TextBlock = v2Response.content.find((block) => block.type === 'text');
        const v2Text = v2TextBlock?.type === 'text' ? v2TextBlock.text : null;
        const v2Parsed = parseBillScanV2Claude(v2Text);
        const v2Mapped = v2Parsed
          ? mapClaudeV2ToBillScanV2(v2Parsed, {
              scanSessionId: scanSessionId!,
              fallbackSourceDocumentType: mapSourceDocumentType(sourceType),
              resolvedAmountDue: finalAmountNumber,
              resolvedDueDate: finalDueDate,
            })
          : fallbackV2;
        // Phase 3: deterministic identity post-processing (vendor
        // normalization, account-type classification, payment-
        // confirmation separation, identity confidence) — the model
        // output is only a hint.
        responseBody.v2 = postProcessBillScanV2(v2Mapped);
      } catch (v2Error) {
        console.error('Bill scan v2 extraction failed (returning fallback v2):', v2Error);
        responseBody.v2 = postProcessBillScanV2(fallbackV2);
      }
    }

    await finishChargedSmartScan(null, {
      billScanSessionId: scanSessionId,
      latencyMs,
    });
    return NextResponse.json(responseBody);
  } catch (error) {
    // P1-6: log raw detail to the controlled server log; classify to a
    // stable, app-owned code for telemetry and the client warning.
    const errorCode = logScanError('bills/scan', error);

    if (scanSessionId) {
      try {
        const supabase = createAdminClient();
        await supabase
          .from('bill_scan_sessions')
          .update({
            extraction_status: 'failed',
            error_code: errorCode,
          })
          .eq('id', scanSessionId);
      } catch (updateError) {
        console.error('Failed to mark scan session failed:', updateError);
      }
    }

    const diagnostic = errorCode;
    if (smartScanUsageEvent && authenticatedUserId) {
      if (smartScanCharged) {
        await finishChargedSmartScan(diagnostic, {
          billScanSessionId: scanSessionId,
        });
      } else {
        await releaseReservedSmartScan(diagnostic);
      }
    }

    // Phase-12 hardening: return a 200 with safe nulls + a diagnostic
    // warning instead of a hard 500. The iOS client decodes the body
    // and shows the friendly "couldn't read" review state with an
    // Enter-Manually CTA — much better UX than an error toast.
    //
    // Shape mirrors the version of the response the caller asked for:
    //   - v1 callers get the normal v1 nulls + warning.
    //   - v2 callers also get v2: null.
    //   - v3 callers also get classification: 'unknown' + payLater: null
    //     so the Pay Later scan-review sheet lands on the "Enter
    //     Manually" surface.
    const includeV2Fallback = wantsV2Response(request.url, capturedRequestBody);
    const includeV3Fallback = wantsV3Response(request.url, capturedRequestBody);

    const safeBody: Record<string, unknown> = {
      scan_session_id: scanSessionId,
      name: null,
      amount: null,
      due_date: null,
      is_bill: false,
      warnings: [`scan_failed: ${errorCode}`],
    };
    if (includeV2Fallback || includeV3Fallback) {
      safeBody.v2 = null;
    }
    if (includeV3Fallback) {
      safeBody.classification = 'unknown';
      safeBody.payLater = null;
    }

    return NextResponse.json(safeBody);
  }

  async function releaseReservedSmartScan(errorCode: string) {
    if (!smartScanUsageEvent || !authenticatedUserId) return;
    try {
      await releaseSmartScanUsageEvent({
        userId: authenticatedUserId,
        eventId: smartScanUsageEvent.id,
        errorCode,
        billScanSessionId: scanSessionId,
      });
    } catch (usageError) {
      console.error('Failed to release Smart Scan usage:', usageError);
    }
  }

  async function chargeSmartScan(chargeReason: string, metadata: { billScanSessionId?: string | null }) {
    if (!smartScanUsageEvent || !authenticatedUserId || smartScanCharged) return;
    smartScanUsageEvent = await chargeSmartScanUsageEvent({
      userId: authenticatedUserId,
      eventId: smartScanUsageEvent.id,
      modelProvider: 'anthropic',
      modelName: 'claude-sonnet-4-20250514',
      chargeReason,
      billScanSessionId: metadata.billScanSessionId ?? null,
    });
    smartScanCharged = true;
  }

  async function finishChargedSmartScan(
    errorCode: string | null,
    metadata: { billScanSessionId?: string | null; latencyMs?: number | null },
  ) {
    if (!smartScanUsageEvent || !authenticatedUserId || !smartScanCharged) return;
    try {
      smartScanUsageEvent = await finishChargedSmartScanUsageEvent({
        userId: authenticatedUserId,
        eventId: smartScanUsageEvent.id,
        errorCode,
        billScanSessionId: metadata.billScanSessionId ?? null,
        latencyMs: metadata.latencyMs ?? null,
      });
    } catch (usageError) {
      console.error('Failed to finish Smart Scan usage:', usageError);
    }
  }
}
