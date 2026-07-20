'use client';

import React from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import Icon from '@/components/ui/AppIcon';
import type { TicketRow } from '@/hooks/useDashboardData';

interface ServiceTicketsFeedProps {
  tickets: TicketRow[];
  loading: boolean;
}

const statusIconMap: Record<string, string> = {
  ready: 'CheckCircleIcon',
  repairing: 'WrenchScrewdriverIcon',
  service: 'CogIcon',
  pending: 'ClockIcon',
  completed: 'CheckCircleIcon',
};

export default function ServiceTicketsFeed({ tickets, loading }: ServiceTicketsFeedProps) {
  const openTickets = tickets?.filter(t => t.ticket_status !== 'completed') || [];

  return (
    <div className="card-base card-glow flex-1">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Open Service Tickets</h3>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.25)' }}
        >
          {loading ? '...' : `${openTickets.length} total`}
        </span>
      </div>
      {loading ? (
        <div className="space-y-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={`skel-${i}`} className="h-14 rounded-lg animate-pulse" style={{ background: 'var(--muted)' }} />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {openTickets.slice(0, 5).map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-secondary transition-colors duration-100 cursor-pointer"
            >
              <div
                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
                style={{ background: 'rgba(139, 92, 246, 0.12)' }}
              >
                <Icon name={(statusIconMap[t.ticket_status] || 'ClockIcon') as any} size={13} className="text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-primary">{t.ticket_number}</span>
                  <StatusBadge variant={t.ticket_status as any} size="sm" />
                </div>
                <p className="text-xs text-foreground truncate mt-0.5">{t.customer}</p>
                <p className="text-xs text-muted-foreground truncate">{t.device} — {t.issue}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.days_open}d open</p>
              </div>
            </div>
          ))}
          {openTickets.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No open tickets</p>
          )}
        </div>
      )}
    </div>
  );
}