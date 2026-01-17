# BillCountdown Architecture

A comprehensive guide to the BillCountdown application architecture.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | Anthropic Claude (Sonnet) |
| Icons | Lucide React |
| Charts | Recharts |

---

## Project Structure

```
bill-countdown/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── bills/         # Bill CRUD + pay/undo
│   │   ├── ai/            # AI bill parsing
│   │   ├── gmail/         # Gmail OAuth & sync
│   │   └── preferences/   # User preferences
│   ├── dashboard/         # Dashboard pages
│   │   ├── analytics/     # Stats & charts
│   │   ├── calendar/      # Calendar view
│   │   ├── history/       # Payment history
│   │   └── settings/      # User settings
│   ├── login/             # Auth pages
│   ├── signup/
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── ui/               # Base UI (Toast, GradientCard)
│   ├── calendar/         # Calendar components
│   ├── analytics/        # Analytics components
│   └── settings/         # Settings components
├── contexts/              # React Context
│   └── theme-context.tsx  # Theme & preferences state
├── lib/                   # Utilities & integrations
│   ├── supabase/         # Supabase clients
│   ├── gmail/            # Gmail API client
│   ├── ai/               # AI prompts
│   ├── utils.ts          # General utilities
│   └── calendar-utils.ts # Calendar utilities
├── types/                 # TypeScript types
├── hooks/                 # Custom React hooks
├── supabase/migrations/   # Database migrations
└── public/               # Static assets
```

---

## Database Schema

### `bills` table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| name | text | Bill name (required) |
| amount | decimal | Bill amount |
| due_date | date | Due date (required) |
| emoji | text | Display emoji |
| category | text | utilities, subscription, rent, insurance, phone, internet, credit_card, loan, other |
| is_paid | boolean | Payment status |
| paid_at | timestamp | When marked paid |
| paid_method | text | manual, autopay |
| last_paid_amount | decimal | Amount actually paid |
| is_recurring | boolean | Is recurring bill |
| recurrence_interval | text | weekly, monthly, yearly |
| is_autopay | boolean | Autopay enabled |
| previous_amount | decimal | Previous amount (for price change detection) |
| payment_url | text | Direct payment link |
| source | text | manual, gmail |
| gmail_message_id | text | Source email ID |
| notes | text | User notes |
| created_at | timestamp | Created timestamp |
| updated_at | timestamp | Updated timestamp |

### `user_preferences` table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key (unique) |
| is_pro | boolean | Pro tier status |
| accent_color | text | Hex color |
| custom_urgency_colors | JSONB | Custom color palette |
| dashboard_layout | JSONB | Layout preferences |

### `gmail_tokens` table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key (unique) |
| email | text | Gmail address |
| access_token | text | OAuth access token |
| refresh_token | text | OAuth refresh token |
| expires_at | timestamp | Token expiry |
| last_sync_at | timestamp | Last sync time |

### Row-Level Security

All tables use RLS policies ensuring users only access their own data:
- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id`
- DELETE: `auth.uid() = user_id`

---

## API Routes

### Bills

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/bills` | Get all user bills |
| POST | `/api/bills` | Create new bill |
| GET | `/api/bills/[id]` | Get single bill |
| PUT | `/api/bills/[id]` | Update bill |
| DELETE | `/api/bills/[id]` | Delete bill |
| POST | `/api/bills/[id]/pay` | Mark as paid |
| DELETE | `/api/bills/[id]/pay` | Undo payment |
| POST | `/api/bills/import` | Batch import bills |

### AI

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/ai/parse-bills` | Extract bills from emails using Claude |

### Gmail

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/gmail/connect` | Start OAuth flow |
| POST | `/api/gmail/callback` | Handle OAuth callback |
| GET | `/api/gmail/disconnect` | Disconnect Gmail |
| POST | `/api/gmail/sync` | Fetch bill emails |

