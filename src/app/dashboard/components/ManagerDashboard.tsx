'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Icon from '@/components/ui/AppIcon';
import StatusBadge from '@/components/ui/StatusBadge';
import type { DashboardData } from '@/hooks/useDashboardData';

const DailySalesChart = dynamic(() => import('./charts/DailySalesChart'), { ssr: false });
const TopProductsChart = dynamic(() => import('./charts/TopProductsChart'), { ssr: false });
const MonthlyRevenueChart = dynamic(() => import('./charts/MonthlyRevenueChart'), { ssr: false });

interface ManagerDashboardProps {
  dashboard: DashboardData;
}

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function fmtFull(n: number): string {
  return n.toLocaleString('en-US');
}

function SkeletonCard() {
  return <div className="h-28 rounded-xl animate-pulse" style={{ background: 'var(--muted)' }} />;
}

export default function ManagerDashboard({ dashboard }: ManagerDashboardProps) {
  const { kpi, loading, chartsLoading, tableLoading, recentOrders, dailySales, topProducts, monthlyRevenue, lastUpdated } = dashboard;
  const [activeTab, setActiveTab] = useState<'sales' | 'profit'>('sales');

  const MONTHLY_TARGET = 3_200_000_000;
  const monthlyPct = Math.min(Math.round((kpi.monthlySales / MONTHLY_TARGET) * 100), 100);

  const kpiCards = [
    {
      key: 'mgr-today-sales',
      label: "Today\'s Sales",
      value: fmtFull(kpi.todaySales),
      suffix: 'UZS',
      sub: `Profit: ${fmt(kpi.todayProfit)} UZS`,
      icon: 'BanknotesIcon',
      iconBg: 'rgba(14, 165, 233, 0.12)',
      iconColor: 'text-primary',
      span: 2,
    },
    {
      key: 'mgr-monthly',
      label: 'Monthly Sales',
      value: fmt(kpi.monthlySales),
      suffix: 'UZS',
      sub: `${monthlyPct}% of target`,
      icon: 'CalendarIcon',
      iconBg: 'rgba(14, 165, 233, 0.12)',
      iconColor: 'text-primary',
      showProgress: true,
      progressPct: monthlyPct,
    },
    {
      key: 'mgr-profit',
      label: 'Monthly Profit',
      value: fmt(kpi.monthlyProfit),
      suffix: 'UZS',
      sub: 'Margin: 25%',
      icon: 'ArrowTrendingUpIcon',
      iconBg: 'rgba(34, 197, 94, 0.12)',
      iconColor: 'text-success',
    },
    {
      key: 'mgr-overdue',
      label: 'Overdue Invoices',
      value: kpi.overdueInvoices,
      suffix: 'clients',
      sub: `${fmt(kpi.overdueAmount)} UZS`,
      icon: 'ExclamationTriangleIcon',
      iconBg: kpi.overdueInvoices > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
      iconColor: kpi.overdueInvoices > 0 ? 'text-danger' : 'text-success',
      alert: kpi.overdueInvoices > 0,
    },
    {
      key: 'mgr-warehouse',
      label: 'Warehouse SKUs',
      value: kpi.warehouseSkus,
      suffix: 'items',
      sub: `${kpi.lowStockCount} below min stock`,
      icon: 'BuildingStorefrontIcon',
      iconBg: kpi.lowStockCount > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(34, 197, 94, 0.12)',
      iconColor: kpi.lowStockCount > 0 ? 'text-warning' : 'text-success',
      warning: kpi.lowStockCount > 0,
    },
    {
      key: 'mgr-staff',
      label: 'Staff Present',
      value: kpi.activeEmployees,
      suffix: `/ ${kpi.totalEmployees}`,
      sub: `Late: ${kpi.lateEmployees} | Absent: ${kpi.absentEmployees}`,
      icon: 'UserGroupIcon',
      iconBg: 'rgba(14, 165, 233, 0.12)',
      iconColor: 'text-primary',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Sales & Performance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manager overview — Tashkent HQ
            {lastUpdated && <span className="ml-2 opacity-60">· {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sales-management" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-secondary" style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
            <Icon name="ShoppingCartIcon" size={14} />
            <span className="hidden sm:inline">Sales</span>
          </Link>
          <Link href="/reports" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-secondary" style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
            <Icon name="DocumentChartBarIcon" size={14} />
            <span className="hidden sm:inline">Reports</span>
          </Link>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: 'var(--success)' }}>
            <span className={`w-1.5 h-1.5 rounded-full bg-success ${!loading ? 'animate-pulse' : ''}`} />
            {loading ? 'Loading...' : 'Live'}
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={`sk-mgr-${i}`} />) :
          kpiCards.map(card => (
            <div
              key={card.key}
              className={`card-base flex flex-col gap-2 transition-all duration-200 hover:translate-y-[-2px] ${card.alert ? 'card-glow-danger' : card.warning ? 'card-glow-warning' : 'card-glow'} ${(card as any).span === 2 ? 'col-span-2' : ''}`}
              style={{ background: card.alert ? 'rgba(239, 68, 68, 0.04)' : card.warning ? 'rgba(245, 158, 11, 0.04)' : 'var(--card)' }}
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: card.iconBg }}>
                  <Icon name={card.icon as any} size={15} className={card.iconColor} />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground font-tabular">
                {card.value}
                <span className="text-sm font-normal text-muted-foreground ml-1">{card.suffix}</span>
              </div>
              <p className="text-xs text-muted-foreground">{card.sub}</p>
              {(card as any).showProgress && (
                <div className="mt-1">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(card as any).progressPct}%`, background: 'var(--primary)' }} />
                  </div>
                </div>
              )}
            </div>
          ))
        }
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-base card-glow" style={{ minHeight: '280px' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Daily Sales Trend</h3>
              <p className="text-xs text-muted-foreground">Last 14 days</p>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: 'var(--muted)' }}>
              {(['sales', 'profit'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {chartsLoading ? (
            <div className="h-48 rounded-lg animate-pulse" style={{ background: 'var(--muted)' }} />
          ) : (
            <DailySalesChart activeTab={activeTab} data={dailySales} />
          )}
        </div>

        <div className="card-base card-glow" style={{ minHeight: '280px' }}>
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">Top Product Categories</h3>
            <p className="text-xs text-muted-foreground">By revenue — this month</p>
          </div>
          {chartsLoading ? (
            <div className="h-48 rounded-lg animate-pulse" style={{ background: 'var(--muted)' }} />
          ) : (
            <TopProductsChart data={topProducts} />
          )}
        </div>

        <div className="lg:col-span-3 card-base card-glow" style={{ minHeight: '240px' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Monthly Revenue by Branch</h3>
              <p className="text-xs text-muted-foreground">Last 7 months</p>
            </div>
            <div className="flex items-center gap-4">
              {[
                { key: 'leg-t', color: 'var(--primary)', label: 'Tashkent' },
                { key: 'leg-s', color: 'var(--accent)', label: 'Samarkand' },
                { key: 'leg-n', color: 'var(--success)', label: 'Namangan' },
              ].map(l => (
                <div key={l.key} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                  <span className="text-xs text-muted-foreground">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          {chartsLoading ? (
            <div className="h-40 rounded-lg animate-pulse" style={{ background: 'var(--muted)' }} />
          ) : (
            <MonthlyRevenueChart data={monthlyRevenue} />
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card-base card-glow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Recent Orders</h3>
            <p className="text-xs text-muted-foreground">Last 8 orders across all branches</p>
          </div>
          <Link href="/sales-management" className="text-xs text-primary hover:text-info flex items-center gap-1">
            View all <Icon name="ArrowRightIcon" size={12} />
          </Link>
        </div>
        {tableLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={`sk-ord-${i}`} className="h-8 rounded animate-pulse" style={{ background: 'var(--muted)' }} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Order #', 'Customer', 'Product', 'Total (UZS)', 'Status', 'Branch'].map(h => (
                    <th key={`mgrh-${h}`} className="text-left pb-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order, i) => (
                  <tr key={order.id} className="transition-colors hover:bg-secondary/50" style={{ borderBottom: i < recentOrders.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td className="py-2.5 pr-4"><span className="text-xs font-medium text-primary font-tabular">{order.order_number}</span></td>
                    <td className="py-2.5 pr-4"><span className="text-xs text-foreground whitespace-nowrap">{order.customer}</span></td>
                    <td className="py-2.5 pr-4"><span className="text-xs text-muted-foreground max-w-[160px] block truncate">{order.product}</span></td>
                    <td className="py-2.5 pr-4"><span className="text-xs font-medium text-foreground font-tabular">{order.total_uzs.toLocaleString('en-US')}</span></td>
                    <td className="py-2.5 pr-4"><StatusBadge variant={order.order_status as any} size="sm" /></td>
                    <td className="py-2.5"><span className="text-xs text-muted-foreground">{order.branch}</span></td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">No orders found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'qa-sales', href: '/sales-management', icon: 'ShoppingCartIcon', label: 'New Order' },
            { key: 'qa-crm', href: '/crm', icon: 'UserCircleIcon', label: 'CRM' },
            { key: 'qa-warehouse', href: '/warehouse', icon: 'BuildingStorefrontIcon', label: 'Warehouse' },
            { key: 'qa-purchasing', href: '/purchasing', icon: 'TruckIcon', label: 'Purchasing' },
          ].map(action => (
            <Link
              key={action.key}
              href={action.href}
              className="card-base card-glow flex items-center gap-3 p-3 hover:bg-secondary transition-all duration-150 hover:translate-y-[-1px]"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(14, 165, 233, 0.12)' }}>
                <Icon name={action.icon as any} size={15} className="text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
