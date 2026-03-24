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
              text: `Analyze this bill/statement image and extract the following information. Return ONLY valid JSON with no markdown formatting:
{
  "name": "company or biller name (e.g. 'AT&T', 'Netflix', 'City Water')",
  "amount": numeric amount due (e.g. 149.99) or null if not found,
  "due_date": "YYYY-MM-DD" format or null if not found
}

If you cannot determine a field, use null. For the name, use the most recognizable company/service name. For amount, use the total amount due or balance due. For due date, use the payment due date.`,
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
