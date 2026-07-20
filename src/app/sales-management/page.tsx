'use client';

import React, { useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import RoleGuard from '@/components/RoleGuard';
import SalesOrdersTable, { SalesOrdersTableRef } from './components/SalesOrdersTable';
import AppIcon from '@/components/ui/AppIcon';

export default function SalesManagementPage() {
  const tableRef = useRef<SalesOrdersTableRef>(null);

  return (
    <AppLayout>
      <RoleGuard allowedRoles={['Admin', 'Manager', 'Operator']}>
        <div className="space-y-5">
          {/* Page header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Sales Management</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Orders, invoices, payments — Tashkent HQ
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                className="btn-secondary text-xs gap-2 flex items-center"
                onClick={() => tableRef?.current?.exportExcel()}
              >
                <AppIcon name="TableCellsIcon" size={14} />
                Export Excel
              </button>
              <button
                className="btn-secondary text-xs gap-2 flex items-center"
                onClick={() => tableRef?.current?.exportPDF()}
              >
                <AppIcon name="DocumentArrowDownIcon" size={14} />
                Export PDF
              </button>
              <button
                className="btn-primary text-xs gap-2 flex items-center"
                onClick={() => tableRef?.current?.openNewOrder()}
              >
                <AppIcon name="PlusIcon" size={14} />
                New Order
              </button>
            </div>
          </div>

          {/* Table includes stats bar + filters */}
          <SalesOrdersTable ref={tableRef} />
        </div>
      </RoleGuard>
    </AppLayout>
  );
}