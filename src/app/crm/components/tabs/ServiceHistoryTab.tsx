'use client';

import React from 'react';
import { Customer } from '../../data/customers';

interface ServiceHistoryTabProps {
  customer: Customer;
}

interface ServiceTicket {
  id: string;
  ticketNo: string;
  date: string;
  device: string;
  issue: string;
  technician: string;
  cost: number;
  status: 'completed' | 'repairing' | 'pending' | 'delivered';
  object: string;
}

const mockTickets: ServiceTicket[] = [
  { id: 's1', ticketNo: 'SRV-2026-0234', date: '2026-07-10', device: 'Hikvision DS-2CD2143G2', issue: 'Camera offline, no image', technician: 'Jasur Texnik', cost: 150000, status: 'completed', object: 'Main Office' },
  { id: 's2', ticketNo: 'SRV-2026-0198', date: '2026-06-22', device: 'NVR DS-7608NI-K2', issue: 'HDD failure, data loss', technician: 'Bobur Texnik', cost: 850000, status: 'completed', object: 'Warehouse A' },
  { id: 's3', ticketNo: 'SRV-2026-0312', date: '2026-07-14', device: 'PTZ Camera DS-2DE4425IWG', issue: 'Motor not rotating', technician: 'Jasur Texnik', cost: 0, status: 'repairing', object: 'Parking Zone' },
  { id: 's4', ticketNo: 'SRV-2025-1102', date: '2025-11-05', device: 'Dahua IPC-HDW2831T', issue: 'IR LEDs not working at night', technician: 'Sherzod Texnik', cost: 200000, status: 'delivered', object: 'Main Office' },
];

const statusStyle: Record<string, string> = {
  completed: 'bg-emerald-500/15 text-emerald-400',
  repairing: 'bg-amber-500/15 text-amber-400',
  pending: 'bg-blue-500/15 text-blue-400',
  delivered: 'bg-teal-500/15 text-teal-400',
};

export default function ServiceHistoryTab({ customer }: ServiceHistoryTabProps) {
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Service History ({mockTickets.length})</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total service cost: {mockTickets.reduce((s, t) => s + t.cost, 0).toLocaleString()} UZS
          </p>
        </div>
        <button className="btn-primary text-xs gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Ticket
        </button>
      </div>

      <div className="space-y-3">
        {mockTickets.map((t) => (
          <div
            key={t.id}
            className="rounded-xl p-4"
            style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(239,68,68,0.1)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5">
                    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{t.ticketNo}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[t.status]}`}>
                      {t.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.device}</p>
                  <p className="text-xs text-foreground mt-1 font-medium">Issue: {t.issue}</p>
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">📅 {t.date}</span>
                    <span className="text-xs text-muted-foreground">🏢 {t.object}</span>
                    <span className="text-xs text-muted-foreground">👨‍🔧 {t.technician}</span>
                    {t.cost > 0 && (
                      <span className="text-xs font-semibold text-foreground">{t.cost.toLocaleString()} UZS</span>
                    )}
                  </div>
                </div>
              </div>
              <button className="btn-secondary text-xs flex-shrink-0">View</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
