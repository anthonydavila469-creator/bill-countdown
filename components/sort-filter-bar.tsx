'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  Calendar,
  DollarSign,
  ArrowDownAZ,
  Clock,
  AlertTriangle,
  CreditCard,
  Hand,
  RefreshCw,
  Layers,
  Check,
  MoreHorizontal,
} from 'lucide-react';

export type SortOption = 'due_date' | 'amount' | 'name';
export type FilterOption = 'all' | 'due_soon' | 'overdue' | 'autopay' | 'manual' | 'recurring';

interface SortFilterBarProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  activeFilter: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
  className?: string;
  hideSort?: boolean;
}

const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: 'due_date', label: 'Due Date', icon: <Calendar className="w-4 h-4" /> },
  { value: 'amount', label: 'Amount', icon: <DollarSign className="w-4 h-4" /> },
  { value: 'name', label: 'Name (A-Z)', icon: <ArrowDownAZ className="w-4 h-4" /> },
];

// Primary filters shown directly
const primaryFilters: { value: FilterOption; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'all', label: 'All', icon: <Layers className="w-3.5 h-3.5" />, color: 'cyan' },
  { value: 'due_soon', label: 'Soon', icon: <Clock className="w-3.5 h-3.5" />, color: 'amber' },
  { value: 'overdue', label: 'Overdue', icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'rose' },
];

// Secondary filters in "More" dropdown
const secondaryFilters: { value: FilterOption; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'autopay', label: 'Auto-pay', icon: <CreditCard className="w-3.5 h-3.5" />, color: 'emerald' },
  { value: 'manual', label: 'Manual', icon: <Hand className="w-3.5 h-3.5" />, color: 'orange' },
  { value: 'recurring', label: 'Recurring', icon: <RefreshCw className="w-3.5 h-3.5" />, color: 'violet' },
];

// Color mappings for filter chips
const filterColors: Record<string, { active: string; glow: string; icon: string }> = {
  cyan: {
    active: 'from-cyan-500/25 to-cyan-600/15 border-cyan-400/50 text-cyan-300',
    glow: 'shadow-[0_0_20px_-4px_rgba(34,211,238,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]',
    icon: 'text-cyan-400',
  },
  amber: {
    active: 'from-amber-500/25 to-amber-600/15 border-amber-400/50 text-amber-300',
    glow: 'shadow-[0_0_20px_-4px_rgba(251,191,36,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]',
    icon: 'text-amber-400',
  },
  rose: {
    active: 'from-rose-500/25 to-rose-600/15 border-rose-400/50 text-rose-300',
    glow: 'shadow-[0_0_20px_-4px_rgba(251,113,133,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]',
    icon: 'text-rose-400',
  },
  emerald: {
    active: 'from-emerald-500/25 to-emerald-600/15 border-emerald-400/50 text-emerald-300',
    glow: 'shadow-[0_0_20px_-4px_rgba(52,211,153,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]',
    icon: 'text-emerald-400',
  },
  orange: {
    active: 'from-orange-500/25 to-orange-600/15 border-orange-400/50 text-orange-300',
    glow: 'shadow-[0_0_20px_-4px_rgba(251,146,60,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]',
    icon: 'text-orange-400',
  },
  violet: {
    active: 'from-violet-500/25 to-violet-600/15 border-violet-400/50 text-violet-300',
    glow: 'shadow-[0_0_20px_-4px_rgba(167,139,250,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]',
    icon: 'text-violet-400',
  },
};

