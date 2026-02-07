# Duezo App - Architecture Documentation

## Overview

Duezo is a web application that helps users track bill due dates with beautiful countdown cards. It features AI-powered email sync to automatically detect bills from Gmail.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth & Database | Supabase |
| Email Integration | Gmail API (OAuth) |
| AI Parsing | Claude API |
| Deployment | Vercel |

## Project Structure

```
duezo/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Landing page
│   ├── login/page.tsx            # Login page
│   ├── signup/page.tsx           # Signup page
│   ├── dashboard/
│   │   ├── page.tsx              # Main dashboard
│   │   ├── history/page.tsx      # Paid bills history (Phase 3)
│   │   └── settings/page.tsx     # Settings & Gmail connect (Phase 4)
│   └── api/                      # API routes (Phase 2+)
│       ├── bills/                # Bill CRUD endpoints
│       ├── gmail/                # Gmail OAuth endpoints
│       └── ai/                   # AI parsing endpoints
│
├── components/                   # React components
│   ├── ui/                       # Base UI components
│   │   └── gradient-card.tsx     # Gradient card with urgency colors
│   ├── bill-card.tsx             # Bill card (grid & list variants)
│   ├── bill-form.tsx             # Bill form with validation
│   ├── add-bill-modal.tsx        # Add/Edit bill modal
│   ├── delete-bill-modal.tsx     # Delete confirmation modal
│   ├── bill-detail-modal.tsx     # Bill details with mark paid action
│   ├── bill-import-modal.tsx     # AI import flow modal
│   ├── countdown-display.tsx     # Large countdown number
│   ├── animated-number.tsx       # Animated counting numbers
│   ├── empty-state.tsx           # Empty state illustrations
│   └── page-transition.tsx       # Loading skeletons and transitions
│
├── lib/                          # Utilities and clients
│   ├── utils.ts                  # Helper functions
│   ├── supabase/                 # Supabase clients
│   │   ├── client.ts             # Browser client
│   │   └── server.ts             # Server client
│   ├── gmail/                    # Gmail API utilities
│   │   └── client.ts             # OAuth & email fetching
│   └── ai/                       # AI utilities
│       └── prompts.ts            # Bill extraction prompts
│
├── types/                        # TypeScript types
│   └── index.ts                  # Bill types, categories, etc.
│
├── hooks/                        # Custom React hooks
│   ├── use-bills.ts              # Bill data fetching hooks
│   └── use-notifications.ts      # Browser notification hooks
│
└── docs/                         # Documentation
    └── ARCHITECTURE.md           # This file
```

## Data Flow

### User Authentication Flow
```
User → Login/Signup Page → Supabase Auth → Dashboard
                              ↓
                        JWT stored in cookies
```

### Bill Data Flow
```
Dashboard Page
      ↓
  API Route (/api/bills)
      ↓
  Supabase (PostgreSQL)
      ↓
  Bills returned to UI
      ↓
  BillCard components render
```

### Gmail Sync Flow (Phase 4-5)
```
User clicks "Connect Gmail"
      ↓
  Gmail OAuth (/api/gmail/connect)
      ↓
  User authorizes in Google popup
      ↓
  Callback receives tokens (/api/gmail/callback)
      ↓
  Tokens stored in Supabase (encrypted)
      ↓
  User clicks "Sync Bills"
      ↓
  Fetch emails (/api/gmail/sync)
      ↓
  Parse with Claude AI (/api/ai/parse-bill)
      ↓
  User reviews extracted bills
      ↓
  Confirmed bills saved to database
```

## Database Schema

### Bills Table
```sql
create table public.bills (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  amount decimal(10,2),
  due_date date not null,
  emoji text default '📄',
  category text,
  is_paid boolean default false,
  is_recurring boolean default false,
  recurrence_interval text,  -- 'weekly', 'monthly', 'yearly'
  source text default 'manual',  -- 'manual', 'gmail'
  created_at timestamp with time zone default now()
);

-- Row Level Security
alter table public.bills enable row level security;

create policy "Users can view own bills" on public.bills
  for select using (auth.uid() = user_id);

create policy "Users can insert own bills" on public.bills
  for insert with check (auth.uid() = user_id);

create policy "Users can update own bills" on public.bills
  for update using (auth.uid() = user_id);

create policy "Users can delete own bills" on public.bills
  for delete using (auth.uid() = user_id);
```

