import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { isRateLimited } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function POST(request: Request) {
  let scanSessionId: string | null = null;

  try {
    const { user, method } = await getAuthenticatedUser(request);
    const supabase = method === 'bearer' ? createAdminClient() : await createClient();

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

    const promptVersion = 'bill-scan-v1';
    const modelName = 'claude-sonnet-4-20250514';
    const imageHash = createHash('sha256').update(base64Data).digest('hex');
    const fileSizeBytes = Buffer.from(base64Data, 'base64').byteLength;

    const { data: scanSession, error: scanSessionError } = await supabase
      .from('bill_scan_sessions')
      .insert({
        user_id: user.id,
        source_type: sourceType,
        image_hash: imageHash,
        file_size_bytes: fileSizeBytes,
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
    const startedAt = Date.now();

    const response = await getAnthropic().messages.create({
      model: modelName,
      max_tokens: 300,
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
{"name": "string", "amount": number_or_null, "due_date": "YYYY-MM-DD_or_null"}

Rules:
- name: The company or service name (e.g. "AT&T", "Netflix", "Capital One Savor"). Use the brand name, not generic terms.
- amount: The TOTAL amount due, statement balance, or balance due. NEVER use the minimum payment — always use the largest balance/total shown. If multiple amounts appear, pick the total/statement balance over minimum payment.
- due_date: The payment due date in YYYY-MM-DD format.
- If a field cannot be determined, use null.`,
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
    const parsed = JSON.parse(jsonStr);
    const normalizedName = typeof parsed.name === 'string' ? parsed.name : null;
    const normalizedAmount = typeof parsed.amount === 'number' ? parsed.amount : null;
    const normalizedDueDate = typeof parsed.due_date === 'string' ? parsed.due_date : null;

    const { error: extractionResultError } = await supabase
      .from('bill_extraction_results')
      .insert({
        scan_session_id: scanSessionId,
        model_name: modelName,
        prompt_version: promptVersion,
        raw_json: parsed,
        name_raw: normalizedName,
        amount_raw: normalizedAmount,
        due_date_raw: normalizedDueDate,
        name_normalized: normalizedName,
        amount_normalized: normalizedAmount,
        due_date_normalized: normalizedDueDate,
        is_bill: normalizedName !== null || normalizedAmount !== null || normalizedDueDate !== null,
        document_type: 'bill',
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
        document_classification: 'bill',
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
      amount: normalizedAmount,
      due_date: normalizedDueDate,
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
