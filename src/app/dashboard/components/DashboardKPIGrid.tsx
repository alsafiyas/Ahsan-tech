'use client';

import React from 'react';
import Icon from '@/components/ui/AppIcon';
import type { KPIData } from '@/hooks/useDashboardData';

interface DashboardKPIGridProps {
  kpi: KPIData;
  loading: boolean;
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

export default function DashboardKPIGrid({ kpi, loading }: DashboardKPIGridProps) {
  const MONTHLY_TARGET = 3_200_000_000;
  const monthlyPct = Math.min(Math.round((kpi.monthlySales / MONTHLY_TARGET) * 100), 100);

  const kpiData = [
    {
      key: 'kpi-today-sales',
      label: "Today\'s Sales",
      value: fmtFull(kpi.todaySales),
      suffix: 'UZS',
      change: `${fmt(kpi.todaySales)} today`,
      changeType: 'positive' as const,
      icon: 'BanknotesIcon',
      iconBg: 'rgba(14, 165, 233, 0.12)',
      iconColor: 'text-primary',
      span: 2,
      subtext: `Profit: ${fmt(kpi.todayProfit)} UZS (25%)`,
    },
    {
      key: 'kpi-today-profit',
      label: "Today\'s Profit",
      value: fmtFull(kpi.todayProfit),
      suffix: 'UZS',
      change: '+25.0%',
      changeType: 'positive' as const,
      icon: 'ArrowTrendingUpIcon',
      iconBg: 'rgba(34, 197, 94, 0.12)',
      iconColor: 'text-success',
      span: 1,
      subtext: 'Margin: 25.0%',
    },
    {
      key: 'kpi-monthly-sales',
      label: 'Monthly Sales',
      value: fmt(kpi.monthlySales),
      suffix: 'UZS',
      change: `${monthlyPct}% of target`,
      changeType: 'positive' as const,
      icon: 'CalendarIcon',
      iconBg: 'rgba(14, 165, 233, 0.12)',
      iconColor: 'text-primary',
      span: 1,
      subtext: `Target: ${fmt(MONTHLY_TARGET)}`,
      showProgress: true,
      progressPct: monthlyPct,
    },
    {
      key: 'kpi-monthly-profit',
      label: 'Monthly Profit',
      value: fmt(kpi.monthlyProfit),
      suffix: 'UZS',
      change: '+25.0%',
      changeType: 'positive' as const,
      icon: 'ChartBarIcon',
      iconBg: 'rgba(34, 197, 94, 0.12)',
      iconColor: 'text-success',
      span: 1,
      subtext: 'Margin: 25.0%',
    },
    {
      key: 'kpi-debtors',
      label: 'Overdue Invoices',
      value: String(kpi.overdueInvoices),
      suffix: 'clients',
      change: kpi.overdueInvoices > 0 ? `${kpi.overdueInvoices} overdue` : 'None overdue',
      changeType: kpi.overdueInvoices > 0 ? 'negative' as const : 'positive' as const,
      icon: 'ExclamationTriangleIcon',
      iconBg: 'rgba(239, 68, 68, 0.12)',
      iconColor: 'text-danger',
      span: 1,
      subtext: `Total: ${fmt(kpi.overdueAmount)} UZS`,
      alert: kpi.overdueInvoices > 0,
    },
    {
      key: 'kpi-service-devices',
      label: 'Devices in Service',
      value: String(kpi.devicesInService),
      suffix: 'tickets',
      change: `${kpi.readyForPickup} ready for pickup`,
      changeType: 'positive' as const,
      icon: 'WrenchScrewdriverIcon',
      iconBg: 'rgba(139, 92, 246, 0.12)',
      iconColor: 'text-purple-400',
      span: 1,
      subtext: `${kpi.readyForPickup} ready for pickup`,
    },
    {
      key: 'kpi-warehouse',
      label: 'Warehouse Items',
      value: String(kpi.warehouseSkus),
      suffix: 'SKUs',
      change: kpi.lowStockCount > 0 ? `${kpi.lowStockCount} below min stock` : 'All stocked',
      changeType: kpi.lowStockCount > 0 ? 'warning' as const : 'positive' as const,
      icon: 'BuildingStorefrontIcon',
      iconBg: 'rgba(245, 158, 11, 0.12)',
      iconColor: 'text-warning',
      span: 1,
      subtext: `${kpi.lowStockCount} items below min stock`,
      warning: kpi.lowStockCount > 0,
    },
    {
      key: 'kpi-installations',
      label: "Today\'s Installations",
      value: String(kpi.todayInstallations),
      suffix: 'jobs',
      change: `${kpi.completedInstallations} completed`,
      changeType: 'positive' as const,
      icon: 'MapPinIcon',
      iconBg: 'rgba(14, 165, 233, 0.12)',
      iconColor: 'text-primary',
      span: 1,
      subtext: `${kpi.inProgressInstallations} in progress`,
    },
    {
      key: 'kpi-active-staff',
      label: 'Active Employees',
      value: String(kpi.activeEmployees),
      suffix: 'checked in',
      change: `of ${kpi.totalEmployees} total`,
      changeType: 'positive' as const,
      icon: 'UserGroupIcon',
      iconBg: 'rgba(34, 197, 94, 0.12)',
      iconColor: 'text-success',
      span: 1,
      subtext: `On time: ${kpi.activeEmployees - kpi.lateEmployees} | Late: ${kpi.lateEmployees}`,
    },
    {
      key: 'kpi-absent',
      label: 'Absent Today',
      value: String(kpi.absentEmployees),
      suffix: 'employees',
      change: kpi.absentEmployees > 0 ? 'Requires HR action' : 'Full attendance',
      changeType: kpi.absentEmployees > 0 ? 'negative' as const : 'positive' as const,
      icon: 'UserMinusIcon',
      iconBg: 'rgba(239, 68, 68, 0.12)',
      iconColor: 'text-danger',
      span: 1,
      subtext: `${kpi.absentEmployees} absent today`,
      alert: kpi.absentEmployees > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {kpiData.map((kpi) => (
        <div
          key={kpi.key}
          className={`
            card-base flex flex-col justify-between transition-all duration-200 hover:translate-y-[-2px] cursor-default
            ${kpi.span === 2 ? 'col-span-2' : 'col-span-1'}
            ${(kpi as any).alert ? 'card-glow-danger' : (kpi as any).warning ? 'card-glow-warning' : 'card-glow'}
          `}
          style={{
            background: (kpi as any).alert
              ? 'rgba(239, 68, 68, 0.04)'
              : (kpi as any).warning
              ? 'rgba(245, 158, 11, 0.04)'
              : 'var(--card)',
          }}
        >
          {/* Top row */}
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
              {kpi.label}
            </span>
            <div
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: kpi.iconBg }}
            >
              <Icon name={kpi.icon as any} size={15} className={kpi.iconColor} />
            </div>
          </div>

          {/* Value */}
          {loading ? (
            <div className="h-8 w-24 rounded animate-pulse mb-2" style={{ background: 'var(--muted)' }} />
          ) : (
            <div className={`mb-2 ${kpi.span === 2 ? 'metric-value-lg' : 'metric-value'} text-foreground font-tabular`}>
              {kpi.value}
              <span className="text-sm font-normal text-muted-foreground ml-1">{kpi.suffix}</span>
            </div>
          )}

          {/* Change indicator */}
          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs font-medium ${
                kpi.changeType === 'positive' ? 'text-success'
                  : kpi.changeType === 'negative' ? 'text-danger' : 'text-warning'
              }`}
            >
              {kpi.change}
            </span>
          </div>

          {/* Subtext */}
          <p className="text-xs text-muted-foreground mt-1">{kpi.subtext}</p>

          {/* Monthly target progress bar */}
          {(kpi as any).showProgress && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Monthly target</span>
                <span className="text-xs font-medium text-foreground">{(kpi as any).progressPct}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(kpi as any).progressPct}%`, background: 'var(--primary)' }}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}