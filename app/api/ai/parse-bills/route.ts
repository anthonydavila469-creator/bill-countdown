import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  BILL_EXTRACTION_SYSTEM_PROMPT,
  buildBatchEmailPrompt,
  parseBatchAIResponse,
  EmailForParsing,
} from '@/lib/ai/prompts';
import { ParsedBill } from '@/types';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// POST /api/ai/parse-bills - Parse emails to extract bill information
export async function POST(request: Request) {
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

    // Get emails from request body
    const body = await request.json();
    const emails: EmailForParsing[] = body.emails;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'No emails provided' },
        { status: 400 }
      );
    }

    // Limit to 10 emails per request to manage costs
    const emailsToProcess = emails.slice(0, 10);

    // Build the prompt
    const userPrompt = buildBatchEmailPrompt(emailsToProcess);

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: BILL_EXTRACTION_SYSTEM_PROMPT,
    });

    // Extract text response
    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Parse the AI response
    const extractedBills = parseBatchAIResponse(textContent.text);

    // Transform to ParsedBill format
    const parsedBills: ParsedBill[] = extractedBills.map((bill) => ({
      name: bill.name,
      amount: bill.amount,
      due_date: bill.due_date,
      category: bill.category,
      is_recurring: bill.is_recurring,
      recurrence_interval: bill.recurrence_interval,
      confidence: bill.confidence,
      source_email_id: bill.email_id,
    }));

    return NextResponse.json({
      bills: parsedBills,
      processed: emailsToProcess.length,
      extracted: parsedBills.length,
    });
  } catch (error) {
    console.error('AI parsing error:', error);

    // Handle specific Anthropic errors
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 500 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to parse emails' },
      { status: 500 }
    );
  }
}
