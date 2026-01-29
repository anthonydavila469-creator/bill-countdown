// Bill types for the countdown app

export type BillCategory =
  | 'utilities'
  | 'subscription'
  | 'rent'
  | 'housing'
  | 'insurance'
  | 'phone'
  | 'internet'
  | 'credit_card'
  | 'loan'
  | 'health'
  | 'other';

// Icon keys for bill categories
export type BillIconKey =
  | 'home'
  | 'bolt'
  | 'wifi'
  | 'tv'
  | 'phone'
  | 'creditcard'
  | 'shield'
  | 'car'
  | 'heart'
  | 'dumbbell'
  | 'water'
  | 'flame'
  | 'trash'
  | 'building'
  | 'music'
  | 'film'
  | 'dollar'
  | 'file';

export type BillUrgency = 'overdue' | 'urgent' | 'soon' | 'safe' | 'distant';

// Universal urgency colors - NEVER change per theme
// These remain consistent across all themes for instant recognition
export const UNIVERSAL_URGENCY_COLORS = {
  overdue: '#f43f5e',  // Rose - past due
  urgent: '#f97316',   // Orange - 1-3 days
  soon: '#eab308',     // Yellow - 4-7 days
  safe: '#22c55e',     // Green - 8-14 days
  distant: '#06b6d4',  // Cyan - 15+ days
} as const;

// Color theme system
export type ColorThemeId = 'default' | 'ocean' | 'sunset' | 'midnight' | 'forest' | 'monochrome';

export interface ColorTheme {
  id: ColorThemeId;
  name: string;
  description: string;
  cardGradient: string;  // CSS gradient for card backgrounds
  accentColor: string;   // Accent color for buttons, links
}

export const COLOR_THEMES: Record<ColorThemeId, ColorTheme> = {
  default: {
    id: 'default',
    name: 'Default',
    description: 'Teal gradient with indigo accents',
    cardGradient: 'linear-gradient(135deg, rgba(13, 148, 136, 0.35) 0%, rgba(15, 118, 110, 0.25) 100%)',
    accentColor: '#6366f1',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cool, calming blues',
    cardGradient: 'linear-gradient(135deg, rgba(2, 132, 199, 0.35) 0%, rgba(3, 105, 161, 0.25) 100%)',
    accentColor: '#0ea5e9',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm coral and orange',
    cardGradient: 'linear-gradient(135deg, rgba(249, 115, 22, 0.35) 0%, rgba(234, 88, 12, 0.25) 100%)',
    accentColor: '#f97316',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Premium purple vibes',
    cardGradient: 'linear-gradient(135deg, rgba(124, 58, 237, 0.35) 0%, rgba(109, 40, 217, 0.25) 100%)',
    accentColor: '#8b5cf6',
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Natural, grounded greens',
    cardGradient: 'linear-gradient(135deg, rgba(5, 150, 105, 0.35) 0%, rgba(4, 120, 87, 0.25) 100%)',
    accentColor: '#10b981',
  },
  monochrome: {
    id: 'monochrome',
    name: 'Mono',
    description: 'Minimal and professional',
    cardGradient: 'linear-gradient(135deg, rgba(82, 82, 91, 0.35) 0%, rgba(63, 63, 70, 0.25) 100%)',
    accentColor: '#6b7280',
  },
};

export const DEFAULT_COLOR_THEME: ColorThemeId = 'default';

export type RecurrenceInterval = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export type BillSource = 'manual' | 'gmail';

export type PaidMethod = 'manual' | 'autopay';

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
  paid_method: PaidMethod | null; // How the bill was paid
  last_paid_amount: number | null; // Amount that was paid
  is_recurring: boolean;
  recurrence_interval: RecurrenceInterval | null;
  recurrence_day_of_month: number | null; // 1-31 for monthly bills
  recurrence_weekday: number | null; // 0-6 (Sunday-Saturday) for weekly/biweekly
  next_due_date: string | null; // Pre-computed next due date
  parent_bill_id: string | null; // Reference to original recurring bill
  generated_next: boolean; // Flag to prevent duplicate generation
  source: BillSource;
  gmail_message_id: string | null;
  notes: string | null;
  payment_url: string | null;
  is_autopay: boolean; // Whether bill is on automatic payment
  previous_amount: number | null; // Previous amount for price change detection
  is_variable: boolean; // Whether bill amount changes each month
  typical_min: number | null; // Minimum typical amount for variable bills
  typical_max: number | null; // Maximum typical amount for variable bills
  icon_key: BillIconKey | null; // Icon identifier for display
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
  recurrence_day_of_month: number | null;
  recurrence_weekday: number | null;
  notes: string | null;
  payment_url: string | null;
  is_autopay: boolean;
  is_variable: boolean;
  typical_min: number | null;
  typical_max: number | null;
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
  housing: '🏡',
  insurance: '🛡️',
  phone: '📱',
  internet: '📡',
  credit_card: '💳',
  loan: '🏦',
  health: '💪',
  other: '📄',
};

// Category to icon key mapping
export const categoryIconKeys: Record<BillCategory, BillIconKey> = {
  utilities: 'bolt',
  subscription: 'tv',
  rent: 'home',
  housing: 'building',
  insurance: 'shield',
  phone: 'phone',
  internet: 'wifi',
  credit_card: 'creditcard',
  loan: 'dollar',
  health: 'heart',
  other: 'file',
};

