'use client';

import React from 'react';
import Icon from '@/components/ui/AppIcon';
import type { SalesOrder } from './SalesOrdersTable';

interface SalesStatsBarProps {
  orders: SalesOrder[];
}

export default function SalesStatsBar({ orders }: SalesStatsBarProps) {
  const totalRevenue = orders.reduce((s, o) => s + o.totalUZS, 0);
  const totalPaid = orders.reduce((s, o) => s + o.paidUZS, 0);
  const totalBalance = orders.reduce((s, o) => s + o.balanceUZS, 0);
  const overdueCount = orders.filter((o) => o.status === 'overdue').length;
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;
  const cancelledLost = orders
    .filter((o) => o.status === 'cancelled')
    .reduce((s, o) => s + o.totalUZS, 0);

  const stats = [
    {
      key: 'stat-orders-total',
      label: "Jami buyurtmalar",
      value: orders.length.toString(),
      sub: `${orders.filter((o) => o.status === 'paid').length} ta to'langan`,icon: 'ShoppingCartIcon',color: 'text-primary',bg: 'rgba(14, 165, 233, 0.1)',
    },
    {
      key: 'stat-revenue-total',label: 'Umumiy daromad',value: totalRevenue.toLocaleString('ru-RU'),suffix: 'UZS',sub: `To'langan: ${totalPaid.toLocaleString('ru-RU')} UZS`,
      icon: 'BanknotesIcon',
      color: 'text-success',
      bg: 'rgba(34, 197, 94, 0.1)',
    },
    {
      key: 'stat-pending',
      label: "Kutilayotgan to\'lovlar",
      value: totalBalance.toLocaleString('ru-RU'),
      suffix: 'UZS',
      sub: `${overdueCount} ta muddati o'tgan`,icon: 'ClockIcon',color: 'text-warning',bg: 'rgba(245, 158, 11, 0.1)',
    },
    {
      key: 'stat-cancelled',label: 'Bekor qilingan',
      value: cancelledCount.toString(),
      sub: cancelledLost > 0 ? `${cancelledLost.toLocaleString('ru-RU')} UZS yo'qotildi` : 'Yo\'qotish yo\'q',
      icon: 'XCircleIcon',
      color: 'text-danger',
      bg: 'rgba(239, 68, 68, 0.1)',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.key} className="card-base card-glow flex items-center gap-4">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: s.bg }}
          >
            <Icon name={s.icon as any} size={18} className={s.color} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{s.label}</p>
            <p className="text-xl font-bold text-foreground font-tabular mt-0.5">
              {s.value}
              {s.suffix && <span className="text-xs font-normal text-muted-foreground ml-1">{s.suffix}</span>}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}