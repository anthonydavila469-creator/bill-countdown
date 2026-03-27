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
  overdue: '#ef4444',  // Red - past due
  urgent: '#f97316',   // Orange - 1-3 days
  soon: '#eab308',     // Yellow - 4-7 days
  safe: '#22c55e',     // Green - 8-14 days
  distant: '#3b82f6',  // Blue - 15+ days
} as const;

// Urgency gradient pairs for gradient text effects - vibrant colorful gradients
export const URGENCY_GRADIENTS = {
  overdue: { from: '#f472b6', to: '#9333ea' },   // Pink to purple
  urgent: { from: '#fbbf24', to: '#f97316' },    // Yellow to orange
  soon: { from: '#a3e635', to: '#22c55e' },      // Lime to green
  safe: { from: '#4ade80', to: '#06b6d4' },      // Green to cyan
  distant: { from: '#22d3ee', to: '#6366f1' },   // Cyan to indigo
} as const;

// Color theme system — Anthony's 5 picks
export type ColorThemeId = 'sunrise' | 'haze' | 'aurora' | 'tropical' | 'peach';

export interface ColorTheme {
  id: ColorThemeId;
  name: string;
  description: string;
  cardGradient: string;  // CSS gradient for card backgrounds
  accentColor: string;   // Accent color for buttons, links
  glowColor: string;     // Subtle box-shadow for cards
  preview: {             // Preview colors for theme card display
    primary: string;     // Top color (lighter)
    secondary: string;   // Bottom color (darker)
  };
}

export const COLOR_THEMES: Record<ColorThemeId, ColorTheme> = {
  sunrise: {
    id: 'sunrise',
    name: 'Sunrise',
    description: 'Warm & golden',
    cardGradient: 'linear-gradient(135deg, #f97316 0%, #ef4444 50%, #db2777 100%)',
    accentColor: '#fb923c',
    glowColor: '0 8px 32px rgba(249, 115, 22, 0.3)',
    preview: {
      primary: '#f97316',
      secondary: '#db2777',
    },
  },
  haze: {
    id: 'haze',
    name: 'Haze',
    description: 'Cool & misty',
    cardGradient: 'linear-gradient(135deg, #2d1b4e 0%, #4c1d95 50%, #581c87 100%)',
    accentColor: '#a78bfa',
    glowColor: '0 8px 32px rgba(45, 27, 78, 0.5)',
    preview: {
      primary: '#2d1b4e',
      secondary: '#581c87',
    },
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    description: 'Northern lights',
    cardGradient: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #0891b2 100%)',
    accentColor: '#2dd4bf',
    glowColor: '0 8px 32px rgba(13, 148, 136, 0.3)',
    preview: {
      primary: '#059669',
      secondary: '#0891b2',
    },
  },
  tropical: {
    id: 'tropical',
    name: 'Tropical',
    description: 'Ocean blue',
    cardGradient: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #0ea5e9 100%)',
    accentColor: '#38bdf8',
    glowColor: '0 8px 32px rgba(37, 99, 235, 0.3)',
    preview: {
      primary: '#1e3a5f',
      secondary: '#0ea5e9',
    },
  },
  peach: {
    id: 'peach',
    name: 'Peach',
    description: 'Soft & rosy',
    cardGradient: 'linear-gradient(135deg, #f472b6 0%, #c084fc 50%, #a78bfa 100%)',
    accentColor: '#f472b6',
    glowColor: '0 8px 32px rgba(244, 114, 182, 0.25)',
    preview: {
      primary: '#f472b6',
      secondary: '#a78bfa',
    },
  },
};

export const DEFAULT_COLOR_THEME: ColorThemeId = 'haze';

export type RecurrenceInterval = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export type BillSource = 'manual' | 'gmail' | 'yahoo' | 'outlook';

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
  account_last4?: string | null;
  review_reason?: string | null;
  payment_url: string | null;
  is_autopay: boolean; // Whether bill is on automatic payment
  previous_amount: number | null; // Previous amount for price change detection
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
  source?: BillSource;
  payment_url?: string | null;  // Payment link from email
  confidence: number; // 0-1 confidence score
  source_email_id: string;
}

