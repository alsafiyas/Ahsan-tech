'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import type { DailySalesPoint, TopProductCategory, MonthlyBranchPoint } from '@/hooks/useDashboardData';

const DailySalesChart = dynamic(() => import('./charts/DailySalesChart'), { ssr: false });
const MonthlyRevenueChart = dynamic(() => import('./charts/MonthlyRevenueChart'), { ssr: false });
const TopProductsChart = dynamic(() => import('./charts/TopProductsChart'), { ssr: false });

interface DashboardChartsRowProps {
  dailySales: DailySalesPoint[];
  topProducts: TopProductCategory[];
  monthlyRevenue: MonthlyBranchPoint[];
  loading: boolean;
}

export default function DashboardChartsRow({ dailySales, topProducts, monthlyRevenue, loading }: DashboardChartsRowProps) {
  const [activeTab, setActiveTab] = useState<'sales' | 'profit'>('sales');

  const tabs = [
    { key: 'tab-sales', value: 'sales' as const, label: 'Sales' },
    { key: 'tab-profit', value: 'profit' as const, label: 'Profit' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4">
      {/* Daily sales — spans 2 cols */}
      <div
        className="lg:col-span-2 card-base card-glow"
        style={{ minHeight: '280px' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Daily Sales Trend</h3>
            <p className="text-xs text-muted-foreground">Last 14 days — Tashkent HQ</p>
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: 'var(--muted)' }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  activeTab === t.value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="h-48 rounded-lg animate-pulse" style={{ background: 'var(--muted)' }} />
        ) : (
          <DailySalesChart activeTab={activeTab} data={dailySales} />
        )}
      </div>

      {/* Top products pie */}
      <div className="card-base card-glow" style={{ minHeight: '280px' }}>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-foreground">Top Product Categories</h3>
          <p className="text-xs text-muted-foreground">By revenue — this month</p>
        </div>
        {loading ? (
          <div className="h-48 rounded-lg animate-pulse" style={{ background: 'var(--muted)' }} />
        ) : (
          <TopProductsChart data={topProducts} />
        )}
      </div>

      {/* Monthly revenue bar — full width */}
      <div className="lg:col-span-3 card-base card-glow" style={{ minHeight: '240px' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Monthly Revenue by Branch</h3>
            <p className="text-xs text-muted-foreground">Last 7 months — All branches</p>
          </div>
          <div className="flex items-center gap-4">
            {[
              { key: 'leg-tashkent', color: 'var(--primary)', label: 'Tashkent' },
              { key: 'leg-samarkand', color: 'var(--accent)', label: 'Samarkand' },
              { key: 'leg-namangan', color: 'var(--success)', label: 'Namangan' },
            ].map((l) => (
              <div key={l.key} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                <span className="text-xs text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="h-40 rounded-lg animate-pulse" style={{ background: 'var(--muted)' }} />
        ) : (
          <MonthlyRevenueChart data={monthlyRevenue} />
        )}
      </div>
    </div>
  );
}