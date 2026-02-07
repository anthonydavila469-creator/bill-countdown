'use client';

import { cn } from '@/lib/utils';

type EmptyStateType = 'no-bills' | 'no-results' | 'all-paid' | 'error' | 'no-history';

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

// SVG illustrations for different states
function NoBillsIllustration() {
  return (
    <svg
      width="160"
      height="160"
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mb-6"
    >
      {/* Background circle */}
      <circle cx="80" cy="80" r="70" fill="url(#noBillsGradient)" fillOpacity="0.1" />

      {/* Document stack */}
      <rect
        x="45"
        y="55"
        width="60"
        height="75"
        rx="8"
        fill="#27272a"
        stroke="#3f3f46"
        strokeWidth="2"
      />
      <rect
        x="50"
        y="50"
        width="60"
        height="75"
        rx="8"
        fill="#27272a"
        stroke="#3f3f46"
        strokeWidth="2"
      />
      <rect
        x="55"
        y="45"
        width="60"
        height="75"
        rx="8"
        fill="#18181b"
        stroke="#3f3f46"
        strokeWidth="2"
      />

      {/* Lines on document */}
      <rect x="65" y="60" width="40" height="4" rx="2" fill="#3f3f46" />
      <rect x="65" y="72" width="30" height="4" rx="2" fill="#3f3f46" />
      <rect x="65" y="84" width="35" height="4" rx="2" fill="#3f3f46" />

      {/* Plus icon */}
      <circle cx="120" cy="40" r="18" fill="#3b82f6" />
      <path
        d="M120 32V48M112 40H128"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <defs>
        <linearGradient id="noBillsGradient" x1="0" y1="0" x2="160" y2="160">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function NoResultsIllustration() {
  return (
    <svg
      width="160"
      height="160"
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mb-6"
    >
      {/* Background */}
      <circle cx="80" cy="80" r="70" fill="url(#noResultsGradient)" fillOpacity="0.1" />

      {/* Magnifying glass */}
      <circle
        cx="70"
        cy="70"
        r="30"
        fill="#18181b"
        stroke="#3f3f46"
        strokeWidth="3"
      />
      <path
        d="M92 92L115 115"
        stroke="#3f3f46"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* Question mark */}
      <path
        d="M62 60C62 55 66 52 70 52C74 52 78 55 78 60C78 65 74 67 70 70"
        stroke="#71717a"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="70" cy="80" r="3" fill="#71717a" />

      <defs>
        <linearGradient id="noResultsGradient" x1="0" y1="0" x2="160" y2="160">
          <stop stopColor="#f59e0b" />
          <stop offset="1" stopColor="#ef4444" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function AllPaidIllustration() {
  return (
    <svg
      width="160"
      height="160"
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mb-6"
    >
      {/* Background */}
      <circle cx="80" cy="80" r="70" fill="url(#allPaidGradient)" fillOpacity="0.15" />

      {/* Checkmark circle */}
      <circle
        cx="80"
        cy="80"
        r="45"
        fill="#18181b"
        stroke="#10b981"
        strokeWidth="4"
      />

      {/* Checkmark */}
      <path
        d="M55 80L72 97L105 64"
        stroke="#10b981"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Sparkles */}
      <circle cx="130" cy="50" r="4" fill="#fbbf24" />
      <circle cx="35" cy="60" r="3" fill="#a78bfa" />
      <circle cx="125" cy="110" r="3" fill="#34d399" />
      <circle cx="40" cy="115" r="4" fill="#f472b6" />

      <defs>
        <linearGradient id="allPaidGradient" x1="0" y1="0" x2="160" y2="160">
          <stop stopColor="#10b981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ErrorIllustration() {
  return (
    <svg
      width="160"
      height="160"
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mb-6"
    >
      {/* Background */}
      <circle cx="80" cy="80" r="70" fill="url(#errorGradient)" fillOpacity="0.1" />

      {/* Warning triangle */}
      <path
        d="M80 40L125 115H35L80 40Z"
        fill="#18181b"
        stroke="#ef4444"
        strokeWidth="3"
      />

      {/* Exclamation */}
      <path
        d="M80 65V90"
        stroke="#ef4444"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="80" cy="102" r="4" fill="#ef4444" />

      <defs>
        <linearGradient id="errorGradient" x1="0" y1="0" x2="160" y2="160">
          <stop stopColor="#ef4444" />
          <stop offset="1" stopColor="#dc2626" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function NoHistoryIllustration() {
  return (
    <svg
      width="160"
      height="160"
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mb-6"
    >
      {/* Background */}
      <circle cx="80" cy="80" r="70" fill="url(#noHistoryGradient)" fillOpacity="0.1" />

      {/* Clock */}
      <circle
        cx="80"
        cy="80"
        r="40"
        fill="#18181b"
        stroke="#3f3f46"
        strokeWidth="3"
      />

      {/* Clock hands */}
      <path
        d="M80 55V80L100 90"
        stroke="#71717a"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Clock ticks */}
      <circle cx="80" cy="48" r="3" fill="#3f3f46" />
      <circle cx="112" cy="80" r="3" fill="#3f3f46" />
      <circle cx="80" cy="112" r="3" fill="#3f3f46" />
      <circle cx="48" cy="80" r="3" fill="#3f3f46" />

      {/* Decorative dots */}
      <circle cx="130" cy="45" r="3" fill="#a78bfa" fillOpacity="0.5" />
      <circle cx="30" cy="115" r="4" fill="#3b82f6" fillOpacity="0.5" />

      <defs>
        <linearGradient id="noHistoryGradient" x1="0" y1="0" x2="160" y2="160">
          <stop stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const illustrations: Record<EmptyStateType, React.FC> = {
  'no-bills': NoBillsIllustration,
  'no-results': NoResultsIllustration,
  'all-paid': AllPaidIllustration,
  'error': ErrorIllustration,
  'no-history': NoHistoryIllustration,
};

const defaultContent: Record<EmptyStateType, { title: string; description: string }> = {
  'no-bills': {
    title: 'No bills yet',
    description: 'Add your first bill to start tracking payments',
  },
  'no-results': {
    title: 'No results found',
    description: 'Try adjusting your search or filters',
  },
  'all-paid': {
    title: 'All caught up!',
    description: 'You have no pending bills. Great job!',
  },
  'error': {
    title: 'Something went wrong',
    description: 'We encountered an error. Please try again.',
  },
  'no-history': {
    title: 'No payment history',
    description: 'Bills you mark as paid will appear here',
  },
};

export function EmptyState({
  type,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const Illustration = illustrations[type];
  const content = defaultContent[type];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      <Illustration />
      <h3 className="text-xl font-semibold text-white mb-2">
        {title || content.title}
      </h3>
      <p className="text-zinc-400 max-w-sm mb-6">
        {description || content.description}
      </p>
      {action}
    </div>
  );
}
