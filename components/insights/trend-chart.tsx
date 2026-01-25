'use client';

import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import { MonthlyTrendPoint } from '@/lib/insights-utils';
import { formatCurrency, cn } from '@/lib/utils';

interface TrendChartProps {
  trendData: MonthlyTrendPoint[];
}

type PeriodOption = 3 | 6;

export function TrendChart({ trendData }: TrendChartProps) {
  const [period, setPeriod] = useState<PeriodOption>(6);

  // Filter data based on selected period
  const chartData = useMemo(() => {
    return trendData.slice(-period);
  }, [trendData, period]);

  // Calculate average spending
  const averageSpending = useMemo(() => {
    if (chartData.length === 0) return 0;
    const total = chartData.reduce((sum, point) => sum + point.total, 0);
    return total / chartData.length;
  }, [chartData]);

  // Get min and max for chart domain
  const { minValue, maxValue } = useMemo(() => {
    if (chartData.length === 0) return { minValue: 0, maxValue: 1000 };
    const values = chartData.map((d) => d.total);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1 || 100;
    return {
      minValue: Math.max(0, min - padding),
      maxValue: max + padding,
    };
  }, [chartData]);

  if (trendData.length < 2) {
    return (
      <div
        className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
      >
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02]" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/60 via-cyan-500/60 to-teal-500/30" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Spending Trends</h3>
              <p className="text-xs text-zinc-500">Track spending over time</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-zinc-400 font-medium">Not enough data yet</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs">
              The trend chart will appear once you have at least 2 months of paid bills
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
    >
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02]" />

      {/* Top accent line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/60 via-cyan-500/60 to-teal-500/30" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Spending Trends</h3>
              <p className="text-xs text-zinc-500">
                Avg: {formatCurrency(averageSpending)}/month
              </p>
            </div>
          </div>

          {/* Period toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            <button
              onClick={() => setPeriod(3)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
                period === 3
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              )}
            >
              3 months
            </button>
            <button
              onClick={() => setPeriod(6)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
                period === 6
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              )}
            >
              6 months
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="monthLabel"
                stroke="#71717a"
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
                dy={10}
              />
              <YAxis
                stroke="#71717a"
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${Math.round(value)}`}
                domain={[minValue, maxValue]}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                }}
                itemStyle={{ color: '#fff' }}
                labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                formatter={(value) => [
                  formatCurrency(value as number),
                  'Total Spent',
                ]}
                labelFormatter={(label) => label}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill="url(#trendGradient)"
                dot={{ fill: '#3b82f6', strokeWidth: 2, stroke: '#18181b', r: 4 }}
                activeDot={{
                  r: 6,
                  fill: '#3b82f6',
                  stroke: '#fff',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Chart legend */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-zinc-400">Monthly Spending</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-400">{chartData.length} months shown</span>
          </div>
        </div>
      </div>
    </div>
  );
}
