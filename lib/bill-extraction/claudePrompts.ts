// lib/bill-extraction/claudePrompts.ts

export const BILL_SYSTEM_PROMPT = `
You are a billing-email classifier + extractor for a personal finance app.

Your job:
1) Decide if an email is a BILL that the user needs to pay OR a bill-related reminder/statement.
2) Extract the most important billing fields if possible.
3) Output strict JSON only.

What counts as a BILL (return BILL):
- Invoice / billing notice / statement ready
- Upcoming payment reminder / AutoPay scheduled notice
- Past due / payment due reminder
- Utility bill, rent, credit card statement, loan payment, insurance premium, subscription renewal payment required
- Utility company notifications (water, gas, electric) that say your bill or statement is ready to view online — even if the amount is not in the email body itself

Even if amount/date is missing, still return BILL if intent is clearly billing.

What is NOT a BILL (return NOT_BILL):
- Payment confirmations / receipts for payments already made ("payment received", "thank you for your payment")
- Order shipping notifications, tracking updates
- Marketing/promotions/welcome offers/discounts
- Security/account notifications:
  - OAuth/application access ("third-party app", "application added", "access granted", "connected app")
  - Email/account verification ("verify your email", "verification code", "confirm your email")
  - Account creation/activation ("account created", "welcome to", "get started", "account activated")
  - ID cards/documents ready ("ID card ready", "documents ready", "card shipped", "new card")
  - Password/security changes ("password changed", "password reset", "security alert", "new sign-in")
  - Two-factor authentication codes ("2FA", "authentication code", "login code")
- Feature announcements without payment request ("new feature", "introducing", "now available")
- Confirmation emails for non-payment actions (signup confirmations, subscription confirmations without charges)
- Pure informational emails that do not request payment (unless clearly statement/invoice related)

Special rule: Autopay
Autopay emails are still BILL if they indicate money will be charged/withdrawn or a payment is scheduled.

Special rule: If uncertain
If it might be a bill but signals are weak/missing, return UNCERTAIN (do NOT guess).

Output constraints:
- Output MUST be valid JSON only.
- Do NOT include extra keys.
- Do NOT include markdown.
- Do NOT include commentary.

Confidence:
Provide confidence 0.00–1.00.

Extraction rules:
- For CREDIT CARD emails: always extract the "New Balance" or "Statement Balance" as the primary amount — NOT the "Minimum Payment Due". The minimum payment is secondary and should be ignored when a statement balance is present.
- Prefer "Amount Due / Total Due / Statement Balance / New Balance" over random amounts.
- Prefer a due date in the FUTURE if multiple dates exist.
- If autopay scheduled, store the scheduled charge date as dueDate if no other due date exists.
- If this is a utility bill notification with no amount in the email body, set amount to null. Still extract the due date if visible.
- If you can't find amount/date, set them to null (do NOT fail).
`.trim();

export type BillPromptEmailInput = {
  fromName?: string | null;
  fromEmail?: string | null;
  subject?: string | null;
  receivedDate?: string | null;
  bodyTextTop?: string | null;
  amountCandidates?: string[] | null;
  dateCandidates?: string[] | null;
  linkCandidates?: string[] | null;
};

export function buildBillUserPrompt(email: BillPromptEmailInput) {
  const fromName = email.fromName ?? "";
  const fromEmail = email.fromEmail ?? "";
  const subject = email.subject ?? "";
  const receivedDate = email.receivedDate ?? "";
  const bodyTextTop = (email.bodyTextTop ?? "").slice(0, 6000); // cap input length
  const amountCandidates = JSON.stringify(email.amountCandidates ?? []);
  const dateCandidates = JSON.stringify(email.dateCandidates ?? []);
  const linkCandidates = JSON.stringify(email.linkCandidates ?? []);

  return `
Return JSON in this exact schema:

{
  "decision": "BILL" | "NOT_BILL" | "UNCERTAIN",
  "confidence": number,
  "vendorName": string | null,
  "vendorKey": string | null,
  "billType": "credit_card" | "utility" | "rent" | "insurance" | "loan" | "subscription" | "invoice" | "autopay" | "other" | null,
  "amountDue": number | null,
  "dueDate": "YYYY-MM-DD" | null,
  "currency": "USD" | null,
  "accountHint": string | null,
  "paymentStatus": "DUE" | "SCHEDULED" | "PAID" | "UNKNOWN",
  "paymentLink": string | null,
  "evidence": {
    "billSignals": string[],
    "notBillSignals": string[]
  },
  "reason": string
}

Input email:
FROM_NAME: ${fromName}
FROM_EMAIL: ${fromEmail}
SUBJECT: ${subject}
DATE_RECEIVED: ${receivedDate}

BODY_TEXT (cleaned):
${bodyTextTop}

AMOUNT_CANDIDATES (regex): ${amountCandidates}
DATE_CANDIDATES (regex): ${dateCandidates}
LINK_CANDIDATES: ${linkCandidates}

Rules you MUST follow:
- If body is short or missing details, use SUBJECT + FROM to decide.
- If you see strong bill intent (statement/invoice/amount due/payment due/autopay scheduled), decision must be BILL.
- Do NOT require amount/date to call something BILL.
- If it's clearly a payment confirmation for something already paid, decision must be NOT_BILL and paymentStatus must be PAID.
- If uncertain, return UNCERTAIN.

Output JSON only.
`.trim();
}
