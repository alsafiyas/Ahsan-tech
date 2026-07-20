'use client';

import React from 'react';
import { Customer } from '../../data/customers';

interface PaymentHistoryTabProps {
  customer: Customer;
}

interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  contract: string;
  status: 'paid' | 'partial' | 'overdue';
  note?: string;
}

const mockPayments: Payment[] = [
  { id: 'p1', date: '2026-07-01', amount: 3600000, method: 'Bank Transfer', contract: 'CTR-2025-012', status: 'paid' },
  { id: 'p2', date: '2026-06-01', amount: 3600000, method: 'Cash', contract: 'CTR-2025-012', status: 'paid' },
  { id: 'p3', date: '2026-05-01', amount: 1800000, method: 'Bank Transfer', contract: 'CTR-2025-012', status: 'partial', note: 'Partial payment, remaining 1,800,000 UZS' },
  { id: 'p4', date: '2026-04-01', amount: 3600000, method: 'Cash', contract: 'CTR-2025-012', status: 'paid' },
  { id: 'p5', date: '2025-12-01', amount: 3600000, method: 'Bank Transfer', contract: 'CTR-2024-045', status: 'paid' },
];

const statusStyle: Record<string, string> = {
  paid: 'bg-emerald-500/15 text-emerald-400',
  partial: 'bg-amber-500/15 text-amber-400',
  overdue: 'bg-red-500/15 text-red-400',
};

const methodIcon: Record<string, React.ReactNode> = {
  'Bank Transfer': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  Cash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
};

export default function PaymentHistoryTab({ customer }: PaymentHistoryTabProps) {
  const totalPaid = mockPayments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-5 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Paid', value: `${(totalPaid / 1000000).toFixed(1)}M UZS`, color: 'text-success' },
          { label: 'Transactions', value: mockPayments.length.toString(), color: 'text-foreground' },
          { label: 'Outstanding', value: customer.totalDebt > 0 ? `${(customer.totalDebt / 1000000).toFixed(1)}M UZS` : '0', color: customer.totalDebt > 0 ? 'text-danger' : 'text-success' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-3 text-center"
            style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}
          >
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Payment History</h3>
        <button className="btn-primary text-xs gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Record Payment
        </button>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--secondary)', borderBottom: '1px solid var(--border)' }}>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Contract</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Method</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Amount</th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {mockPayments.map((p, i) => (
              <tr
                key={p.id}
                style={{
                  borderBottom: i < mockPayments.length - 1 ? '1px solid var(--border)' : 'none',
                  background: 'var(--card)',
                }}
              >
                <td className="px-4 py-3 text-sm text-foreground">{p.date}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{p.contract}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {methodIcon[p.method] ?? null}
                    {p.method}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                  {p.amount.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[p.status]}`}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
