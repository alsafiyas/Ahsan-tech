import React from 'react';
import RecentOrdersTable from './RecentOrdersTable';
import ServiceTicketsFeed from './ServiceTicketsFeed';
import LowStockAlert from './LowStockAlert';
import type { OrderRow, TicketRow, LowStockRow } from '@/hooks/useDashboardData';

interface DashboardBottomRowProps {
  recentOrders: OrderRow[];
  serviceTickets: TicketRow[];
  lowStockItems: LowStockRow[];
  loading: boolean;
}

export default function DashboardBottomRow({ recentOrders, serviceTickets, lowStockItems, loading }: DashboardBottomRowProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4">
      {/* Recent orders — 2 cols */}
      <div className="lg:col-span-2">
        <RecentOrdersTable orders={recentOrders} loading={loading} />
      </div>
      {/* Right column: service tickets + low stock */}
      <div className="flex flex-col gap-4">
        <ServiceTicketsFeed tickets={serviceTickets} loading={loading} />
        <LowStockAlert items={lowStockItems} loading={loading} />
      </div>
    </div>
  );
}