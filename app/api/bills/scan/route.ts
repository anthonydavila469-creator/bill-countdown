import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { isRateLimited } from '@/lib/rate-limit';
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

  try {
    const { user, method } = await getAuthenticatedUser(request);
    const supabase = method === 'bearer' ? createAdminClient() : await createClient();
    const adminSupabase = createAdminClient();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isRateLimited(`bill-scan:${user.id}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { image, source_type } = await request.json();
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
      return NextResponse.json({ error: 'Failed to initialize bill scan' }, { status: 500 });
    }

    scanSessionId = scanSession.id;
    const imageExtension = getFileExtension(mediaType);
    const imageStoragePath = `${user.id}/${scanSessionId}.${imageExtension}`;

    await ensureBillScansBucket(adminSupabase);

    const { error: uploadError } = await adminSupabase.storage
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

      return NextResponse.json({
        scan_session_id: scanSessionId,
        name: null,
        amount: null,
        due_date: null,
      });
    }

    // Strip markdown code fences if present
    const jsonStr = content.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(jsonStr) as ClaudeScanResult;
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

    return NextResponse.json({
      scan_session_id: scanSessionId,
      name: normalizedName,
      amount: finalAmount ? Number(finalAmount) : null,
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
    });
  } catch (error) {
    console.error('Bill scan error:', error);

    if (scanSessionId) {
      const supabase = createAdminClient();
      await supabase
        .from('bill_scan_sessions')
        .update({
          extraction_status: 'failed',
          error_code: error instanceof Error ? error.name : 'unknown_error',
        })
        .eq('id', scanSessionId);
    }

    return NextResponse.json(
      { error: 'Failed to scan bill' },
      { status: 500 }
    );
  }
}