export function SortFilterBar({
  sortBy,
  onSortChange,
  activeFilter,
  onFilterChange,
  className,
  hideSort = false,
}: SortFilterBarProps) {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentSort = sortOptions.find((opt) => opt.value === sortBy);
  const activeSecondaryFilter = secondaryFilters.find((f) => f.value === activeFilter);

  // Helper to render a filter chip
  const renderFilterChip = (filter: { value: FilterOption; label: string; icon: React.ReactNode; color: string }) => {
    const isActive = activeFilter === filter.value;
    const colors = filterColors[filter.color];

    return (
      <button
        key={filter.value}
        onClick={() => onFilterChange(filter.value)}
        className={cn(
          'group relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200',
          'border',
          isActive
            ? cn(
                'bg-gradient-to-b',
                colors.active,
                colors.glow,
                'scale-[1.02]'
              )
            : cn(
                'bg-gradient-to-b from-white/[0.05] to-white/[0.02]',
                'border-white/[0.08]',
                'text-zinc-400',
                'hover:from-white/[0.08] hover:to-white/[0.04]',
                'hover:border-white/[0.12]',
                'hover:text-white',
                'shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_2px_6px_-2px_rgba(0,0,0,0.4)]',
                'hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_12px_-2px_rgba(0,0,0,0.5)]',
                'active:scale-[0.97]'
              )
        )}
      >
        <span className={cn(
          'transition-colors duration-200',
          isActive ? colors.icon : 'text-zinc-500 group-hover:text-zinc-300'
        )}>
          {filter.icon}
        </span>
        <span>{filter.label}</span>
      </button>
    );
  };

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center gap-4', className)}>
      {/* Sort Dropdown - Premium Pill Design */}
      {!hideSort && <div className="relative" ref={sortRef}>
        <button
          onClick={() => setIsSortOpen(!isSortOpen)}
          className={cn(
            'group relative flex items-center gap-2.5 pl-3 pr-2.5 py-2 rounded-xl text-sm font-medium transition-all duration-300',
            'bg-gradient-to-b from-white/[0.07] to-white/[0.02]',
            'border border-white/[0.08]',
            'hover:from-white/[0.1] hover:to-white/[0.04] hover:border-white/[0.15]',
            'shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]',
            isSortOpen && 'from-white/[0.1] to-white/[0.04] border-white/[0.15]'
          )}
        >
          {/* Icon container with subtle glow */}
          <div className={cn(
            'flex items-center justify-center w-6 h-6 rounded-lg transition-all duration-300',
            'bg-gradient-to-b from-cyan-500/20 to-cyan-600/10',
            'group-hover:from-cyan-500/30 group-hover:to-cyan-600/15'
          )}>
            {currentSort?.icon && (
              <span className="text-cyan-400">{currentSort.icon}</span>
            )}
          </div>

          <span className="text-zinc-400 hidden sm:inline">Sort</span>
          <span className="text-white font-semibold">{currentSort?.label}</span>

          <div className={cn(
            'flex items-center justify-center w-5 h-5 rounded-md transition-all duration-300',
            'bg-white/[0.05] group-hover:bg-white/[0.08]'
          )}>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 text-zinc-500 transition-transform duration-300',
                isSortOpen && 'rotate-180 text-cyan-400'
              )}
            />
          </div>
        </button>

        {/* Sort Dropdown menu */}
        {isSortOpen && (
          <div className="absolute top-full left-0 mt-2 z-50 min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="absolute -inset-1 bg-gradient-to-b from-cyan-500/10 to-transparent rounded-2xl blur-xl" />
            <div className="relative py-1.5 bg-[#0a0a0e]/98 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)]">
              <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
              {sortOptions.map((option) => {
                const isActive = sortBy === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      onSortChange(option.value);
                      setIsSortOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 mx-1.5 rounded-lg text-sm transition-all duration-200',
                      'first:mt-1 last:mb-1',
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/15 to-transparent text-white'
                        : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'
                    )}
                    style={{ width: 'calc(100% - 12px)' }}
                  >
                    <span className={cn(
                      'flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-white/[0.03] text-zinc-500'
                    )}>
                      {option.icon}
                    </span>
                    <span className="flex-1 text-left">{option.label}</span>
                    {isActive && (
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20">
                        <Check className="w-3 h-3 text-cyan-400" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>}

      {/* Filter Chips - Primary + More dropdown */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Primary filters always visible */}
        {primaryFilters.map(renderFilterChip)}

        {/* More dropdown for secondary filters */}
        <div className="relative" ref={moreRef}>
          <button
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={cn(
              'group relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200',
              'border',
              activeSecondaryFilter
                ? cn(
                    'bg-gradient-to-b',
                    filterColors[activeSecondaryFilter.color].active,
                    filterColors[activeSecondaryFilter.color].glow
                  )
                : cn(
                    'bg-gradient-to-b from-white/[0.05] to-white/[0.02]',
                    'border-white/[0.08]',
                    'text-zinc-400',
                    'hover:from-white/[0.08] hover:to-white/[0.04]',
                    'hover:border-white/[0.12]',
                    'hover:text-white',
                    'shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_2px_6px_-2px_rgba(0,0,0,0.4)]'
                  )
            )}
          >
            {activeSecondaryFilter ? (
              <>
                <span className={filterColors[activeSecondaryFilter.color].icon}>
                  {activeSecondaryFilter.icon}
                </span>
                <span>{activeSecondaryFilter.label}</span>
              </>
            ) : (
              <>
                <MoreHorizontal className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
                <span>More</span>
              </>
            )}
            <ChevronDown className={cn(
              'w-3 h-3 transition-transform duration-200',
              isMoreOpen && 'rotate-180'
            )} />
          </button>

          {/* More dropdown menu */}
          {isMoreOpen && (
            <div className="absolute top-full right-0 mt-2 z-50 min-w-[160px] animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="absolute -inset-1 bg-gradient-to-b from-violet-500/10 to-transparent rounded-2xl blur-xl" />
              <div className="relative py-1.5 bg-[#0a0a0e]/98 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)]">
                <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
                {secondaryFilters.map((filter) => {
                  const isActive = activeFilter === filter.value;
                  const colors = filterColors[filter.color];
                  return (
                    <button
                      key={filter.value}
                      onClick={() => {
                        onFilterChange(filter.value);
                        setIsMoreOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 mx-1.5 rounded-lg text-sm transition-all duration-200',
                        'first:mt-1 last:mb-1',
                        isActive
                          ? 'bg-gradient-to-r from-violet-500/15 to-transparent text-white'
                          : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'
                      )}
                      style={{ width: 'calc(100% - 12px)' }}
                    >
                      <span className={cn(
                        'flex items-center justify-center w-6 h-6 rounded-lg transition-all duration-200',
                        isActive ? colors.icon : 'text-zinc-500'
                      )}>
                        {filter.icon}
                      </span>
                      <span className="flex-1 text-left">{filter.label}</span>
                      {isActive && (
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-500/20">
                          <Check className="w-3 h-3 text-violet-400" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