### Gmail Tokens Table
```sql
create table public.gmail_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  email text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamp with time zone not null,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Row Level Security
alter table public.gmail_tokens enable row level security;

-- Users can only access their own tokens
create policy "Users can manage own gmail tokens" on public.gmail_tokens
  for all using (auth.uid() = user_id);
```

## Key Components

### GradientCard
Base component for the colored countdown cards. Accepts an `urgency` prop that determines the gradient color:

| Urgency | Days Left | Gradient |
|---------|-----------|----------|
| overdue | < 0 | Red (rose-500 → red-600) |
| urgent | 0-3 | Orange (orange-400 → amber-500) |
| soon | 4-7 | Yellow (amber-400 → orange-400) |
| safe | 8-30 | Green (emerald-400 → teal-500) |
| distant | 30+ | Blue (blue-400 → violet-500) |

### BillCard
Displays a single bill with:
- Emoji and name
- Amount (if available)
- Large countdown number
- Due date
- Recurring badge (if applicable)

Two variants:
- `default`: Full card with all details
- `compact`: Horizontal layout for tighter spaces

### CountdownDisplay
The hero countdown number with:
- Three sizes: sm, md, lg
- "days left" / "days overdue" label
- Pulsing indicator for urgent/overdue bills

### BillDetailModal
Full-screen modal showing bill details:
- Header with gradient matching urgency
- Countdown display
- Due date, category, recurring info, notes
- **Mark as Paid** button (green gradient)
- Edit and Delete action buttons
- Escape key to close

### AddBillModal
Form modal for creating/editing bills:
- Emoji picker with category presets
- Bill name, amount, due date fields
- Category dropdown
- Recurring toggle with interval selector
- Notes textarea
- Validation and error handling

### DeleteBillModal
Confirmation modal with:
- Warning icon and bill name
- Cancel and Delete buttons
- Prevents accidental deletions

## Mark as Paid Flow

When a user marks a bill as paid:

```
User clicks bill card
      ↓
  BillDetailModal opens
      ↓
  User clicks "Mark as Paid"
      ↓
  POST /api/bills/[id]/pay
      ↓
  Bill updated: is_paid=true, paid_at=now()
      ↓
  If recurring:
      → Calculate next due date
      → Create new bill with future date
      ↓
  Original bill moves to history
  New bill appears in dashboard
```

## Gmail API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gmail/connect` | GET | Redirects to Google OAuth consent screen |
| `/api/gmail/callback` | GET | Handles OAuth callback, stores tokens |
| `/api/gmail/sync` | GET | Returns connection status |
| `/api/gmail/sync` | POST | Fetches bill-related emails |
| `/api/gmail/disconnect` | POST | Removes stored tokens |

### Email Search Queries
The Gmail sync uses these patterns to find bills:
```
subject:(bill OR invoice OR statement OR payment due)
from:(billing OR invoices OR payments OR noreply)
subject:(your bill is ready OR payment reminder OR due date)
```

## AI API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/parse-bills` | POST | Parse emails with Claude to extract bill info |
| `/api/bills/import` | POST | Import parsed bills to database |

### AI Bill Extraction Flow
```
User clicks "Import Bills with AI"
      ↓
  BillImportModal opens
      ↓
  Step 1: POST /api/gmail/sync (fetch emails)
      ↓
  Step 2: POST /api/ai/parse-bills (AI extracts bill data)
      ↓
  Step 3: User reviews extracted bills
      → Edit amounts/dates if needed
      → Select which bills to import
      ↓
  POST /api/bills/import (save selected bills)
      ↓
  Redirect to dashboard
```

### Parsed Bill Fields
The AI extracts:
- **name**: Company/service name
- **amount**: Payment amount (nullable)
- **due_date**: Due date in YYYY-MM-DD format (nullable)
- **category**: Bill category for emoji assignment
- **is_recurring**: Whether bill repeats
- **recurrence_interval**: weekly/monthly/yearly
- **confidence**: 0-1 score of extraction accuracy

