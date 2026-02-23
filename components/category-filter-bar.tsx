'use client';

import { useMemo } from 'react';
import { Bill, BillCategory, categoryEmojis, categoryLabels, CATEGORY_COLORS } from '@/types';

interface CategoryFilterBarProps {
  bills: Bill[];
  activeCategory: BillCategory | null;
  onCategoryChange: (category: BillCategory | null) => void;
}

export function CategoryFilterBar({
  bills,
  activeCategory,
  onCategoryChange,
}: CategoryFilterBarProps) {
  // Get unique categories that have at least one bill
  const presentCategories = useMemo(() => {
    const categories = new Set<BillCategory>();
    bills.forEach((bill) => {
      if (bill.category) {
        categories.add(bill.category);
      }
    });
    return Array.from(categories).sort((a, b) =>
      categoryLabels[a].localeCompare(categoryLabels[b])
    );
  }, [bills]);

  // Don't render if no categories present
  if (presentCategories.length === 0) {
    return null;
  }

  return (
    <div className="relative mb-4">
      {/* Scrollable container */}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* "All" chip */}
        <button
          onClick={() => onCategoryChange(null)}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
          style={{
            backgroundColor: activeCategory === null
              ? 'rgba(255,255,255,0.12)'
              : 'rgba(255,255,255,0.04)',
            border: activeCategory === null
              ? '1px solid rgba(255,255,255,0.25)'
              : '1px solid rgba(255,255,255,0.08)',
            color: activeCategory === null ? '#ffffff' : '#94a3b8',
            boxShadow: activeCategory === null
              ? '0 0 16px -2px rgba(255,255,255,0.15)'
              : 'none',
          }}
        >
          <span className="w-2 h-2 rounded-full bg-gradient-to-br from-white/60 to-white/30" />
          <span>All</span>
        </button>

        {/* Category chips */}
        {presentCategories.map((category) => {
          const colors = CATEGORY_COLORS[category];
          const isActive = activeCategory === category;

          return (
            <button
              key={category}
              onClick={() => onCategoryChange(isActive ? null : category)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
              style={{
                backgroundColor: isActive ? colors.bg : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isActive ? colors.border : 'rgba(255,255,255,0.08)'}`,
                color: isActive ? colors.text : '#94a3b8',
                boxShadow: isActive ? `0 0 16px -2px ${colors.glow}` : 'none',
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: colors.text }}
              />
              <span>{categoryEmojis[category]}</span>
              <span>{categoryLabels[category]}</span>
            </button>
          );
        })}
      </div>

      {/* Right fade gradient to hint scrollability */}
      <div
        className="absolute right-0 top-0 bottom-1 w-8 pointer-events-none"
        style={{
          background: 'linear-gradient(to right, transparent, #08080c)',
        }}
      />
    </div>
  );
}
