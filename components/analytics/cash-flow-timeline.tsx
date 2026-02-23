'use client';

import { Bill } from '@/types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface CashFlowTimelineProps {
  bills: Bill[];
  periodDays: 30 | 60 | 90;
}

export function CashFlowTimeline({ bills, periodDays }: CashFlowTimelineProps) {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + periodDays);

  // Filter bills within the period and sort by date
  const upcomingBills = bills
    .filter((bill) => {
      const dueDate = new Date(bill.due_date);
      return dueDate >= now && dueDate <= endDate;
    })
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  // Group by week for better visualization
  const weeklyData: Record<string, { total: number; bills: string[] }> = {};

  upcomingBills.forEach((bill) => {
    const dueDate = new Date(bill.due_date);
    const weekStart = new Date(dueDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { total: 0, bills: [] };
    }
    weeklyData[weekKey].total += bill.amount || 0;
    weeklyData[weekKey].bills.push(bill.name);
  });

  const chartData = Object.entries(weeklyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, data]) => {
      const date = new Date(weekStart);
      return {
        name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: Math.round(data.total * 100) / 100,
        bills: data.bills,
      };
    });

  // Calculate cumulative totals
  let cumulative = 0;
  const cumulativeData = chartData.map((item) => {
    cumulative += item.amount;
    return {
      ...item,
      cumulative: Math.round(cumulative * 100) / 100,
    };
  });

  if (cumulativeData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-zinc-500">
        No upcoming bills in the next {periodDays} days
      </div>
    );
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={cumulativeData}>
          <defs>
            <linearGradient id="cashFlowGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            formatter={(value) => [
              `$${(value as number).toFixed(2)}`,
              'Total Due',
            ]}
            labelFormatter={(label, payload) => {
              if (payload && payload[0]?.payload?.bills) {
                const bills = payload[0].payload.bills as string[];
                return `Week of ${label}\nBills: ${bills.join(', ')}`;
              }
              return `Week of ${label}`;
            }}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="#8B5CF6"
            strokeWidth={2}
            fill="url(#cashFlowGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
