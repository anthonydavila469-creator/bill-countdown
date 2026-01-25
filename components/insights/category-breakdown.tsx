'use client';

import { useEffect, useState } from 'react';
import {
  PieChart,
  Home,
  Zap,
  Tv,
  Shield,
  Phone,
  Wifi,
  CreditCard,
  DollarSign,
  Heart,
  FileText,
  LucideIcon,
  ChevronDown,
} from 'lucide-react';
import { CategoryBreakdownItem, getBillAmount } from '@/lib/insights-utils';
import { formatCurrency, cn } from '@/lib/utils';
import { Bill, BillCategory } from '@/types';
import { getBillIcon } from '@/lib/get-bill-icon';

// Category icon mapping
const categoryIcons: Record<BillCategory | 'other', LucideIcon> = {
  rent: Home,
  housing: Home,
  utilities: Zap,
  subscription: Tv,
  insurance: Shield,
  phone: Phone,
  internet: Wifi,
  credit_card: CreditCard,
  loan: DollarSign,
  health: Heart,
  other: FileText,
};

interface CategoryBreakdownProps {
  breakdown: CategoryBreakdownItem[];
  bills: Bill[];
}

// Category-specific colors for progress bars
const categoryColors: Record<BillCategory | 'other', { bar: string; text: string; bg: string }> = {
  rent: { bar: 'from-orange-500 to-amber-400', text: 'text-orange-400', bg: 'bg-orange-500/10' },
  housing: { bar: 'from-purple-500 to-violet-400', text: 'text-purple-400', bg: 'bg-purple-500/10' },
  utilities: { bar: 'from-yellow-500 to-lime-400', text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  subscription: { bar: 'from-violet-500 to-purple-400', text: 'text-violet-400', bg: 'bg-violet-500/10' },
  insurance: { bar: 'from-blue-500 to-cyan-400', text: 'text-blue-400', bg: 'bg-blue-500/10' },
  phone: { bar: 'from-pink-500 to-rose-400', text: 'text-pink-400', bg: 'bg-pink-500/10' },
  internet: { bar: 'from-cyan-500 to-teal-400', text: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  credit_card: { bar: 'from-emerald-500 to-green-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  loan: { bar: 'from-red-500 to-orange-400', text: 'text-red-400', bg: 'bg-red-500/10' },
  health: { bar: 'from-green-500 to-emerald-400', text: 'text-green-400', bg: 'bg-green-500/10' },
  other: { bar: 'from-zinc-400 to-zinc-300', text: 'text-zinc-400', bg: 'bg-zinc-500/10' },
};

export function CategoryBreakdown({ breakdown, bills }: CategoryBreakdownProps) {
  const [animated, setAnimated] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (breakdown.length === 0) {
    return null;
  }

  // Get bills for a specific category
  const getBillsForCategory = (category: BillCategory | 'other'): Bill[] => {
    return bills.filter((bill) => {
      const billCategory = bill.category ?? 'other';
      return billCategory === category;
    });
  };

  // Format date for display
  const formatPaidDate = (paidAt: string | null): string => {
    if (!paidAt) return '';
    const date = new Date(paidAt);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  return (
    <div
      className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{ animationDelay: '225ms', animationFillMode: 'backwards' }}
    >
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02]" />

      {/* Decorative gradient */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500/50 via-purple-500/50 to-pink-500/50" />

      <div className="relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30">
            <PieChart className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Spending by Category</h3>
            <p className="text-xs text-zinc-500">{breakdown.length} categories</p>
          </div>
        </div>

        <div className="space-y-4">
          {breakdown.map((item, index) => {
            const colors = categoryColors[item.category];
            const CategoryIcon = categoryIcons[item.category];
            const isExpanded = expandedCategory === item.category;
            const categoryBills = isExpanded ? getBillsForCategory(item.category) : [];

            return (
              <div
                key={item.category}
                className="animate-in fade-in slide-in-from-left-2 duration-300"
                style={{ animationDelay: `${300 + index * 50}ms`, animationFillMode: 'backwards' }}
              >
                {/* Category row - clickable */}
                <button
                  onClick={() => toggleCategory(item.category)}
                  className="w-full text-left group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center border border-white/5',
                        colors.bg
                      )}>
                        <CategoryIcon className={cn("w-5 h-5", colors.text)} />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-white block">{item.label}</span>
                        <span className="text-xs text-zinc-500">
                          {item.count} {item.count === 1 ? 'bill' : 'bills'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-base font-semibold text-white block">
                          {formatCurrency(item.total)}
                        </span>
                        <span className={cn('text-xs font-medium', colors.text)}>
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 text-zinc-500 transition-transform duration-200',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    </div>
                  </div>
                </button>

                {/* Expanded bills list - appears between header and progress bar */}
                {isExpanded && categoryBills.length > 0 && (
                  <div className="my-3 ml-4 pl-4 border-l-2 border-white/10 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {categoryBills.map((bill) => {
                      const { icon: BillIcon, colorClass } = getBillIcon(bill);
                      const amount = getBillAmount(bill);
                      return (
                        <div
                          key={bill.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.03] transition-colors duration-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-center">
                              <BillIcon className={cn("w-4 h-4", colorClass)} />
                            </div>
                            <div>
                              <span className="text-sm font-medium text-white block">{bill.name}</span>
                              {bill.paid_at && (
                                <span className="text-xs text-zinc-500">
                                  Paid {formatPaidDate(bill.paid_at)}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-zinc-300">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Enhanced progress bar - closes each category section */}
                <div className="h-2.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out',
                      colors.bar
                    )}
                    style={{
                      // Minimum 2% width so tiny percentages are still visible
                      width: animated ? `${Math.max(item.percentage, 2)}%` : '0%',
                      transitionDelay: `${index * 50}ms`
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
