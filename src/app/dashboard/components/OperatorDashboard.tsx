'use client';

import React from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import StatusBadge from '@/components/ui/StatusBadge';
import type { DashboardData } from '@/hooks/useDashboardData';

interface OperatorDashboardProps {
  dashboard: DashboardData;
}

function SkeletonCard() {
  return <div className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--muted)' }} />;
}

const statusIconMap: Record<string, string> = {
  ready: 'CheckCircleIcon',
  repairing: 'WrenchScrewdriverIcon',
  service: 'CogIcon',
  pending: 'ClockIcon',
  completed: 'CheckCircleIcon',
};

const statusPriorityColor: Record<string, string> = {
  ready: 'rgba(34, 197, 94, 0.12)',
  repairing: 'rgba(14, 165, 233, 0.12)',
  service: 'rgba(139, 92, 246, 0.12)',
  pending: 'rgba(245, 158, 11, 0.12)',
  completed: 'rgba(34, 197, 94, 0.12)',
};

export default function OperatorDashboard({ dashboard }: OperatorDashboardProps) {
  const { kpi, loading, tableLoading, serviceTickets, lowStockItems, lastUpdated } = dashboard;

  const openTickets = serviceTickets.filter(t => t.ticket_status !== 'completed');
  const readyTickets = serviceTickets.filter(t => t.ticket_status === 'ready');
  const repairingTickets = serviceTickets.filter(t => t.ticket_status === 'repairing');
  const pendingTickets = serviceTickets.filter(t => t.ticket_status === 'pending');

  const kpiCards = [
    {
      key: 'op-open',
      label: 'Open Tickets',
      value: openTickets.length,
      suffix: 'active',
      icon: 'WrenchScrewdriverIcon',
      iconBg: 'rgba(139, 92, 246, 0.12)',
      iconColor: 'text-purple-400',
      sub: `${repairingTickets.length} in repair`,
    },
    {
      key: 'op-ready',
      label: 'Ready for Pickup',
      value: readyTickets.length,
      suffix: 'devices',
      icon: 'CheckCircleIcon',
      iconBg: 'rgba(34, 197, 94, 0.12)',
      iconColor: 'text-success',
      sub: 'Awaiting customer',
      highlight: readyTickets.length > 0,
    },
    {
      key: 'op-pending',
      label: 'Pending Diagnosis',
      value: pendingTickets.length,
      suffix: 'tickets',
      icon: 'ClockIcon',
      iconBg: pendingTickets.length > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(34, 197, 94, 0.12)',
      iconColor: pendingTickets.length > 0 ? 'text-warning' : 'text-success',
      sub: 'Needs attention',
      warning: pendingTickets.length > 0,
    },
    {
      key: 'op-installations',
      label: "Today\'s Installations",
      value: kpi.todayInstallations,
      suffix: 'jobs',
      icon: 'MapPinIcon',
      iconBg: 'rgba(14, 165, 233, 0.12)',
      iconColor: 'text-primary',
      sub: `${kpi.completedInstallations} done · ${kpi.inProgressInstallations} in progress`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Service & Operations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Operator view — tickets & field work
            {lastUpdated && <span className="ml-2 opacity-60">· {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/service" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-secondary" style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
            <Icon name="WrenchScrewdriverIcon" size={14} />
            <span className="hidden sm:inline">Service</span>
          </Link>
          <Link href="/installation" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-secondary" style={{ border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
            <Icon name="MapPinIcon" size={14} />
            <span className="hidden sm:inline">Installations</span>
          </Link>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: 'var(--success)' }}>
            <span className={`w-1.5 h-1.5 rounded-full bg-success ${!loading ? 'animate-pulse' : ''}`} />
            {loading ? 'Loading...' : 'Live'}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`sk-op-${i}`} />) :
          kpiCards.map(card => (
            <div
              key={card.key}
              className={`card-base flex flex-col gap-2 transition-all duration-200 hover:translate-y-[-2px] ${card.warning ? 'card-glow-warning' : card.highlight ? 'card-glow' : 'card-glow'}`}
              style={{ background: card.warning ? 'rgba(245, 158, 11, 0.04)' : 'var(--card)' }}
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

      {/* Tickets + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Tickets Feed */}
        <div className="lg:col-span-2 card-base card-glow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Active Service Tickets</h3>
              <p className="text-xs text-muted-foreground">{openTickets.length} open tickets</p>
            </div>
            <Link href="/service" className="text-xs text-primary hover:text-info flex items-center gap-1">
              All tickets <Icon name="ArrowRightIcon" size={11} />
            </Link>
          </div>
          {tableLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={`sk-tkt-${i}`} className="h-16 rounded-lg animate-pulse" style={{ background: 'var(--muted)' }} />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {openTickets.slice(0, 8).map(t => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                    style={{ background: statusPriorityColor[t.ticket_status] || 'rgba(139, 92, 246, 0.12)' }}
                  >
                    <Icon name={(statusIconMap[t.ticket_status] || 'ClockIcon') as any} size={14} className="text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-primary">{t.ticket_number}</span>
                      <StatusBadge variant={t.ticket_status as any} size="sm" />
                    </div>
                    <p className="text-xs font-medium text-foreground truncate">{t.customer}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.device} — {t.issue}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Icon name="ClockIcon" size={10} />
                      {t.days_open}d open
                    </p>
                  </div>
                </div>
              ))}
              {openTickets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Icon name="CheckCircleIcon" size={32} className="text-success opacity-50" />
                  <p className="text-sm text-muted-foreground">All tickets resolved</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Low Stock */}
          <div className="card-base card-glow-warning flex-1" style={{ background: 'rgba(245, 158, 11, 0.03)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                <Icon name="ExclamationTriangleIcon" size={13} className="text-warning" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Low Stock Alerts</h3>
              <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                {tableLoading ? '...' : `${lowStockItems?.length || 0} items`}
              </span>
            </div>
            {tableLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={`sk-ls-${i}`} className="h-8 rounded animate-pulse" style={{ background: 'var(--muted)' }} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockItems?.map(item => {
                  const pct = Math.round((item.current_stock / item.minimum_stock) * 100);
                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-foreground truncate max-w-[140px]">{item.name}</span>
                        <span className="text-xs font-medium text-warning font-tabular flex-shrink-0">{item.current_stock}/{item.minimum_stock} {item.unit}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: pct <= 20 ? 'var(--danger)' : 'var(--warning)' }} />
                      </div>
                    </div>
                  );
                })}
                {(!lowStockItems || lowStockItems.length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-2">All items stocked</p>
                )}
              </div>
            )}
          </div>

          {/* Today's Installations */}
          <div className="card-base card-glow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Today's Installations</h3>
              <Link href="/installation" className="text-xs text-primary hover:text-info flex items-center gap-1">
                View <Icon name="ArrowRightIcon" size={11} />
              </Link>
            </div>
            {loading ? (
              <div className="h-16 rounded-lg animate-pulse" style={{ background: 'var(--muted)' }} />
            ) : (
              <div className="space-y-2">
                {[
                  { key: 'inst-total', label: 'Total Jobs', value: kpi.todayInstallations, color: 'text-foreground' },
                  { key: 'inst-done', label: 'Completed', value: kpi.completedInstallations, color: 'text-success' },
                  { key: 'inst-prog', label: 'In Progress', value: kpi.inProgressInstallations, color: 'text-primary' },
                ].map(row => (
                  <div key={row.key} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className={`text-sm font-semibold font-tabular ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'qa-new-ticket', href: '/service', icon: 'PlusCircleIcon', label: 'New Ticket' },
            { key: 'qa-installation', href: '/installation', icon: 'MapPinIcon', label: 'Installations' },
            { key: 'qa-warehouse', href: '/warehouse', icon: 'BuildingStorefrontIcon', label: 'Warehouse' },
            { key: 'qa-calendar', href: '/calendar', icon: 'CalendarIcon', label: 'Calendar' },
          ].map(action => (
            <Link
              key={action.key}
              href={action.href}
              className="card-base card-glow flex items-center gap-3 p-3 hover:bg-secondary transition-all duration-150 hover:translate-y-[-1px]"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139, 92, 246, 0.12)' }}>
                <Icon name={action.icon as any} size={15} className="text-purple-400" />
              </div>
              <span className="text-sm font-medium text-foreground">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
