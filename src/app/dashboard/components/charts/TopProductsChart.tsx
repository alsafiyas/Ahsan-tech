'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { TopProductCategory } from '@/hooks/useDashboardData';

interface TopProductsChartProps {
  data: TopProductCategory[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div
      className="px-3 py-2 rounded-xl shadow-xl"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <p className="text-xs font-medium text-foreground">{d.name}</p>
      <p className="text-sm font-bold" style={{ color: d.payload.color }}>{d.value}%</p>
    </div>
  );
};

export default function TopProductsChart({ data }: TopProductsChartProps) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={42}
            outerRadius={66}
            paddingAngle={3}
            dataKey="value"
          >
            {data?.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="space-y-1.5 mt-2">
        {data?.map((p, index) => (
          <div key={`legend-${index}`} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
              <span className="text-xs text-muted-foreground">{p.name}</span>
            </div>
            <span className="text-xs font-medium text-foreground font-tabular">{p.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}