'use client';

import { ChevronDown, Calendar } from 'lucide-react';
import { MonthOption } from '@/lib/insights-utils';
import { cn } from '@/lib/utils';

interface MonthSelectorProps {
  months: MonthOption[];
  selectedMonth: string;
  onChange: (monthKey: string) => void;
}

export function MonthSelector({ months, selectedMonth, onChange }: MonthSelectorProps) {
  return (
    <div className="relative group">
      {/* Calendar icon */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <Calendar className="w-4 h-4 text-zinc-400 group-hover:text-zinc-300 transition-colors" />
      </div>

      <select
        value={selectedMonth}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'appearance-none pl-10 pr-10 py-2.5 min-w-[160px]',
          'bg-white/[0.03] hover:bg-white/[0.06]',
          'border border-white/[0.08] hover:border-white/[0.15]',
          'rounded-xl text-white text-sm font-medium tracking-wide',
          'focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40',
          'cursor-pointer transition-all duration-200'
        )}
      >
        {months.map((month) => (
          <option key={month.key} value={month.key} className="bg-zinc-900 text-white py-2">
            {month.label}
          </option>
        ))}
      </select>

      {/* Dropdown chevron */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-zinc-300 transition-colors" />
      </div>
    </div>
  );
}
