// Bill types for the countdown app

export type BillCategory =
  | 'utilities'
  | 'subscription'
  | 'rent'
  | 'insurance'
  | 'phone'
  | 'internet'
  | 'credit_card'
  | 'loan'
  | 'other';

export type BillUrgency = 'overdue' | 'urgent' | 'soon' | 'safe' | 'distant';

export type RecurrenceInterval = 'weekly' | 'monthly' | 'yearly';

export type BillSource = 'manual' | 'gmail';

export interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number | null;
  due_date: string; // YYYY-MM-DD format
  emoji: string;
  category: BillCategory | null;
  is_paid: boolean;
  paid_at: string | null;
  is_recurring: boolean;
  recurrence_interval: RecurrenceInterval | null;
  source: BillSource;
  gmail_message_id: string | null;
  notes: string | null;
  payment_url: string | null;
  is_autopay: boolean; // Whether bill is on automatic payment
  previous_amount: number | null; // Previous amount for price change detection
  created_at: string;
  updated_at: string;
}

export interface BillFormData {
  name: string;
  amount: number | null;
  due_date: string;
  emoji: string;
  category: BillCategory | null;
  is_recurring: boolean;
  recurrence_interval: RecurrenceInterval | null;
  notes: string | null;
  payment_url: string | null;
  is_autopay: boolean;
}

// Price change detection result
export interface PriceChange {
  amount: number; // Absolute difference
  percentage: number; // Percentage change
  isIncrease: boolean;
}

// Category emoji mapping
export const categoryEmojis: Record<BillCategory, string> = {
  utilities: '💡',
  subscription: '📺',
  rent: '🏠',
  insurance: '🛡️',
  phone: '📱',
  internet: '📡',
  credit_card: '💳',
  loan: '🏦',
  other: '📄',
};

// Urgency gradient mapping
export const urgencyGradients: Record<BillUrgency, string> = {
  overdue: 'from-red-500 to-rose-600',
  urgent: 'from-orange-400 to-amber-500',
  soon: 'from-yellow-400 to-orange-400',
  safe: 'from-green-400 to-emerald-500',
  distant: 'from-blue-400 to-indigo-500',
};

// Urgency background colors for cards
export const urgencyBgColors: Record<BillUrgency, string> = {
  overdue: 'bg-gradient-to-br from-red-500 to-rose-600',
  urgent: 'bg-gradient-to-br from-orange-400 to-amber-500',
  soon: 'bg-gradient-to-br from-yellow-400 to-orange-400',
  safe: 'bg-gradient-to-br from-green-400 to-emerald-500',
  distant: 'bg-gradient-to-br from-blue-400 to-indigo-500',
};

// Gmail connection status
export interface GmailStatus {
  connected: boolean;
  email?: string;
  lastSyncAt?: string;
  connectedAt?: string;
}

// Email data from Gmail sync
export interface EmailData {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  body: string;
}

// Parsed bill from AI
export interface ParsedBill {
  name: string;
  amount: number | null;
  due_date: string | null;
  category: BillCategory | null;
  is_recurring: boolean;
  recurrence_interval: RecurrenceInterval | null;
  confidence: number; // 0-1 confidence score
  source_email_id: string;
}

// Bill anomaly detection
export type AnomalyType = 'unusual_amount' | 'price_increase' | 'duplicate' | 'early_due_date';
export type AnomalySeverity = 'low' | 'medium' | 'high';

export interface BillAnomaly {
  bill_id: string;
  anomaly_type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  comparison_amount?: number;
  confidence: number;
}

// User preferences for pro tier customization
export type CardSize = 'compact' | 'default';
export type DashboardView = 'grid' | 'list';
export type SortBy = 'due_date' | 'amount' | 'name';

export interface UrgencyColors {
  overdue: string;
  urgent: string;
  soon: string;
  safe: string;
  distant: string;
}

export interface DashboardLayout {
  cardSize: CardSize;
  defaultView: DashboardView;
  cardsPerRow: 2 | 3 | 4;
  showStatsBar: boolean;
  sortBy: SortBy;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  is_pro: boolean;
  accent_color: string;
  custom_urgency_colors: UrgencyColors;
  dashboard_layout: DashboardLayout;
  created_at: string;
  updated_at: string;
}

// Default values for preferences
export const DEFAULT_URGENCY_COLORS: UrgencyColors = {
  overdue: '#f43f5e',
  urgent: '#f97316',
  soon: '#fbbf24',
  safe: '#34d399',
  distant: '#60a5fa',
};

export const DEFAULT_ACCENT_COLOR = '#6366f1';

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  cardSize: 'default',
  defaultView: 'grid',
  cardsPerRow: 3,
  showStatsBar: true,
  sortBy: 'due_date',
};
