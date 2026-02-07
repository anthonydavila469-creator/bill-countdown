'use client';

import { Bill, BillCategory } from '@/types';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface CategoryPieChartProps {
  bills: Bill[];
}

const CATEGORY_COLORS: Record<BillCategory | 'other', string> = {
  utilities: '#f59e0b',
  subscription: '#8b5cf6',
  rent: '#ec4899',
  housing: '#a855f7',
  insurance: '#06b6d4',
  phone: '#10b981',
  internet: '#3b82f6',
  credit_card: '#f43f5e',
  loan: '#6366f1',
  health: '#22c55e',
  other: '#71717a',
};

export function CategoryPieChart({ bills }: CategoryPieChartProps) {
  // Group bills by category
  const categoryData = bills.reduce((acc, bill) => {
    if (!bill.amount) return acc;
    const category = bill.category || 'other';
    acc[category] = (acc[category] || 0) + bill.amount;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(categoryData)
    .map(([category, total]) => ({
      name: category.replace('_', ' '),
      value: Math.round(total * 100) / 100,
      category: category as BillCategory,
    }))
    .sort((a, b) => b.value - a.value);

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-zinc-500">
        No category data available yet
      </div>
    );
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.other}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              color: '#fff',
            }}
            formatter={(value) => [`$${(value as number).toFixed(2)}`, 'Spent']}
          />
          <Legend
            wrapperStyle={{ color: '#71717a', fontSize: '12px' }}
            formatter={(value) => (
              <span className="text-zinc-400 capitalize">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