## Security

### Authentication
- Supabase Auth with email/password and Google OAuth
- JWT tokens stored in HTTP-only cookies
- Protected routes check auth before rendering

### Database Security
- Row Level Security (RLS) on all tables
- Users can only access their own data
- Service role key never exposed to client

### Gmail Integration
- OAuth 2.0 with minimal scopes (read-only)
- Refresh tokens encrypted before storage
- Only bill-related emails are processed

## Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Gmail OAuth (Phase 4)
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REDIRECT_URI=

# AI Parsing (Phase 5)
ANTHROPIC_API_KEY=
```

## Development Phases

### Phase 1: Foundation ✅
- Project setup
- UI components
- Landing page
- Auth pages (UI only)
- Dashboard with demo data

### Phase 2: Bill CRUD ✅
- API routes for bills (`/api/bills`, `/api/bills/[id]`)
- Database migration script
- Bill form component with emoji picker
- Add/Edit bill modal
- Delete bill confirmation modal
- useBills hook for data fetching

### Phase 3: Mark as Paid & History ✅
- Mark bills as paid (demo mode works locally)
- Bill detail modal with pay/edit/delete actions
- Recurring bill logic (auto-creates next occurrence)
- API route for marking paid (`/api/bills/[id]/pay`)
- Payment history page (`/dashboard/history`)
- Bills grouped by month in history view

### Phase 4: Gmail Integration ✅
- Settings page with Gmail connection UI
- Gmail OAuth flow (connect, callback, disconnect routes)
- Gmail client library with token refresh
- Email sync route to fetch bill-related emails
- Database migration for storing tokens
- Bill search queries (subject, from patterns)

### Phase 5: AI Parsing ✅
- Anthropic SDK integration
- Bill extraction prompts with structured output
- AI parse-bills API route
- Bill import modal with multi-step flow
- Review interface for parsed bills
- Batch import API route

### Phase 6: Final Polish ✅
- Animated number components (AnimatedNumber, FlipNumber, CountdownTimer)
- Browser notification system with permission handling
- PWA manifest with app icons and shortcuts
- Empty state illustrations with SVG graphics
- Page transition animations and loading skeletons
- CSS animations (confetti, shine, glow, pulse, typewriter)
- Skeleton loading components for better UX

## Testing

Manual testing checklist:

### Phase 1: Foundation
1. Landing page loads and displays demo cards
2. Auth pages render correctly
3. Dashboard shows bills in grid/list view
4. Cards change color based on urgency
5. Responsive on mobile devices
6. Dark mode works (system preference)

### Phase 2: Bill CRUD
7. Add bill modal opens and validates input
8. New bills appear in dashboard sorted by due date
9. Click bill → opens detail modal
10. Edit bill pre-fills form with existing data
11. Delete bill shows confirmation and removes from list

### Phase 3: Mark as Paid & History
12. Click bill card → detail modal opens with countdown
13. Mark as Paid button updates bill state
14. Recurring bill creates next occurrence automatically
15. History page shows paid bills grouped by month
16. Search filters bills in dashboard and history

### Phase 4: Gmail Integration
17. Settings page displays Gmail connection status
18. Connect Gmail redirects to Google OAuth
19. Callback stores tokens and redirects to settings
20. Sync Now fetches bill-related emails
21. Disconnect removes stored tokens
22. Token refresh works when access token expires

### Phase 5: AI Parsing
23. Import modal opens from settings page
24. Step indicators show sync → parse → review flow
25. AI extracts bill info from emails
26. User can edit amount and due date inline
27. Confidence indicators show extraction quality
28. Select/deselect bills for import
29. Import saves bills to database

### Phase 6: Final Polish
30. Animated numbers count smoothly between values
31. Browser notifications request permission
32. PWA installs from browser
33. Empty states show appropriate illustrations
34. Loading skeletons display during data fetch
35. Page transitions animate smoothly
36. Confetti shows on special actions