// Rule-based bill suggestion from email scanning
export interface BillSuggestion {
  gmail_message_id: string;
  provider?: BillSource;
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
export type NumberColorMode = 'white' | 'urgency' | 'gradient';

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
  numberColorMode: NumberColorMode;
}

// Subscription types
export type SubscriptionStatus =
  | 'free'
  | 'active'
  | 'trialing'
  | 'canceled'
  | 'past_due'
  | 'billing_issue'
  | 'expired';
export type SubscriptionTier = 'free' | 'pro';
export type SubscriptionPlan = 'monthly' | 'yearly' | null;

export type RevenueCatWebhookEventType =
  | 'TEST'
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'PRODUCT_CHANGE'
  | 'CANCELLATION'
  | 'UNCANCELLATION'
  | 'NON_RENEWING_PURCHASE'
  | 'SUBSCRIPTION_PAUSED'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'TRANSFER'
  | 'SUBSCRIBER_ALIAS'
  | 'REFUND'
  | 'REFUND_REVERSED'
  | 'TEMPORARY_ENTITLEMENT_GRANT'
  | 'INVOICE_ISSUANCE'
  | 'VIRTUAL_CURRENCY_TRANSACTION'
  | 'PREPAID_PURCHASE'
  | 'SUBSCRIPTION_EXTENDED'
  | 'RENEWAL_EXTENDED';

export interface RevenueCatWebhookEvent {
  type: RevenueCatWebhookEventType;
  app_user_id: string;
  original_app_user_id?: string | null;
  aliases?: string[] | null;
  transferred_from?: string[] | null;
  transferred_to?: string[] | null;
  entitlement_ids?: string[] | null;
  product_id?: string | null;
  period_type?: string | null;
  expiration_at_ms?: number | null;
  purchased_at_ms?: number | null;
  event_timestamp_ms?: number | null;
  cancellation_reason?: string | null;
  store?: string | null;
  environment?: string | null;
}

export interface RevenueCatWebhookPayload {
  api_version?: string;
  event: RevenueCatWebhookEvent;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  is_pro: boolean;
  color_theme: ColorThemeId;
  dashboard_layout: DashboardLayout;
  email_provider: 'gmail' | 'yahoo' | 'outlook';
  email_connected: boolean;
  gmail_connected: boolean;
  gmail_access_token: string | null;
  gmail_refresh_token: string | null;
  gmail_token_expires_at: string | null;
  // Stripe subscription fields
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_plan: SubscriptionPlan;
  subscription_current_period_end: string | null;
  subscription_cancel_at_period_end: boolean;
  gmail_syncs_used: number;
  trial_ends_at: string | null;
  // RevenueCat subscription fields
  subscription_tier: SubscriptionTier;
  revenucat_customer_id: string | null;
  subscription_expires_at: string | null;
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
export const DEFAULT_ACCENT_COLOR = COLOR_THEMES.haze.accentColor;

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  cardSize: 'default',
  defaultView: 'grid',
  cardsPerRow: 3,
  showStatsBar: true,
  sortBy: 'due_date',
  numberColorMode: 'white',
};

// Notification Types
export type NotificationChannel = 'email' | 'push' | 'in_app';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'skipped';
export type ReminderPreference = 'disabled' | '1day' | '3days' | '7days';

export interface NotificationSettings {
  email_enabled: boolean;
  push_enabled: boolean;
  remind_me: ReminderPreference;
  lead_days: number; // Days before due date to send reminder (legacy, single value)
  reminder_days: number[]; // Days before due date to send reminders (multi-select)
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
  read_at: string | null;
  message: string | null;
  created_at: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  email_enabled: true,
  push_enabled: false,
  remind_me: '3days',
  lead_days: 3,
  reminder_days: [3],
  timezone: 'America/Chicago',
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
