'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import Icon from '@/components/ui/AppIcon';
import type { SalesOrder } from './SalesOrdersTable';

interface OrderDetailModalProps {
  order: SalesOrder;
  onClose: () => void;
  onRecordPayment: (order: SalesOrder) => void;
}

const paymentHistory = [
  { key: 'ph-1', date: '10.07.2026', amount: 6375000, method: 'Cash', ref: 'CASH-0891', recordedBy: 'Malika Tursunova' },
];

export default function OrderDetailModal({ order, onClose, onRecordPayment }: OrderDetailModalProps) {
  const paidPct = Math.round((order.paidUZS / order.totalUZS) * 100);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Order ${order.orderNumber}`}
      subtitle={`Created ${order.date} — ${order.branch}`}
      size="lg"
      footer={
        <>
          <button className="btn-secondary text-sm" onClick={onClose}>
            Close
          </button>
          <button
            className="btn-secondary text-sm gap-2"
            onClick={() => window.open('#', '_blank')}
          >
            <Icon name="DocumentTextIcon" size={14} />
            Print Invoice
          </button>
          {(order.status === 'partial' || order.status === 'invoiced' || order.status === 'overdue' || order.status === 'confirmed') && (
            <button
              className="btn-primary text-sm gap-2"
              onClick={() => onRecordPayment(order)}
            >
              <Icon name="BanknotesIcon" size={14} />
              Record Payment
            </button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        {/* Header summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'od-total', label: 'Order Total', value: `${order.totalUZS.toLocaleString('ru-RU')} UZS`, color: 'text-foreground' },
            { key: 'od-paid', label: 'Amount Paid', value: order.paidUZS === 0 ? '—' : `${order.paidUZS.toLocaleString('ru-RU')} UZS`, color: 'text-success' },
            { key: 'od-balance', label: 'Balance Due', value: order.balanceUZS === 0 ? 'Settled' : `${order.balanceUZS.toLocaleString('ru-RU')} UZS`, color: order.balanceUZS > 0 ? 'text-danger' : 'text-success' },
            { key: 'od-status', label: 'Status', value: null, badge: order.status },
          ].map((item) => (
            <div
              key={item.key}
              className="p-3 rounded-xl"
              style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
              {item.badge ? (
                <StatusBadge variant={item.badge} />
              ) : (
                <p className={`text-sm font-semibold font-tabular ${item.color}`}>{item.value}</p>
              )}
            </div>
          ))}
        </div>

        {/* Payment progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Payment Progress</span>
            <span className="text-sm font-semibold text-foreground font-tabular">{paidPct}%</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${paidPct}%`,
                background: paidPct === 100 ? 'var(--success)' : paidPct > 50 ? 'var(--primary)' : 'var(--warning)',
              }}
            />
          </div>
        </div>

        {/* Customer & Order Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer */}
          <div
            className="p-4 rounded-xl space-y-3"
            style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer</p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                style={{
                  background: order.customerType === 'corporate' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(14, 165, 233, 0.15)',
                  color: order.customerType === 'corporate' ? 'var(--accent)' : 'var(--primary)',
                }}
              >
                {order.customer[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{order.customer}</p>
                <p className="text-xs text-muted-foreground capitalize">{order.customerType} client</p>
              </div>
            </div>
          </div>

          {/* Order info */}
          <div
            className="p-4 rounded-xl space-y-2"
            style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Order Info</p>
            {[
              { key: 'oi-branch', label: 'Branch', value: order.branch },
              { key: 'oi-manager', label: 'Sales Manager', value: order.manager },
              { key: 'oi-method', label: 'Payment Method', value: order.paymentMethod },
              { key: 'oi-due', label: 'Due Date', value: order.dueDate },
            ].map((row) => (
              <div key={row.key} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{row.label}</span>
                <span className="text-xs font-medium text-foreground">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Products */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-3">Products in Order</p>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                  {['Product', 'SKU', 'Qty', 'Unit Price', 'Total'].map((h) => (
                    <th key={`pdh-${h}`} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'pline-1', name: 'Hikvision DS-2CD2T47G2-L', sku: 'HIK-2CD2T47', qty: 4, unitPrice: 3850000, total: 15400000 },
                  { key: 'pline-2', name: 'RG59 Coaxial Cable 100m', sku: 'CBL-RG59-100', qty: 1, unitPrice: 2100000, total: 2100000 },
                  { key: 'pline-3', name: 'Installation labor', sku: 'SVC-INSTALL', qty: 1, unitPrice: 900000, total: 900000 },
                ].map((line, i, arr) => (
                  <tr
                    key={line.key}
                    className="hover:bg-secondary/30 transition-colors"
                    style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}
                  >
                    <td className="px-4 py-2.5 text-xs text-foreground">{line.name}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground font-tabular">{line.sku}</td>
                    <td className="px-4 py-2.5 text-xs text-foreground text-center font-tabular">{line.qty}</td>
                    <td className="px-4 py-2.5 text-xs text-foreground font-tabular">{line.unitPrice.toLocaleString('ru-RU')}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-foreground font-tabular">{line.total.toLocaleString('ru-RU')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                  <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-foreground text-right">Total</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-primary font-tabular">
                    {order.totalUZS.toLocaleString('ru-RU')} UZS
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Payment history */}
        {order.paidUZS > 0 && (
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Payment History</p>
            <div className="space-y-2">
              {paymentHistory.map((ph) => (
                <div
                  key={ph.key}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.15)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(34, 197, 94, 0.12)' }}
                    >
                      <Icon name="BanknotesIcon" size={14} className="text-success" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{ph.method} — {ph.ref}</p>
                      <p className="text-xs text-muted-foreground">{ph.date} · Recorded by {ph.recordedBy}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-success font-tabular">
                    +{ph.amount.toLocaleString('ru-RU')} UZS
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}