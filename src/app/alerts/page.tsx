'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import { createClient } from '@/lib/supabase/client';

type AlertType = 'failed_login' | 'role_change' | 'low_stock' | 'service_ticket';

interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

const typeConfig: Record<AlertType, { label: string; icon: string; color: string; bg: string }> = {
  failed_login: {
    label: 'Failed Login',
    icon: 'ShieldExclamationIcon',
    color: 'var(--danger)',
    bg: 'rgba(239, 68, 68, 0.1)',
  },
  role_change: {
    label: 'Role Change',
    icon: 'UserCircleIcon',
    color: 'var(--warning)',
    bg: 'rgba(245, 158, 11, 0.1)',
  },
  low_stock: {
    label: 'Low Stock',
    icon: 'ArchiveBoxXMarkIcon',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.1)',
  },
  service_ticket: {
    label: 'Service Ticket',
    icon: 'WrenchScrewdriverIcon',
    color: 'var(--primary)',
    bg: 'rgba(99, 102, 241, 0.1)',
  },
};

const ALL_TYPES: AlertType[] = ['failed_login', 'role_change', 'low_stock', 'service_ticket'];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AlertsPage() {
  const supabase = createClient();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | AlertType>('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [liveIndicator, setLiveIndicator] = useState(false);
  const liveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('id, type, title, message, metadata, is_read, created_at')
        .order('created_at', { ascending: false })
        .limit(300);
      if (!error && data) setAlerts(data as Alert[]);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // Filtering
  const filtered = alerts.filter((a) => {
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (readFilter === 'unread' && a.is_read) return false;
    if (readFilter === 'read' && !a.is_read) return false;
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(a.created_at) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(a.created_at) > to) return false;
    }
    return true;
  });

  // Mark single alert as read
  const markRead = async (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
    await supabase.from('alerts').update({ is_read: true }).eq('id', id);
  };

  // Mark all visible as read
  const markAllRead = async () => {
    const ids = filtered.filter((a) => !a.is_read).map((a) => a.id);
    if (!ids.length) return;
    setAlerts((prev) => prev.map((a) => (ids.includes(a.id) ? { ...a, is_read: true } : a)));
    await supabase.from('alerts').update({ is_read: true }).in('id', ids);
  };

  useEffect(() => {
    fetchAlerts();

    // Realtime subscription
    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          setAlerts((prev) => [payload.new as Alert, ...prev]);
          // Flash live indicator
          setLiveIndicator(true);
          if (liveTimer.current) clearTimeout(liveTimer.current);
          liveTimer.current = setTimeout(() => setLiveIndicator(false), 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (liveTimer.current) clearTimeout(liveTimer.current);
    };
  }, [fetchAlerts]);

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  const statsByType = ALL_TYPES.map((t) => ({
    type: t,
    total: alerts.filter((a) => a.type === t).length,
    unread: alerts.filter((a) => a.type === t && !a.is_read).length,
  }));

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">Alerts Center</h1>
              <span
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${liveIndicator ? 'opacity-100' : 'opacity-70'}`}
                style={{ background: liveIndicator ? 'rgba(34,197,94,0.15)' : 'var(--secondary)', color: liveIndicator ? 'var(--success)' : 'var(--muted-foreground)' }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: liveIndicator ? 'var(--success)' : 'var(--muted-foreground)', animation: liveIndicator ? 'pulse 1s infinite' : 'none' }}
                />
                {liveIndicator ? 'New alert received' : 'Live'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Real-time monitoring — failed logins, role changes, low stock, service tickets
            </p>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="btn-secondary text-sm flex items-center gap-2">
                <AppIcon name="CheckCircleIcon" size={15} />
                Mark all read
                <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                  {unreadCount}
                </span>
              </button>
            )}
            <button onClick={fetchAlerts} className="btn-secondary text-sm flex items-center gap-2">
              <AppIcon name="ArrowPathIcon" size={15} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsByType.map(({ type, total, unread }) => {
            const cfg = typeConfig[type];
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
                className={`card p-4 flex items-center gap-3 text-left transition-all duration-150 hover:shadow-md ${typeFilter === type ? 'ring-2' : ''}`}
                style={typeFilter === type ? { outline: `2px solid ${cfg.color}` } : {}}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: cfg.bg }}
                >
                  <AppIcon name={cfg.icon as any} size={20} style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{cfg.label}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-foreground">{total}</span>
                    {unread > 0 && (
                      <span className="text-xs font-semibold" style={{ color: cfg.color }}>
                        {unread} new
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          {/* Read/Unread toggle */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--secondary)' }}>
            {(['all', 'unread', 'read'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setReadFilter(v)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize ${readFilter === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                {v === 'all' ? `All (${alerts.length})` : v === 'unread' ? `Unread (${unreadCount})` : `Read (${alerts.length - unreadCount})`}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--secondary)' }}>
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${typeFilter === 'all' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              All types
            </button>
            {ALL_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(typeFilter === t ? 'all' : t)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize ${typeFilter === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                {typeConfig[t].label}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2 ml-auto">
            <AppIcon name="CalendarIcon" size={15} className="text-muted-foreground flex-shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input text-xs py-1.5 px-2 w-36"
              placeholder="From"
            />
            <span className="text-muted-foreground text-xs">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input text-xs py-1.5 px-2 w-36"
              placeholder="To"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <AppIcon name="XMarkIcon" size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Alerts list */}
        <div className="space-y-2">
          {loading ? (
            <div className="card flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <AppIcon name="ArrowPathIcon" size={20} className="animate-spin" />
              <span className="text-sm">Loading alerts...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <AppIcon name="BellSlashIcon" size={40} />
              <p className="text-sm font-medium">No alerts found</p>
              <p className="text-xs">Adjust filters or wait for new events to arrive</p>
            </div>
          ) : (
            filtered.map((alert) => {
              const cfg = typeConfig[alert.type] || typeConfig.service_ticket;
              return (
                <div
                  key={alert.id}
                  className={`card p-4 flex items-start gap-4 transition-all duration-150 hover:shadow-sm cursor-pointer ${!alert.is_read ? '' : 'opacity-80'}`}
                  style={!alert.is_read ? { borderLeft: `3px solid ${cfg.color}` } : { borderLeft: '3px solid transparent' }}
                  onClick={() => !alert.is_read && markRead(alert.id)}
                >
                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: cfg.bg }}
                  >
                    <AppIcon name={cfg.icon as any} size={18} style={{ color: cfg.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold text-foreground`}>{alert.title}</span>
                        {!alert.is_read && (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: cfg.color }}
                          />
                        )}
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground whitespace-nowrap" title={formatDate(alert.created_at)}>
                          {timeAgo(alert.created_at)}
                        </span>
                        {!alert.is_read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markRead(alert.id); }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Mark as read"
                          >
                            <AppIcon name="CheckIcon" size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{alert.message}</p>
                    {/* Metadata details */}
                    {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {alert.metadata.actor_email != null && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <AppIcon name="UserIcon" size={11} />
                            {String(alert.metadata.actor_email)}
                          </span>
                        )}
                        {alert.metadata.product_name != null && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <AppIcon name="CubeIcon" size={11} />
                            {String(alert.metadata.product_name)}
                          </span>
                        )}
                        {alert.metadata.ticket_id != null && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <AppIcon name="HashtagIcon" size={11} />
                            {String(alert.metadata.ticket_id)}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <AppIcon name="ClockIcon" size={11} />
                          {formatDate(alert.created_at)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground text-center pb-2">
            Showing {filtered.length} of {alerts.length} alerts
          </p>
        )}
      </div>
    </AppLayout>
  );
}
