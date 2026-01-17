'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Check,
  X,
  Clock,
  ChevronDown,
  Loader2,
} from 'lucide-react';

export type SnoozeOption = '1_day' | '3_days' | '1_week';

interface BatchActionBarProps {
  selectedCount: number;
  onMarkAllPaid: () => Promise<void>;
  onSnooze: (option: SnoozeOption) => Promise<void>;
  onClearSelection: () => void;
  isProcessing?: boolean;
}

const snoozeOptions: { value: SnoozeOption; label: string; days: number }[] = [
  { value: '1_day', label: '1 Day', days: 1 },
  { value: '3_days', label: '3 Days', days: 3 },
  { value: '1_week', label: '1 Week', days: 7 },
];

export function BatchActionBar({
  selectedCount,
  onMarkAllPaid,
  onSnooze,
  onClearSelection,
  isProcessing = false,
}: BatchActionBarProps) {
  const [isSnoozeOpen, setIsSnoozeOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const snoozeRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (snoozeRef.current && !snoozeRef.current.contains(event.target as Node)) {
        setIsSnoozeOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllPaid = async () => {
    setProcessingAction('mark_paid');
    try {
      await onMarkAllPaid();
    } finally {
      setProcessingAction(null);
    }
  };

  const handleSnooze = async (option: SnoozeOption) => {
    setProcessingAction(`snooze_${option}`);
    setIsSnoozeOpen(false);
    try {
      await onSnooze(option);
    } finally {
      setProcessingAction(null);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Outer glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-violet-500/20 rounded-2xl blur-xl" />

      {/* Main bar */}
      <div className="relative flex items-center gap-3 px-4 py-3 bg-[#0c0c10]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50">
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-3 border-r border-white/10">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <span className="text-sm font-bold text-blue-400">{selectedCount}</span>
          </div>
          <span className="text-sm text-zinc-400 hidden sm:block">
            {selectedCount === 1 ? 'bill' : 'bills'} selected
          </span>
        </div>

        {/* Mark All Paid button */}
        <button
          onClick={handleMarkAllPaid}
          disabled={isProcessing}
          className={cn(
            'group relative flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200',
            'bg-gradient-to-r from-emerald-500 to-teal-500 text-white',
            'hover:from-emerald-400 hover:to-teal-400',
            'active:scale-[0.98]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'shadow-lg shadow-emerald-500/20'
          )}
        >
          {processingAction === 'mark_paid' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Mark Paid</span>
        </button>

        {/* Snooze dropdown */}
        <div className="relative" ref={snoozeRef}>
          <button
            onClick={() => setIsSnoozeOpen(!isSnoozeOpen)}
            disabled={isProcessing}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200',
              'bg-white/[0.05] border border-white/10 text-zinc-300',
              'hover:bg-white/[0.08] hover:border-white/20 hover:text-white',
              'active:scale-[0.98]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isSnoozeOpen && 'bg-white/[0.08] border-white/20 text-white'
            )}
          >
            {processingAction?.startsWith('snooze') ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Snooze</span>
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isSnoozeOpen && 'rotate-180'
              )}
            />
          </button>

          {/* Snooze dropdown menu */}
          {isSnoozeOpen && (
            <div className="absolute bottom-full left-0 mb-2 min-w-[140px] py-2 bg-[#0c0c10] border border-white/10 rounded-xl shadow-2xl shadow-black/50 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150">
              {snoozeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSnooze(option.value)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <Clock className="w-4 h-4 text-zinc-500" />
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear selection button */}
        <button
          onClick={onClearSelection}
          disabled={isProcessing}
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200',
            'bg-white/[0.03] border border-white/10 text-zinc-500',
            'hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400',
            'active:scale-[0.98]',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
