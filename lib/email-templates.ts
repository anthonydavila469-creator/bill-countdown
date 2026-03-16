function formatAmount(amount: number | null): string {
  if (amount === null || Number.isNaN(amount)) {
    return 'Amount not set';
  }

  return `$${amount.toFixed(2)}`;
}

function subjectForDays(daysUntilDue: number, billName: string): string {
  if (daysUntilDue <= 0) {
    return `Duezo: ${billName} is due today`;
  }

  if (daysUntilDue === 1) {
    return `Duezo: ${billName} is due in 1 day`;
  }

  return `Duezo: ${billName} is due in ${daysUntilDue} days`;
}

export function billReminderEmail(
  billName: string,
  dueDate: string,
  amount: number | null,
  daysUntilDue: number,
  appUrl = 'https://duezo.app'
) {
  return {
    subject: subjectForDays(daysUntilDue, billName),
    html: `
      <h2>${billName}</h2>
      <p>Due: ${dueDate}</p>
      <p>Amount: ${formatAmount(amount)}</p>
      <a href="${appUrl}">View in Duezo</a>
    `,
  };
}
