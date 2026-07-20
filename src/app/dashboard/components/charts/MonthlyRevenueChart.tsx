'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyBranchPoint } from '@/hooks/useDashboardData';

interface MonthlyRevenueChartProps {
  data: MonthlyBranchPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2.5 rounded-xl shadow-xl"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label} 2026</p>
      {payload.map((p: any, i: number) => (
        <p key={`bar-tt-${i}`} className="text-xs font-medium" style={{ color: p.fill }}>
          {p.name}: {p.value}M UZS
        </p>
      ))}
    </div>
  );
};

export default function MonthlyRevenueChart({ data }: MonthlyRevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${v}M`}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="tashkent" name="Tashkent" fill="var(--primary)" radius={[3, 3, 0, 0]} maxBarSize={24} />
        <Bar dataKey="samarkand" name="Samarkand" fill="var(--accent)" radius={[3, 3, 0, 0]} maxBarSize={24} />
        <Bar dataKey="namangan" name="Namangan" fill="var(--success)" radius={[3, 3, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}