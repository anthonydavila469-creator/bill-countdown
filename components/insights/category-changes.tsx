'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Equal, ChevronDown } from 'lucide-react';
import { CategoryChange } from '@/lib/insights-utils';
import { formatCurrency, cn } from '@/lib/utils';

interface CategoryChangesProps {
  increases: CategoryChange[];
  decreases: CategoryChange[];
  isFirstMonth: boolean;
}

const MAX_VISIBLE = 3;

export function CategoryChanges({ increases, decreases, isFirstMonth }: CategoryChangesProps) {
  const [showAllIncreases, setShowAllIncreases] = useState(false);
  const [showAllDecreases, setShowAllDecreases] = useState(false);

  if (isFirstMonth) {
    return null;
  }

  const hasChanges = increases.length > 0 || decreases.length > 0;

  if (!hasChanges) {
    return (
      <div
        className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
      >
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02]" />
        <div className="relative flex flex-col items-center justify-center py-8">
          <div className="p-3 rounded-full bg-zinc-500/10 border border-zinc-500/20 mb-4">
            <Equal className="w-6 h-6 text-zinc-400" />
          </div>
          <p className="text-zinc-400 font-medium">No significant changes</p>
          <p className="text-xs text-zinc-500 mt-1">Your spending stayed consistent</p>
        </div>
      </div>
    );
  }

  const visibleIncreases = showAllIncreases ? increases : increases.slice(0, MAX_VISIBLE);
  const visibleDecreases = showAllDecreases ? decreases : decreases.slice(0, MAX_VISIBLE);
  const hasMoreIncreases = increases.length > MAX_VISIBLE;
  const hasMoreDecreases = decreases.length > MAX_VISIBLE;
  const hiddenIncreasesCount = increases.length - MAX_VISIBLE;
  const hiddenDecreasesCount = decreases.length - MAX_VISIBLE;

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
    >
      {/* 📈 Increased from last month */}
      <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden group hover:border-rose-500/20 transition-colors duration-300">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02]" />

        {/* Top accent line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500/60 via-pink-500/60 to-rose-500/30" />

        {/* Subtle glow on hover */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-rose-500/0 group-hover:bg-rose-500/10 rounded-full blur-3xl transition-colors duration-500" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 border border-rose-500/30">
              <TrendingUp className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">📈 Increased from last month</h3>
              <p className="text-xs text-zinc-500">vs. last month</p>
            </div>
          </div>

          {increases.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-zinc-500">No categories increased</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {visibleIncreases.map((item, index) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.03] transition-colors duration-200 animate-in fade-in slide-in-from-left-2"
                    style={{ animationDelay: `${375 + index * 50}ms`, animationFillMode: 'backwards' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-lg">
                        {item.emoji}
                      </div>
                      <span className="text-sm font-medium text-white">{item.label}</span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <ArrowUpRight className="w-4 h-4 text-rose-400" />
                        <span className="text-sm font-semibold text-rose-400">
                          +{formatCurrency(item.difference)}
                        </span>
                      </div>
                      <span className="text-xs text-rose-400/70">
                        +{item.percentageChange.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Show more button */}
              {hasMoreIncreases && (
                <button
                  onClick={() => setShowAllIncreases(!showAllIncreases)}
                  className={cn(
                    'w-full mt-3 py-2 rounded-xl flex items-center justify-center gap-2',
                    'bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/10',
                    'text-sm font-medium text-zinc-400 hover:text-white',
                    'transition-all duration-200'
                  )}
                >
                  <span>{showAllIncreases ? 'Show less' : `Show ${hiddenIncreasesCount} more`}</span>
                  <ChevronDown className={cn(
                    'w-4 h-4 transition-transform duration-200',
                    showAllIncreases && 'rotate-180'
                  )} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 📉 Decreased from last month */}
      <div className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden group hover:border-emerald-500/20 transition-colors duration-300">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02]" />

        {/* Top accent line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/60 via-teal-500/60 to-emerald-500/30" />

        {/* Subtle glow on hover */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/0 group-hover:bg-emerald-500/10 rounded-full blur-3xl transition-colors duration-500" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
              <TrendingDown className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">📉 Decreased from last month</h3>
              <p className="text-xs text-zinc-500">vs. last month</p>
            </div>
          </div>

          {decreases.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-zinc-500">No categories decreased</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {visibleDecreases.map((item, index) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.03] transition-colors duration-200 animate-in fade-in slide-in-from-right-2"
                    style={{ animationDelay: `${375 + index * 50}ms`, animationFillMode: 'backwards' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg">
                        {item.emoji}
                      </div>
                      <span className="text-sm font-medium text-white">{item.label}</span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-semibold text-emerald-400">
                          -{formatCurrency(item.difference)}
                        </span>
                      </div>
                      <span className="text-xs text-emerald-400/70">
                        -{item.percentageChange.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Show more button */}
              {hasMoreDecreases && (
                <button
                  onClick={() => setShowAllDecreases(!showAllDecreases)}
                  className={cn(
                    'w-full mt-3 py-2 rounded-xl flex items-center justify-center gap-2',
                    'bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/10',
                    'text-sm font-medium text-zinc-400 hover:text-white',
                    'transition-all duration-200'
                  )}
                >
                  <span>{showAllDecreases ? 'Show less' : `Show ${hiddenDecreasesCount} more`}</span>
                  <ChevronDown className={cn(
                    'w-4 h-4 transition-transform duration-200',
                    showAllDecreases && 'rotate-180'
                  )} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
