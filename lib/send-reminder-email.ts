import { Resend } from 'resend';
import { billReminderEmail } from '@/lib/email-templates';

let resend: Resend | null = null;

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set');
  }

  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }

  return resend;
}

export async function sendReminderEmail(
  userEmail: string,
  billName: string,
  dueDate: string,
  amount: number | null,
  daysUntilDue: number
) {
  try {
    const template = billReminderEmail(
      billName,
      dueDate,
      amount,
      daysUntilDue,
      process.env.NEXT_PUBLIC_APP_URL || 'https://www.duezo.app'
    );

    const { data, error } = await getResendClient().emails.send({
      from: 'Duezo <reminders@duezo.app>',
      to: userEmail,
      subject: template.subject,
      html: template.html,
    });

    if (error) {
      throw error;
    }

    return { success: true, id: data?.id };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