// Category display labels
export const categoryLabels: Record<BillCategory, string> = {
  utilities: 'Utilities',
  subscription: 'Subscriptions',
  rent: 'Rent',
  housing: 'Housing',
  insurance: 'Insurance',
  phone: 'Phone',
  internet: 'Internet',
  credit_card: 'Credit Card',
  loan: 'Loan',
  health: 'Health',
  other: 'Other',
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
  payment_url?: string | null;  // Payment link from email
  confidence: number; // 0-1 confidence score
  source_email_id: string;
}

// Rule-based bill suggestion from email scanning
export interface BillSuggestion {
  gmail_message_id: string;
  email_subject: string;
  email_from: string;
  email_date: string;
  email_snippet: string;
  name_guess: string;
  amount_guess: number | null;
  due_date_guess: string | null;
  category_guess: BillCategory | null;
  confidence: number; // 0-1 based on keyword matches
  matched_keywords: string[];
  is_possible_duplicate: boolean;
  duplicate_bill_id?: string;
  duplicate_reason?: string;
  // Payment link info
  payment_url?: string | null;
  payment_confidence?: number | null;
  is_view_online_bill?: boolean; // True if bill has payment link but missing amount/date
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

// Legacy type - kept for backwards compatibility but now derived from UNIVERSAL_URGENCY_COLORS
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

// Subscription types
export type SubscriptionStatus = 'free' | 'active' | 'canceled' | 'past_due';
export type SubscriptionPlan = 'monthly' | 'yearly' | null;

export interface UserPreferences {
  id: string;
  user_id: string;
  is_pro: boolean;
  color_theme: ColorThemeId;
  dashboard_layout: DashboardLayout;
  // Stripe subscription fields
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_plan: SubscriptionPlan;
  subscription_current_period_end: string | null;
  subscription_cancel_at_period_end: boolean;
  gmail_syncs_used: number;
  created_at: string;
  updated_at: string;
}

// Default values for preferences
// Now uses UNIVERSAL_URGENCY_COLORS - kept for backwards compatibility
export const DEFAULT_URGENCY_COLORS: UrgencyColors = {
  overdue: UNIVERSAL_URGENCY_COLORS.overdue,
  urgent: UNIVERSAL_URGENCY_COLORS.urgent,
  soon: UNIVERSAL_URGENCY_COLORS.soon,
  safe: UNIVERSAL_URGENCY_COLORS.safe,
  distant: UNIVERSAL_URGENCY_COLORS.distant,
};

// Legacy - now derived from theme
export const DEFAULT_ACCENT_COLOR = COLOR_THEMES.default.accentColor;

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  cardSize: 'default',
  defaultView: 'grid',
  cardsPerRow: 3,
  showStatsBar: true,
  sortBy: 'due_date',
};

// Paycheck Mode Types
export type PaySchedule = 'weekly' | 'biweekly' | 'monthly';

export interface PaycheckSettings {
  enabled: boolean;
  schedule: PaySchedule;
  next_payday: string; // YYYY-MM-DD format
  amount: number | null; // In dollars, or null if not set
}

export type PaycheckRiskLevel = 'safe' | 'tight' | 'short';

export interface PaycheckSummary {
  nextPayday: string;
  billsBeforePayday: number;
  billsAfterPayday: number;
  totalBeforePayday: number; // In dollars
  totalAfterPayday: number; // In dollars
  moneyLeft: number | null; // In dollars, null if no paycheck amount set
  riskLevel: PaycheckRiskLevel | null;
}

export const DEFAULT_PAYCHECK_SETTINGS: PaycheckSettings = {
  enabled: false,
  schedule: 'biweekly',
  next_payday: '',
  amount: null,
};

// Notification Types
export type NotificationChannel = 'email' | 'push';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface NotificationSettings {
  email_enabled: boolean;
  push_enabled: boolean;
  lead_days: number; // Days before due date to send reminder
  quiet_start: string | null; // HH:MM format
  quiet_end: string | null; // HH:MM format
  timezone: string; // IANA timezone
  auto_sync_enabled: boolean; // Auto-sync Gmail daily
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  created_at: string;
}

export interface BillNotification {
  id: string;
  user_id: string;
  bill_id: string;
  scheduled_for: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  email_enabled: true,
  push_enabled: false,
  lead_days: 3,
  quiet_start: null,
  quiet_end: null,
  timezone: 'America/New_York',
  auto_sync_enabled: true,
};

// Sync Types
export type SyncType = 'manual' | 'auto';
export type SyncStatus = 'running' | 'completed' | 'failed' | 'skipped';

export interface SyncLog {
  id: string;
  user_id: string;
  sync_type: SyncType;
  started_at: string;
  completed_at: string | null;
  status: SyncStatus;
  emails_fetched: number;
  emails_filtered: number;
  emails_processed: number;
  bills_created: number;
  bills_needs_review: number;
  ai_tokens_used: number;
  error_message: string | null;
  created_at: string;
}

export interface SyncResult {
  success: boolean;
  syncLogId?: string;
  emailsFetched: number;
  emailsFiltered: number;
  emailsProcessed: number;
  billsCreated: number;
  billsNeedsReview: number;
  error?: string;
}
