import { Resend } from 'resend';
import type { Bill } from '@/types';

// Lazy-loaded Resend client to avoid errors during build
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a bill reminder email
 */
export async function sendBillReminderEmail(
  email: string,
  bill: Bill,
  daysUntilDue: number
): Promise<SendEmailResult> {
  try {
    const dueText = daysUntilDue === 0
      ? 'today'
      : daysUntilDue === 1
        ? 'tomorrow'
        : `in ${daysUntilDue} days`;

    const amountText = bill.amount
      ? `$${bill.amount.toFixed(2)}`
      : 'Amount not set';

    const formattedDueDate = new Date(bill.due_date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const { data, error } = await getResendClient().emails.send({
      from: 'Bill Countdown <onboarding@resend.dev>',
      to: email,
      subject: `${bill.emoji} ${bill.name} is due ${dueText}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #08080c; color: #ffffff;">
            <div style="max-width: 480px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="font-size: 48px; margin-bottom: 8px;">${bill.emoji}</div>
                <h1 style="font-size: 24px; font-weight: 600; margin: 0; color: #ffffff;">
                  Bill Reminder
                </h1>
              </div>

              <div style="background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)); border-radius: 16px; padding: 24px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 24px;">
                <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 16px 0; color: #ffffff;">
                  ${bill.name}
                </h2>

                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                  <span style="color: rgba(255,255,255,0.6);">Amount</span>
                  <span style="font-weight: 500; color: #ffffff;">${amountText}</span>
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                  <span style="color: rgba(255,255,255,0.6);">Due Date</span>
                  <span style="font-weight: 500; color: #ffffff;">${formattedDueDate}</span>
                </div>

                <div style="display: flex; justify-content: space-between;">
                  <span style="color: rgba(255,255,255,0.6);">Status</span>
                  <span style="font-weight: 500; color: ${daysUntilDue <= 1 ? '#f97316' : '#34d399'};">
                    Due ${dueText}
                  </span>
                </div>
              </div>

              ${bill.payment_url ? `
              <a href="${bill.payment_url}" style="display: block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; padding: 14px 24px; border-radius: 12px; font-weight: 500; text-align: center; margin-bottom: 24px;">
                Pay Now
              </a>
              ` : ''}

              <p style="text-align: center; color: rgba(255,255,255,0.4); font-size: 12px; margin: 0;">
                Sent by <a href="https://billcountdown.app" style="color: rgba(255,255,255,0.6);">Bill Countdown</a>
              </p>
            </div>
          </body>
        </html>
      `,
      text: `
Bill Reminder: ${bill.name}

${bill.emoji} ${bill.name} is due ${dueText}

Amount: ${amountText}
Due Date: ${formattedDueDate}

${bill.payment_url ? `Pay now: ${bill.payment_url}` : ''}

---
Sent by Bill Countdown
      `.trim(),
    });

    if (error) {
      console.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Email send error:', message);
    return { success: false, error: message };
  }
}
