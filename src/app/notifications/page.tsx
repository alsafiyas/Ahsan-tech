'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import { useLanguage } from '@/context/LanguageContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  channel: 'system' | 'telegram' | 'sms' | 'email';
  time: string;
  read: boolean;
  category: string;
}

const initialNotifications: Notification[] = [];

const typeConfig: Record<Notification['type'], { color: string; bg: string; icon: string; borderColor: string }> = {
  info:    { color: 'var(--primary)',  bg: 'rgba(14, 165, 233, 0.12)',  icon: 'InformationCircleIcon',   borderColor: 'rgba(14, 165, 233, 0.3)' },
  warning: { color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.12)',  icon: 'ExclamationTriangleIcon', borderColor: 'rgba(245, 158, 11, 0.3)' },
  success: { color: 'var(--success)', bg: 'rgba(34, 197, 94, 0.12)',   icon: 'CheckCircleIcon',          borderColor: 'rgba(34, 197, 94, 0.3)' },
  error:   { color: 'var(--danger)',  bg: 'rgba(239, 68, 68, 0.12)',   icon: 'XCircleIcon',              borderColor: 'rgba(239, 68, 68, 0.3)' },
};

const channelConfig: Record<Notification['channel'], { label: string; icon: string }> = {
  system:   { label: 'System',   icon: 'BellIcon' },
  telegram: { label: 'Telegram', icon: 'ChatBubbleLeftRightIcon' },
  sms:      { label: 'SMS',      icon: 'DevicePhoneMobileIcon' },
  email:    { label: 'Email',    icon: 'EnvelopeIcon' },
};

const categoryColors: Record<string, string> = {
  Warehouse:    'rgba(14, 165, 233, 0.15)',
  Service:      'rgba(139, 92, 246, 0.15)',
  Finance:      'rgba(34, 197, 94, 0.15)',
  Installation: 'rgba(245, 158, 11, 0.15)',
  HR:           'rgba(239, 68, 68, 0.15)',
  CRM:          'rgba(14, 165, 233, 0.15)',
  System:       'rgba(100, 116, 139, 0.15)',
};

const categoryTextColors: Record<string, string> = {
  Warehouse:    '#38bdf8',
  Service:      '#a78bfa',
  Finance:      '#4ade80',
  Installation: '#fbbf24',
  HR:           '#f87171',
  CRM:          '#38bdf8',
  System:       '#94a3b8',
};

export default function NotificationsPage() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const categories = ['All', ...Array.from(new Set(notifications.map((n) => n.category)))];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = notifications.filter((n) => {
    const matchRead = filter === 'all' || !n.read;
    const matchCat = categoryFilter === 'All' || n.category === categoryFilter;
    return matchRead && matchCat;
  });

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>{t.notifications_title}</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{t.notifications_subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Ko&apos;rildi ({unreadCount})
            </button>
            <button className="btn-secondary text-sm flex items-center gap-2">
              <AppIcon name="Cog6ToothIcon" size={16} />
              Settings
            </button>
          </div>
        </div>

        {/* Notification Channels Status */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'System',       icon: 'BellIcon',                   status: 'Active', color: 'var(--primary)' },
            { label: 'Telegram Bot', icon: 'ChatBubbleLeftRightIcon',    status: 'Active', color: 'var(--success)' },
            { label: 'SMS Gateway',  icon: 'DevicePhoneMobileIcon',      status: 'Active', color: 'var(--success)' },
            { label: 'Email',        icon: 'EnvelopeIcon',               status: 'Active', color: 'var(--success)' },
          ].map((ch) => (
            <div key={ch.label} className="card p-4 flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${ch.color === 'var(--primary)' ? 'rgba(14,165,233,0.15)' : 'rgba(34,197,94,0.15)'}` }}
              >
                <AppIcon name={ch.icon as any} size={18} style={{ color: ch.color }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{ch.label}</p>
                <p className="text-xs font-medium" style={{ color: 'var(--success)' }}>{ch.status}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--secondary)' }}>
            <button
              onClick={() => setFilter('all')}
              className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
              style={filter === 'all'
                ? { background: 'var(--card)', color: 'var(--foreground)' }
                : { color: 'var(--muted-foreground)' }}
            >
              Barchasi ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
              style={filter === 'unread'
                ? { background: 'var(--card)', color: 'var(--foreground)' }
                : { color: 'var(--muted-foreground)' }}
            >
              O&apos;qilmagan ({unreadCount})
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={categoryFilter === cat
                  ? { background: 'var(--primary)', color: 'var(--primary-foreground)' }
                  : { background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {filtered.map((notif) => (
            <div
              key={notif.id}
              className="card p-4 flex items-start gap-4 transition-colors"
              style={!notif.read
                ? {
                    borderLeft: `3px solid ${typeConfig[notif.type].color}`,
                    background: 'var(--card)',
                  }
                : { borderLeft: '3px solid transparent' }}
            >
              {/* Type icon */}
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: typeConfig[notif.type].bg }}
              >
                <AppIcon name={typeConfig[notif.type].icon as any} size={18} style={{ color: typeConfig[notif.type].color }} />
              </div>

              <div className="flex-1 min-w-0">
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: 'var(--primary)' }}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="text-xs whitespace-nowrap"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      {notif.time}
                    </span>
                    {!notif.read && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors hover:opacity-80"
                        style={{ background: 'rgba(14,165,233,0.12)', color: 'var(--primary)', border: '1px solid rgba(14,165,233,0.25)' }}
                        title="Ko'rildi deb belgilash"
                      >
                        <AppIcon name="CheckIcon" size={11} />
                        Ko&apos;rildi
                      </button>
                    )}
                  </div>
                </div>

                {/* Message */}
                <p
                  className="text-sm mt-1 leading-relaxed"
                  style={{ color: notif.read ? 'var(--secondary-foreground)' : 'var(--foreground)', opacity: notif.read ? 0.85 : 1 }}
                >
                  {notif.message}
                </p>

                {/* Footer badges */}
                <div className="flex items-center gap-3 mt-2">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-semibold"
                    style={{
                      background: categoryColors[notif.category] ?? 'rgba(100,116,139,0.15)',
                      color: categoryTextColors[notif.category] ?? '#94a3b8',
                    }}
                  >
                    {notif.category}
                  </span>
                  <span
                    className="flex items-center gap-1 text-xs"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    <AppIcon name={channelConfig[notif.channel].icon as any} size={12} />
                    {channelConfig[notif.channel].label}
                  </span>
                  {notif.read && (
                    <span
                      className="flex items-center gap-1 text-xs"
                      style={{ color: 'var(--success)' }}
                    >
                      <AppIcon name="CheckCircleIcon" size={12} />
                      Ko&apos;rildi
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="card p-12 flex flex-col items-center gap-3">
              <AppIcon name="BellSlashIcon" size={40} style={{ color: 'var(--muted-foreground)' }} />
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {filter === 'unread' ? 'Barcha bildirishnomalar ko\'rildi' : 'Bildirishnomalar topilmadi'}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
