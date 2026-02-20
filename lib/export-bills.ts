import type { Bill } from '@/types';
import { categoryLabels } from '@/types';

/**
 * Format a date string to YYYY-MM-DD format
 */
function formatDateForCSV(dateString: string | null): string {
  if (!dateString) return '';
  // Handle ISO strings and YYYY-MM-DD strings
  return dateString.split('T')[0];
}

/**
 * Escape CSV field values - handle commas, quotes, and newlines
 */
function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format recurrence interval for human-readable display
 */
function formatRecurrence(interval: string | null): string {
  if (!interval) return '';
  const labels: Record<string, string> = {
    weekly: 'Weekly',
    biweekly: 'Biweekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
  };
  return labels[interval] || interval;
}

/**
 * Export bills to CSV file and trigger browser download
 */
export function exportBillsToCSV(bills: Bill[]): void {
  // Sort bills by due_date ascending
  const sortedBills = [...bills].sort((a, b) => {
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  // CSV headers
  const headers = [
    'Name',
    'Amount',
    'Due Date',
    'Category',
    'Status',
    'Recurring',
    'Recurrence Interval',
    'Autopay',
    'Source',
    'Created At',
  ];

  // Build CSV rows
  const rows = sortedBills.map((bill) => {
    const category = bill.category ? categoryLabels[bill.category] : '';
    const status = bill.is_paid ? 'Paid' : 'Unpaid';
    const recurring = bill.is_recurring ? 'Yes' : 'No';
    const recurrenceInterval = formatRecurrence(bill.recurrence_interval);
    const autopay = bill.is_autopay ? 'Yes' : 'No';
    const source = bill.source === 'gmail' ? 'Gmail' : 'Manual';

    return [
      escapeCSVField(bill.name),
      bill.amount !== null ? bill.amount.toString() : '',
      formatDateForCSV(bill.due_date),
      escapeCSVField(category),
      status,
      recurring,
      recurrenceInterval,
      autopay,
      source,
      formatDateForCSV(bill.created_at),
    ].join(',');
  });

  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows].join('\n');

  // Create blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  // Generate filename with current date
  const today = new Date().toISOString().split('T')[0];
  const filename = `duezo-bills-${today}.csv`;

  // Create temporary link and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
