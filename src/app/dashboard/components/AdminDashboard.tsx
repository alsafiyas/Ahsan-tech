'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Icon from '@/components/ui/AppIcon';
import StatusBadge from '@/components/ui/StatusBadge';
import type { DashboardData } from '@/hooks/useDashboardData';

const MonthlyRevenueChart = dynamic(() => import('./charts/MonthlyRevenueChart'), { ssr: false });

interface AdminDashboardProps {
  dashboard: DashboardData;
}

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function SkeletonCard() {
  return <div className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--muted)' }} />;
}

export default function AdminDashboard({ dashboard }: AdminDashboardProps) {
  const { kpi, loading, chartsLoading, tableLoading, serviceTickets, monthlyRevenue, lastUpdated } = dashboard;

  const systemCards = [
    {
      key: 'sys-users',
      label: 'Active Users',
      value: kpi.activeUsers ?? 0,
      suffix: 'accounts',
      icon: 'UsersIcon',
      iconBg: 'rgba(14, 165, 233, 0.12)',
      iconColor: 'text-primary',
      link: '/user-management',
      linkLabel: 'Manage Users',
    },
    {
      key: 'sys-audit',
      label: 'Audit Log Entries',
      value: kpi.totalAuditLogs ?? 0,
      suffix: 'total',
      icon: 'ClipboardDocumentListIcon',
      iconBg: 'rgba(139, 92, 246, 0.12)',
      iconColor: 'text-purple-400',
      link: '/audit',
      linkLabel: 'View Logs',
    },
    {
      key: 'sys-alerts',
      label: 'Unresolved Alerts',
      value: kpi.criticalAlerts ?? 0,
      suffix: 'active',
      icon: 'BellAlertIcon',
      iconBg: (kpi.criticalAlerts ?? 0) > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
      iconColor: (kpi.criticalAlerts ?? 0) > 0 ? 'text-danger' : 'text-success',
      link: '/alerts',
      linkLabel: 'View Alerts',
      alert: (kpi.criticalAlerts ?? 0) > 0,
    },
    {
      key: 'sys-uptime',
      label: 'System Uptime',
      value: `${kpi.systemUptime ?? 99.9}%`,
      suffix: 'this month',
      icon: 'ServerIcon',
      iconBg: 'rgba(34, 197, 94, 0.12)',
      iconColor: 'text-success',
      link: '/settings',
      linkLabel: 'System Settings',
    },
  ];

  const salesCards = [
    {
      key: 'adm-today',
      label: "Today\'s Revenue",
      value: fmt(kpi.todaySales),
      suffix: 'UZS',
      sub: `Profit: ${fmt(kpi.todayProfit)} UZS`,
      icon: 'BanknotesIcon',
      iconBg: 'rgba(14, 165, 233, 0.12)',
      iconColor: 'text-primary',
    },
    {
      key: 'adm-monthly',
      label: 'Monthly Revenue',
      value: fmt(kpi.monthlySales),
      suffix: 'UZS',
      sub: `Profit: ${fmt(kpi.monthlyProfit)} UZS`,
      icon: 'ChartBarIcon',
      iconBg: 'rgba(34, 197, 94, 0.12)',
      iconColor: 'text-success',
    },
    {
      key: 'adm-overdue',
      label: 'Overdue Invoices',
      value: kpi.overdueInvoices,
      suffix: 'clients',
      sub: `${fmt(kpi.overdueAmount)} UZS outstanding`,
      icon: 'ExclamationTriangleIcon',
      iconBg: kpi.overdueInvoices > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
      iconColor: kpi.overdueInvoices > 0 ? 'text-danger' : 'text-success',
      alert: kpi.overdueInvoices > 0,
    },
    {
      key: 'adm-staff',
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
          <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            System health & audit overview
            {lastUpdated && <span className="ml-2 opacity-60">· Updated {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/audit" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-secondary" style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
            <Icon name="ClipboardDocumentListIcon" size={14} />
            <span className="hidden sm:inline">Audit Logs</span>
          </Link>
          <Link href="/roles" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-secondary" style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
            <Icon name="UsersIcon" size={14} />
            <span className="hidden sm:inline">Users</span>
          </Link>
          <Link href="/settings" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-secondary" style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
            <Icon name="Cog6ToothIcon" size={14} />
            <span className="hidden sm:inline">Settings</span>
          </Link>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: 'var(--success)' }}>
            <span className={`w-1.5 h-1.5 rounded-full bg-success ${!loading ? 'animate-pulse' : ''}`} />
            {loading ? 'Loading...' : 'Live'}
          </div>
        </div>
      </div>

      {/* System Health Cards */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">System Health</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`sk-sys-${i}`} />) :
            systemCards.map(card => (
              <div
                key={card.key}
                className={`card-base flex flex-col gap-2 transition-all duration-200 hover:translate-y-[-2px] ${card.alert ? 'card-glow-danger' : 'card-glow'}`}
                style={{ background: card.alert ? 'rgba(239, 68, 68, 0.04)' : 'var(--card)' }}
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
                <Link href={card.link} className="text-xs text-primary hover:text-info transition-colors flex items-center gap-1 mt-auto">
                  {card.linkLabel} <Icon name="ArrowRightIcon" size={11} />
                </Link>
              </div>
            ))
          }
        </div>
      </div>

      {/* Business KPIs */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Business Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`sk-biz-${i}`} />) :
            salesCards.map(card => (
              <div
                key={card.key}
                className={`card-base flex flex-col gap-2 transition-all duration-200 hover:translate-y-[-2px] ${card.alert ? 'card-glow-danger' : 'card-glow'}`}
                style={{ background: card.alert ? 'rgba(239, 68, 68, 0.04)' : 'var(--card)' }}
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
              </div>
            ))
          }
        </div>
      </div>

      {/* Revenue Chart + Recent Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-base card-glow" style={{ minHeight: '240px' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Monthly Revenue by Branch</h3>
              <p className="text-xs text-muted-foreground">Last 7 months — All branches</p>
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

        {/* Open Tickets Summary */}
        <div className="card-base card-glow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Service Tickets</h3>
            <Link href="/service" className="text-xs text-primary hover:text-info flex items-center gap-1">
              View all <Icon name="ArrowRightIcon" size={11} />
            </Link>
          </div>
          {tableLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`sk-t-${i}`} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--muted)' }} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {serviceTickets.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-primary">{t.ticket_number}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.customer}</p>
                  </div>
                  <StatusBadge variant={t.ticket_status as any} size="sm" />
                </div>
              ))}
              {serviceTickets.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No tickets</p>}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'qa-audit-cfg', href: '/audit-config', icon: 'AdjustmentsHorizontalIcon', label: 'Audit Config' },
            { key: 'qa-roles', href: '/roles', icon: 'ShieldCheckIcon', label: 'Manage Roles' },
            { key: 'qa-branches', href: '/branches', icon: 'BuildingOfficeIcon', label: 'Branches' },
            { key: 'qa-reports', href: '/reports', icon: 'DocumentChartBarIcon', label: 'Reports' },
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
