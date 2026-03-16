import { Resend } from 'resend';
import type { Bill } from '@/types';
import { formatBillDate, normalizeTimeZone } from './reminder-utils';

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

export async function sendBillReminderEmail(
  email: string,
  bill: Bill,
  daysUntilDue: number,
  options?: {
    appUrl?: string;
    timeZone?: string;
  }
): Promise<SendEmailResult> {
  try {
    const appUrl = options?.appUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://duezo.app';
    const timeZone = normalizeTimeZone(options?.timeZone);
    const dayLabel = daysUntilDue === 1 ? 'day' : 'days';
    const dueText = daysUntilDue === 0
      ? 'today'
      : daysUntilDue === 1
        ? 'tomorrow'
        : `in ${daysUntilDue} days`;

    const amountText = bill.amount !== null
      ? `$${bill.amount.toFixed(2)}`
      : 'Amount not set';

    const formattedDueDate = formatBillDate(bill.due_date, timeZone);

    const { data, error } = await getResendClient().emails.send({
      from: 'Duezo <reminders@duezo.app>',
      to: email,
      subject: `Duezo: ${bill.name} is due in ${daysUntilDue} ${dayLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 24px; background-color: #f5f3ff; color: #111827;">
            <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e9d5ff;">
              <div style="padding: 28px 32px; background: linear-gradient(135deg, #6d28d9 0%, #8B5CF6 100%); color: #ffffff;">
                <div style="font-size: 14px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.92;">Duezo Reminder</div>
                <h1 style="font-size: 28px; line-height: 1.2; margin: 12px 0 0;">
                  ${bill.name} is due ${dueText}
                </h1>
              </div>

              <div style="padding: 32px;">
                <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                  Keep this one on your radar. Here are the bill details for today's reminder.
                </p>

                <div style="border: 1px solid #ede9fe; border-radius: 16px; padding: 20px 22px; background-color: #faf5ff; margin-bottom: 24px;">
                  <div style="margin-bottom: 14px;">
                    <div style="font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em;">Bill</div>
                    <div style="font-size: 20px; font-weight: 700; color: #111827;">${bill.name}</div>
                  </div>
                  <div style="margin-bottom: 14px;">
                    <div style="font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em;">Amount</div>
                    <div style="font-size: 18px; font-weight: 600; color: #111827;">${amountText}</div>
                  </div>
                  <div style="margin-bottom: 14px;">
                    <div style="font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em;">Due Date</div>
                    <div style="font-size: 18px; font-weight: 600; color: #111827;">${formattedDueDate}</div>
                  </div>
                  <div>
                    <div style="font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em;">Reminder</div>
                    <div style="font-size: 18px; font-weight: 600; color: #8B5CF6;">Due in ${daysUntilDue} ${dayLabel}</div>
                  </div>
                </div>

                <a href="${appUrl}/dashboard" style="display: inline-block; background-color: #8B5CF6; color: #ffffff; text-decoration: none; padding: 14px 22px; border-radius: 12px; font-weight: 600; margin-bottom: 14px;">
                  Open Duezo
                </a>

                ${bill.payment_url ? `
                <p style="margin: 16px 0 24px; font-size: 14px; line-height: 1.6;">
                  Payment link: <a href="${bill.payment_url}" style="color: #7c3aed;">${bill.payment_url}</a>
                </p>
                ` : ''}

                <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #6b7280;">
                  You're getting this because bill reminders are enabled in Duezo. Manage them in the app anytime.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Duezo Reminder: ${bill.name}

${bill.name} is due ${dueText}

Amount: ${amountText}
Due Date: ${formattedDueDate}
Open Duezo: ${appUrl}/dashboard

${bill.payment_url ? `Pay now: ${bill.payment_url}` : ''}

---
Sent by Duezo
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
