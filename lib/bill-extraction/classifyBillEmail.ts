// lib/bill-extraction/classifyBillEmail.ts

import Anthropic from "@anthropic-ai/sdk";
import { BILL_SYSTEM_PROMPT, buildBillUserPrompt, BillPromptEmailInput } from "./claudePrompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export type BillAIResult = {
  decision: "BILL" | "NOT_BILL" | "UNCERTAIN";
  confidence: number;
  vendorName: string | null;
  vendorKey: string | null;
  billType:
    | "credit_card"
    | "utility"
    | "rent"
    | "insurance"
    | "loan"
    | "subscription"
    | "invoice"
    | "autopay"
    | "other"
    | null;
  amountDue: number | null;
  dueDate: string | null;
  currency: "USD" | null;
  accountHint: string | null;
  paymentStatus: "DUE" | "SCHEDULED" | "PAID" | "UNKNOWN";
  paymentLink: string | null;
  evidence: {
    billSignals: string[];
    notBillSignals: string[];
  };
  reason: string;
};

function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Normalize confidence to 0.00-1.00 range
 * Claude sometimes returns 92 instead of 0.92
 */
function normalizeConfidence(value: unknown): number {
  if (typeof value !== "number") return 0.5;
  // If > 1, assume it's a percentage (e.g., 92 -> 0.92)
  if (value > 1) return value / 100;
  // Clamp to 0-1 range
  return Math.max(0, Math.min(1, value));
}

export async function classifyBillEmail(email: BillPromptEmailInput): Promise<BillAIResult> {
  const userPrompt = buildBillUserPrompt(email);

  const resp = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514", // match your console model
    temperature: 0,
    max_tokens: 900,
    system: BILL_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = resp.content?.[0]?.type === "text" ? resp.content[0].text : "";
  const parsed = safeJsonParse(text) as Record<string, unknown> | null;

  if (!parsed) {
    throw new Error("Claude did not return valid JSON. Raw output: " + text.slice(0, 500));
  }

  // Normalize the result
  return {
    ...parsed,
    confidence: normalizeConfidence(parsed.confidence),
    // Ensure evidence object exists
    evidence: parsed.evidence as BillAIResult["evidence"] ?? { billSignals: [], notBillSignals: [] },
  } as BillAIResult;
}
