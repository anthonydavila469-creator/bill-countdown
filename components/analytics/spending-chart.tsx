'use client';

import { Bill } from '@/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface SpendingChartProps {
  bills: Bill[];
  periodDays: 30 | 60 | 90;
}

export function SpendingChart({ bills, periodDays }: SpendingChartProps) {
  // Group paid bills by month
  const monthlyData = bills.reduce((acc, bill) => {
    if (!bill.paid_at || !bill.amount) return acc;

    const date = new Date(bill.paid_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    if (!acc[monthKey]) {
      acc[monthKey] = { month: monthLabel, total: 0, count: 0 };
    }
    acc[monthKey].total += bill.amount;
    acc[monthKey].count += 1;

    return acc;
  }, {} as Record<string, { month: string; total: number; count: number }>);

  const chartData = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6) // Last 6 months
    .map(([, data]) => ({
      name: data.month,
      amount: Math.round(data.total * 100) / 100,
    }));

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-zinc-500">
        No spending data available yet
      </div>
    );
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="name"
            stroke="#71717a"
            tick={{ fill: '#71717a', fontSize: 12 }}
            axisLine={{ stroke: '#27272a' }}
          />
          <YAxis
            stroke="#71717a"
            tick={{ fill: '#71717a', fontSize: 12 }}
            axisLine={{ stroke: '#27272a' }}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              color: '#fff',
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spent']}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: '#3b82f6' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
