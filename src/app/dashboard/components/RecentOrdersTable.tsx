'use client';

import React from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import Icon from '@/components/ui/AppIcon';
import type { OrderRow } from '@/hooks/useDashboardData';

interface RecentOrdersTableProps {
  orders: OrderRow[];
  loading: boolean;
}

function fmtUzs(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export default function RecentOrdersTable({ orders, loading }: RecentOrdersTableProps) {
  return (
    <div className="card-base card-glow h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Recent Orders</h3>
          <p className="text-xs text-muted-foreground">Last 8 orders across all branches</p>
        </div>
        <Link
          href="/sales-management"
          className="text-xs text-primary hover:text-info transition-colors flex items-center gap-1"
        >
          View all
          <Icon name="ArrowRightIcon" size={12} />
        </Link>
      </div>
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={`skel-${i}`} className="h-8 rounded animate-pulse" style={{ background: 'var(--muted)' }} />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Order #', 'Customer', 'Products', 'Total (UZS)', 'Status', 'Date'].map((h) => (
                  <th
                    key={`roth-${h}`}
                    className="text-left pb-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide pr-4 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders?.map((order, i) => (
                <tr
                  key={order.id}
                  className="transition-colors duration-100 hover:bg-secondary/50 cursor-pointer"
                  style={{ borderBottom: i < orders.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <td className="py-2.5 pr-4">
                    <span className="text-xs font-medium text-primary font-tabular">{order.order_number}</span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="text-xs text-foreground whitespace-nowrap">{order.customer}</span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="text-xs text-muted-foreground max-w-[180px] block truncate">{order.product}</span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="text-xs font-medium text-foreground font-tabular whitespace-nowrap">{fmtUzs(order.total_uzs)}</span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <StatusBadge variant={order.order_status as any} size="sm" />
                  </td>
                  <td className="py-2.5">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(order.order_date)}</span>
                  </td>
                </tr>
              ))}
              {!loading && orders?.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">No orders found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}