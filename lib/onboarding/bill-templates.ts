import { BillCategory } from '@/types';

export interface BillTemplate {
  id: string;
  name: string;
  emoji: string;
  category: BillCategory;
  defaultDay: number; // Day of month (1-28)
}

export interface TemplateCategory {
  id: string;
  label: string;
  templates: BillTemplate[];
}

export const BILL_TEMPLATES: TemplateCategory[] = [
  {
    id: 'housing',
    label: 'Housing',
    templates: [
      { id: 'rent', name: 'Rent', emoji: '🏠', category: 'rent', defaultDay: 1 },
      { id: 'mortgage', name: 'Mortgage', emoji: '🏡', category: 'housing', defaultDay: 1 },
    ],
  },
  {
    id: 'utilities',
    label: 'Utilities',
    templates: [
      { id: 'electric', name: 'Electric', emoji: '⚡', category: 'utilities', defaultDay: 15 },
      { id: 'water', name: 'Water', emoji: '💧', category: 'utilities', defaultDay: 15 },
      { id: 'gas', name: 'Gas', emoji: '🔥', category: 'utilities', defaultDay: 15 },
      { id: 'trash-sewer', name: 'Trash/Sewer', emoji: '🗑️', category: 'utilities', defaultDay: 20 },
    ],
  },
  {
    id: 'phone',
    label: 'Phone',
    templates: [
      { id: 'tmobile', name: 'T-Mobile', emoji: '📱', category: 'phone', defaultDay: 25 },
      { id: 'att', name: 'AT&T', emoji: '📱', category: 'phone', defaultDay: 25 },
      { id: 'verizon', name: 'Verizon', emoji: '📱', category: 'phone', defaultDay: 25 },
      { id: 'cricket', name: 'Cricket', emoji: '📱', category: 'phone', defaultDay: 25 },
      { id: 'phone', name: 'Phone', emoji: '📱', category: 'phone', defaultDay: 25 },
    ],
  },
  {
    id: 'internet',
    label: 'Internet & Cable',
    templates: [
      { id: 'internet', name: 'Internet', emoji: '📶', category: 'internet', defaultDay: 20 },
      { id: 'comcast', name: 'Comcast/Xfinity', emoji: '📶', category: 'internet', defaultDay: 20 },
      { id: 'spectrum', name: 'Spectrum', emoji: '📶', category: 'internet', defaultDay: 20 },
      { id: 'cox', name: 'Cox', emoji: '📶', category: 'internet', defaultDay: 20 },
    ],
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    templates: [
      { id: 'netflix', name: 'Netflix', emoji: '🎬', category: 'subscription', defaultDay: 15 },
      { id: 'spotify', name: 'Spotify', emoji: '🎵', category: 'subscription', defaultDay: 15 },
      { id: 'disney', name: 'Disney+', emoji: '✨', category: 'subscription', defaultDay: 15 },
      { id: 'youtube-premium', name: 'YouTube Premium', emoji: '▶️', category: 'subscription', defaultDay: 15 },
      { id: 'hulu', name: 'Hulu', emoji: '📺', category: 'subscription', defaultDay: 15 },
      { id: 'amazon-prime', name: 'Amazon Prime', emoji: '📦', category: 'subscription', defaultDay: 15 },
      { id: 'apple-music', name: 'Apple Music', emoji: '🎧', category: 'subscription', defaultDay: 15 },
      { id: 'hbo-max', name: 'HBO Max', emoji: '🎬', category: 'subscription', defaultDay: 15 },
      { id: 'paramount-plus', name: 'Paramount+', emoji: '📺', category: 'subscription', defaultDay: 15 },
      { id: 'peacock', name: 'Peacock', emoji: '🦚', category: 'subscription', defaultDay: 15 },
      { id: 'icloud', name: 'iCloud', emoji: '☁️', category: 'subscription', defaultDay: 15 },
      { id: 'google-one', name: 'Google One', emoji: '☁️', category: 'subscription', defaultDay: 15 },
      { id: 'gym', name: 'Gym', emoji: '💪', category: 'health', defaultDay: 1 },
    ],
  },
  {
    id: 'credit',
    label: 'Credit Cards',
    templates: [
      { id: 'credit-card', name: 'Credit Card', emoji: '💳', category: 'credit_card', defaultDay: 25 },
      { id: 'chase', name: 'Chase', emoji: '💳', category: 'credit_card', defaultDay: 25 },
      { id: 'capital-one', name: 'Capital One', emoji: '💳', category: 'credit_card', defaultDay: 25 },
      { id: 'amex', name: 'Amex', emoji: '💳', category: 'credit_card', defaultDay: 25 },
      { id: 'discover', name: 'Discover', emoji: '💳', category: 'credit_card', defaultDay: 25 },
      { id: 'citi', name: 'Citi', emoji: '💳', category: 'credit_card', defaultDay: 25 },
    ],
  },
  {
    id: 'insurance',
    label: 'Insurance',
    templates: [
      { id: 'car-insurance', name: 'Car Insurance', emoji: '🚗', category: 'insurance', defaultDay: 15 },
      { id: 'state-farm', name: 'State Farm', emoji: '🛡️', category: 'insurance', defaultDay: 15 },
      { id: 'progressive', name: 'Progressive', emoji: '🛡️', category: 'insurance', defaultDay: 15 },
      { id: 'geico', name: 'GEICO', emoji: '🦎', category: 'insurance', defaultDay: 15 },
      { id: 'health-insurance', name: 'Health Insurance', emoji: '🏥', category: 'insurance', defaultDay: 1 },
      { id: 'renters-insurance', name: 'Renters Insurance', emoji: '🏢', category: 'insurance', defaultDay: 15 },
    ],
  },
  {
    id: 'loans',
    label: 'Loans',
    templates: [
      { id: 'car-loan', name: 'Car Loan', emoji: '🚗', category: 'loan', defaultDay: 15 },
      { id: 'student-loan', name: 'Student Loan', emoji: '🎓', category: 'loan', defaultDay: 15 },
      { id: 'personal-loan', name: 'Personal Loan', emoji: '💰', category: 'loan', defaultDay: 15 },
    ],
  },
];

// Helper to get the next occurrence of a day this month or next
export function getNextDueDateForDay(dayOfMonth: number): string {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let targetMonth = currentMonth;
  let targetYear = currentYear;

  // If the day has already passed this month, use next month
  if (dayOfMonth <= currentDay) {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }

  // Handle months with fewer days
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const safeDay = Math.min(dayOfMonth, daysInMonth);

  const date = new Date(targetYear, targetMonth, safeDay);
  return date.toISOString().split('T')[0];
}

// Helper to get all templates as a flat array
export function getAllTemplates(): BillTemplate[] {
  return BILL_TEMPLATES.flatMap(category => category.templates);
}

// Helper to get template by ID
export function getTemplateById(id: string): BillTemplate | undefined {
  return getAllTemplates().find(t => t.id === id);
}
