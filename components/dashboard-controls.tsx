'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  Calendar,
  DollarSign,
  ArrowDownAZ,
  LayoutGrid,
  List,
  Check,
  Settings2,
  Square,
  RectangleHorizontal,
} from 'lucide-react';

export type SortOption = 'due_date' | 'amount' | 'name';
export type ViewOption = 'grid' | 'list';
export type CardSize = 'compact' | 'default';

interface DashboardControlsProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  view: ViewOption;
  onViewChange: (view: ViewOption) => void;
  cardSize: CardSize;
  onCardSizeChange: (size: CardSize) => void;
  className?: string;
}

const sortOptions = [
  { value: 'due_date' as SortOption, label: 'Due Date', icon: Calendar },
  { value: 'amount' as SortOption, label: 'Amount', icon: DollarSign },
  { value: 'name' as SortOption, label: 'Name (A-Z)', icon: ArrowDownAZ },
];

const viewOptions = [
  { value: 'grid' as ViewOption, label: 'Grid', icon: LayoutGrid },
  { value: 'list' as ViewOption, label: 'List', icon: List },
];

const cardSizeOptions = [
  { value: 'compact' as CardSize, label: 'Compact', icon: Square },
  { value: 'default' as CardSize, label: 'Normal', icon: RectangleHorizontal },
];

export function DashboardControls({
  sortBy,
  onSortChange,
  view,
  onViewChange,
  cardSize,
  onCardSizeChange,
  className,
}: DashboardControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentSort = sortOptions.find(o => o.value === sortBy);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'group relative flex items-center gap-2.5 pl-3 pr-2.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
          'bg-gradient-to-b from-white/[0.07] to-white/[0.02]',
          'border border-white/[0.08]',
          'hover:from-white/[0.1] hover:to-white/[0.04] hover:border-white/[0.15]',
          'shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]',
          isOpen && 'from-white/[0.1] to-white/[0.04] border-white/[0.15]'
        )}
      >
        {/* Icon */}
        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-b from-cyan-500/20 to-cyan-600/10">
          <Settings2 className="w-4 h-4 text-cyan-400" />
        </div>

        {/* Label */}
        <span className="text-white font-semibold">{currentSort?.label || 'Due Date'}</span>

        {/* Chevron */}
        <div className="flex items-center justify-center w-5 h-5 rounded-md bg-white/[0.05]">
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-zinc-500 transition-transform duration-300',
              isOpen && 'rotate-180 text-cyan-400'
            )}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 min-w-[220px] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="absolute -inset-1 bg-gradient-to-b from-cyan-500/10 to-transparent rounded-2xl blur-xl" />
          <div className="relative bg-[#0a0a0e]/98 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden">
            
            {/* Sort Section */}
            <div className="p-2 border-b border-white/[0.06]">
              <p className="px-2 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Sort By</p>
              {sortOptions.map((option) => {
                const Icon = option.icon;
                const isActive = sortBy === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      onSortChange(option.value);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-300'
                        : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', isActive ? 'text-cyan-400' : 'text-zinc-500')} />
                    <span className="flex-1 text-left">{option.label}</span>
                    {isActive && <Check className="w-4 h-4 text-cyan-400" />}
                  </button>
                );
              })}
            </div>

            {/* View Section */}
            <div className="p-2 border-b border-white/[0.06]">
              <p className="px-2 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">View</p>
              <div className="flex gap-2 px-2">
                {viewOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = view === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => onViewChange(option.value)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                          : 'bg-white/[0.03] text-zinc-400 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card Size Section */}
            <div className="p-2">
              <p className="px-2 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Card Size</p>
              {cardSizeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = cardSize === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      onCardSizeChange(option.value);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-violet-500/10 text-violet-300'
                        : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', isActive ? 'text-violet-400' : 'text-zinc-500')} />
                    <span className="flex-1 text-left">{option.label}</span>
                    {isActive && <Check className="w-4 h-4 text-violet-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