### Preferences

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/preferences` | Get user preferences |
| PUT | `/api/preferences` | Update preferences |

---

## Key Components

### Bill Display
- `BillCard` - Full card with countdown, urgency colors, badges
- `BillListItem` - Compact list row variant
- `CountdownDisplay` - Animated countdown timer

### Modals
- `AddBillModal` - Create/edit bill form
- `BillDetailModal` - Full bill details
- `BillImportModal` - Gmail import with AI parsing
- `DeleteBillModal` - Delete confirmation

### UI System
- `GradientCard` - Urgency-colored gradient card
- `Toast` - Toast notifications with undo support

### Dashboard Views
- Grid view (customizable cards per row)
- List view
- Calendar view with bill projections
- Analytics with charts

---

## State Management

### ThemeContext

Global state for theming and user preferences:

```typescript
interface ThemeContextType {
  isPro: boolean;
  accentColor: string;
  urgencyColors: UrgencyColors;
  dashboardLayout: DashboardLayout;
  isLoading: boolean;
  updateAccentColor: (color: string) => void;
  updateUrgencyColors: (colors: Partial<UrgencyColors>) => void;
  updateDashboardLayout: (layout: Partial<DashboardLayout>) => void;
  refreshPreferences: () => void;
}
```

Applies CSS variables to document root for dynamic theming:
- `--accent-primary`
- `--urgency-overdue`
- `--urgency-urgent`
- `--urgency-soon`
- `--urgency-safe`
- `--urgency-distant`

---

## Key Types

```typescript
// Bill urgency levels
type BillUrgency = 'overdue' | 'urgent' | 'soon' | 'safe' | 'distant';

// Bill categories
type BillCategory = 'utilities' | 'subscription' | 'rent' | 'insurance' |
                    'phone' | 'internet' | 'credit_card' | 'loan' | 'other';

// Recurrence options
type RecurrenceInterval = 'weekly' | 'monthly' | 'yearly';

// Payment methods
type PaidMethod = 'manual' | 'autopay';

// Dashboard layout
interface DashboardLayout {
  cardSize: 'compact' | 'default';
  defaultView: 'grid' | 'list';
  cardsPerRow: 2 | 3 | 4;
  showStatsBar: boolean;
  sortBy: 'due_date' | 'amount' | 'name';
}
```

---

## Utility Functions

### `lib/utils.ts`

| Function | Description |
|----------|-------------|
| `cn()` | Merge Tailwind classes |
| `getDaysUntilDue(date)` | Days until due |
| `getUrgency(days)` | Map days to urgency |
| `formatCurrency(amount)` | Format as USD |
| `formatDate(date)` | Format for display |
| `getNextDueDate(date, interval)` | Next recurring date |
| `getPriceChange(current, previous)` | Price change info |

### `lib/calendar-utils.ts`

| Function | Description |
|----------|-------------|
| `getMonthGrid(year, month)` | Generate calendar grid |
| `projectRecurringBills(bills, start, end)` | Project future bills |
| `getBillsForDate(bills, date)` | Filter bills by date |

---

## Key Flows

### Mark Bill as Paid

1. User clicks "Mark as Paid" button
2. POST to `/api/bills/[id]/pay`
3. Bill updated: `is_paid=true`, `paid_at=now()`
4. If recurring: Create next occurrence with `getNextDueDate()`
5. Show toast with undo option (10 seconds)
6. Undo: DELETE to `/api/bills/[id]/pay`, restore original state

### Gmail Import

1. User connects Gmail via OAuth
2. POST to `/api/gmail/sync` fetches bill-related emails
3. POST to `/api/ai/parse-bills` with email content
4. Claude extracts bill data (name, amount, date, category)
5. User reviews and selects bills to import
6. POST to `/api/bills/import` creates selected bills

### Recurring Bill Projection

1. `projectRecurringBills()` generates future occurrences
2. Calendar displays projected bills with visual indicator
3. When paid, actual next bill created in database

---

## Pro Features

Features gated behind `is_pro` flag:

- Custom accent color picker
- Custom urgency color palette
- Dashboard layout customization
- Cards per row setting
- Default view preference
- Sort order preference

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Gmail OAuth
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REDIRECT_URI=

# Anthropic AI
ANTHROPIC_API_KEY=
```

---

## Design Patterns

1. **Server Components** - Default for pages, data fetching
2. **Client Components** - Interactive elements with `'use client'`
3. **API Routes** - All data mutations through API
4. **RLS** - Database-level security
5. **CSS Variables** - Dynamic theming
6. **Optimistic Updates** - UI updates before API confirmation
7. **Toast Notifications** - Feedback with undo capability
