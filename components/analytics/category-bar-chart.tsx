'use client';

import { Bill, BillCategory } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface CategoryBarChartProps {
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

export function CategoryBarChart({ bills }: CategoryBarChartProps) {
  // Group bills by category
  const categoryData = bills.reduce((acc, bill) => {
    if (!bill.amount) return acc;
    const category = bill.category || 'other';
    if (!acc[category]) {
      acc[category] = { total: 0, count: 0 };
    }
    acc[category].total += bill.amount;
    acc[category].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  const chartData = Object.entries(categoryData)
    .map(([category, data]) => ({
      name: category.replace('_', ' '),
      amount: Math.round(data.total * 100) / 100,
      count: data.count,
      category: category as BillCategory,
    }))
    .sort((a, b) => b.amount - a.amount);

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
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
          <XAxis
            type="number"
            stroke="#71717a"
            tick={{ fill: '#71717a', fontSize: 12 }}
            axisLine={{ stroke: '#27272a' }}
            tickFormatter={(value) => `$${value}`}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#71717a"
            tick={{ fill: '#71717a', fontSize: 12 }}
            axisLine={{ stroke: '#27272a' }}
            width={80}
            tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              color: '#fff',
            }}
            formatter={(value) => [
              `$${(value as number).toFixed(2)}`,
              'Total',
            ]}
          />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.other}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
