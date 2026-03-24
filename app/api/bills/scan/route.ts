import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { isRateLimited } from '@/lib/rate-limit';
import Anthropic from '@anthropic-ai/sdk';

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isRateLimited(`bill-scan:${user.id}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { image } = await request.json();
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

    if (base64Data.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 5MB)' }, { status: 400 });
    }

    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
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

    const textBlock = response.content.find((block) => block.type === 'text');
    const content = textBlock?.type === 'text' ? textBlock.text.trim() : null;
    if (!content) {
      return NextResponse.json({ name: null, amount: null, due_date: null });
    }

    // Strip markdown code fences if present
    const jsonStr = content.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    return NextResponse.json({
      name: typeof parsed.name === 'string' ? parsed.name : null,
      amount: typeof parsed.amount === 'number' ? parsed.amount : null,
      due_date: typeof parsed.due_date === 'string' ? parsed.due_date : null,
    });
  } catch (error) {
    console.error('Bill scan error:', error);
    return NextResponse.json(
      { error: 'Failed to scan bill' },
      { status: 500 }
    );
  }
}
