'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DailySalesPoint } from '@/hooks/useDashboardData';

interface DailySalesChartProps {
  activeTab: 'sales' | 'profit';
  data: DailySalesPoint[];
}

const formatValue = (v: number) => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(0)}M`;
  return `${(v / 1000).toFixed(0)}K`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2.5 rounded-xl shadow-xl"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={`tt-${i}`} className="text-sm font-semibold" style={{ color: p.color }}>
          {(p.value / 1000000).toFixed(2)}M UZS
        </p>
      ))}
    </div>
  );
};

export default function DailySalesChart({ activeTab, data }: DailySalesChartProps) {
  const dataKey = activeTab === 'sales' ? 'sales' : 'profit';
  const color = activeTab === 'sales' ? 'var(--primary)' : 'var(--success)';

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="grad-daily" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatValue}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill="url(#grad-daily)"
          dot={false}
          activeDot={{ r: 4, fill: color, stroke: 'var(--card)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}