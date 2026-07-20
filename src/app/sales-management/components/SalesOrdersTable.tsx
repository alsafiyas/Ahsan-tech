'use client';

import React, { useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import { toast } from 'sonner';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import Icon from '@/components/ui/AppIcon';
import SalesFilterToolbar from './SalesFilterToolbar';
import RecordPaymentModal from './RecordPaymentModal';
import OrderDetailModal from './OrderDetailModal';
import AddEditOrderModal from './AddEditOrderModal';
import SalesStatsBar from './SalesStatsBar';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';

// Backend integration point: GET /api/orders with pagination/filters

export type OrderStatus = 'draft' | 'confirmed' | 'invoiced' | 'paid' | 'partial' | 'overdue' | 'cancelled';
export type PaymentMethod = 'Cash' | 'Card' | 'Bank Transfer' | 'Installment' | 'Mixed';

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customer: string;
  customerType: 'individual' | 'corporate';
  products: string;
  qty: number;
  totalUZS: number;
  paidUZS: number;
  balanceUZS: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  branch: string;
  date: string;
  dueDate: string;
  manager: string;
}

export interface SalesOrdersTableRef {
  exportExcel: () => void;
  exportPDF: () => Promise<void>;
  openNewOrder: () => void;
}

const initialOrders: SalesOrder[] = [];

const statusOptions = [
  { key: 'filter-all', value: 'all', label: 'All Status' },
  { key: 'filter-paid', value: 'paid', label: 'Paid' },
  { key: 'filter-partial', value: 'partial', label: 'Partial' },
  { key: 'filter-invoiced', value: 'invoiced', label: 'Invoiced' },
  { key: 'filter-confirmed', value: 'confirmed', label: 'Confirmed' },
  { key: 'filter-overdue', value: 'overdue', label: 'Overdue' },
  { key: 'filter-cancelled', value: 'cancelled', label: 'Cancelled' },
  { key: 'filter-draft', value: 'draft', label: 'Draft' },
];

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

const EXPORT_HEADERS = ['Order #', 'Customer', 'Type', 'Products', 'Qty', 'Total (UZS)', 'Paid (UZS)', 'Balance (UZS)', 'Status', 'Payment', 'Branch', 'Date', 'Due Date', 'Manager'];

// Parse dd.mm.yyyy date strings for date range filtering
function parseDMY(dateStr: string): Date | null {
  const parts = dateStr.split('.');
  if (parts.length !== 3) return null;
  return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
}

const SalesOrdersTable = forwardRef<SalesOrdersTableRef>((_, ref) => {
  const [orders, setOrders] = useState<SalesOrder[]>(initialOrders);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortCol, setSortCol] = useState<keyof SalesOrder>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [paymentModalOrder, setPaymentModalOrder] = useState<SalesOrder | null>(null);
  const [detailModalOrder, setDetailModalOrder] = useState<SalesOrder | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editOrder, setEditOrder] = useState<SalesOrder | null | undefined>(undefined); // undefined = closed, null = new, SalesOrder = edit
  const [showColMenu, setShowColMenu] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    orderNumber: true,
    customer: true,
    products: true,
    qty: true,
    totalUZS: true,
    paidUZS: true,
    balanceUZS: true,
    status: true,
    paymentMethod: true,
    branch: true,
    date: true,
    manager: true,
  });

  // Filter
  const filtered = useMemo(() => {
    let data = [...orders];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (o) =>
          o.customer.toLowerCase().includes(q) ||
          o.orderNumber.toLowerCase().includes(q) ||
          o.products.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') data = data.filter((o) => o.status === statusFilter);
    if (branchFilter !== 'all') data = data.filter((o) => o.branch === branchFilter);
    if (paymentFilter !== 'all') data = data.filter((o) => o.paymentMethod === paymentFilter);

    // Date range filter
    if (dateFrom || dateTo) {
      data = data.filter((o) => {
        const d = parseDMY(o.date);
        if (!d) return true;
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
        return true;
      });
    }

    // Sort
    data.sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

    return data;
  }, [orders, search, statusFilter, branchFilter, paymentFilter, dateFrom, dateTo, sortCol, sortDir]);

  const buildExportRows = () =>
    filtered.map((o) => [
      o.orderNumber,
      o.customer,
      o.customerType,
      o.products,
      o.qty,
      o.totalUZS.toLocaleString('ru-RU'),
      o.paidUZS === 0 ? '0' : o.paidUZS.toLocaleString('ru-RU'),
      o.balanceUZS === 0 ? '0' : o.balanceUZS.toLocaleString('ru-RU'),
      o.status,
      o.paymentMethod,
      o.branch,
      o.date,
      o.dueDate,
      o.manager,
    ]);

  useImperativeHandle(ref, () => ({
    exportExcel: () => {
      const period = dateFrom || dateTo ? `${dateFrom || 'start'}_to_${dateTo || 'now'}` : 'all';
      exportToCSV(`sales-orders-${period}`, EXPORT_HEADERS, [], buildExportRows());
    },
    exportPDF: async () => {
      const period = dateFrom || dateTo ? `${dateFrom || 'start'} to ${dateTo || 'now'}` : 'All time';
      const totalRevenue = filtered.reduce((s, o) => s + o.totalUZS, 0);
      const totalPaid = filtered.reduce((s, o) => s + o.paidUZS, 0);
      await exportToPDF({
        title: 'Sales Orders Report',
        subtitle: `Filtered: ${filtered.length} orders | Status: ${statusFilter} | Branch: ${branchFilter === 'all' ? 'All' : branchFilter}`,
        period,
        headers: EXPORT_HEADERS,
        rows: buildExportRows(),
        filename: `sales-orders-${period.replace(/ /g, '-')}`,
        summaryRows: [
          { label: 'Total Orders', value: String(filtered.length) },
          { label: 'Total Revenue', value: totalRevenue.toLocaleString('ru-RU') + ' UZS' },
          { label: 'Total Paid', value: totalPaid.toLocaleString('ru-RU') + ' UZS' },
          { label: 'Outstanding', value: (totalRevenue - totalPaid).toLocaleString('ru-RU') + ' UZS' },
        ],
      });
    },
    openNewOrder: () => setEditOrder(null),
  }));

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (col: keyof SalesOrder) => {
    if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginated.length) setSelectedIds([]);
    else setSelectedIds(paginated.map((o) => o.id));
  };

  const handleBulkDelete = () => {
    setOrders((prev) => prev.filter((o) => !selectedIds.includes(o.id)));
    toast.success(`${selectedIds.length} ta buyurtma o'chirildi`);
    setSelectedIds([]);
  };

  const handleDeleteConfirm = () => {
    const id = deleteConfirmId;
    setOrders((prev) => prev.filter((o) => o.id !== id));
    toast.success(`Buyurtma ${id} bekor qilindi`);
    setDeleteConfirmId(null);
  };

  const handleSaveOrder = (saved: SalesOrder) => {
    const isNew = !orders.find((o) => o.id === saved.id);
    if (isNew) {
      setOrders((prev) => [saved, ...prev]);
      toast.success(`Buyurtma ${saved.orderNumber} muvaffaqiyatli qo'shildi`);
    } else {
      setOrders((prev) => prev.map((o) => (o.id === saved.id ? saved : o)));
      toast.success(`Buyurtma ${saved.orderNumber} yangilandi`);
    }
    setEditOrder(undefined);
  };

  const formatUZS = (v: number) =>
    v === 0 ? '—' : v.toLocaleString('ru-RU') + ' UZS';

  const SortIcon = ({ col }: { col: keyof SalesOrder }) => (
    <span className="ml-1 inline-flex flex-col" style={{ fontSize: '8px', lineHeight: 1 }}>
      <span style={{ opacity: sortCol === col && sortDir === 'asc' ? 1 : 0.3 }}>▲</span>
      <span style={{ opacity: sortCol === col && sortDir === 'desc' ? 1 : 0.3 }}>▼</span>
    </span>
  );

  const colDefs: { key: keyof SalesOrder; label: string }[] = [
    { key: 'orderNumber', label: 'Order #' },
    { key: 'customer', label: 'Customer' },
    { key: 'products', label: 'Products' },
    { key: 'qty', label: 'Qty' },
    { key: 'totalUZS', label: 'Total' },
    { key: 'paidUZS', label: 'Paid' },
    { key: 'balanceUZS', label: 'Balance' },
    { key: 'status', label: 'Status' },
    { key: 'paymentMethod', label: 'Payment' },
    { key: 'branch', label: 'Branch' },
    { key: 'date', label: 'Date' },
    { key: 'manager', label: 'Manager' },
  ];

  return (
    <>
      {/* Stats bar — computed from live orders */}
      <SalesStatsBar orders={orders} />

      {/* Filter toolbar */}
      <SalesFilterToolbar
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        branchFilter={branchFilter}
        setBranchFilter={setBranchFilter}
        paymentFilter={paymentFilter}
        setPaymentFilter={setPaymentFilter}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        statusOptions={statusOptions}
        resultCount={filtered.length}
        showColMenu={showColMenu}
        setShowColMenu={setShowColMenu}
        visibleCols={visibleCols}
        setVisibleCols={setVisibleCols}
        colDefs={colDefs}
      />

      {/* Table card */}
      <div className="card-base card-glow overflow-hidden p-0">
        {/* Bulk action bar */}
        {selectedIds.length > 0 && (
          <div
            className="flex items-center justify-between px-5 py-3 border-b animate-slide-up"
            style={{ background: 'rgba(14, 165, 233, 0.07)', borderColor: 'rgba(14, 165, 233, 0.2)' }}
          >
            <span className="text-sm font-medium text-primary">
              {selectedIds.length} ta buyurtma tanlandi
            </span>
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary text-xs gap-1.5"
                onClick={() => { toast.success('Ommaviy hisob-faktura PDF yaratilmoqda...'); }}
              >
                <Icon name="DocumentTextIcon" size={13} />
                Print Invoices
              </button>
              <button
                className="btn-secondary text-xs gap-1.5"
                onClick={() => { toast.info('Tanlangan buyurtmalar eksport qilinmoqda...'); }}
              >
                <Icon name="ArrowDownTrayIcon" size={13} />
                Export
              </button>
              <button
                className="btn-danger text-xs gap-1.5"
                onClick={handleBulkDelete}
              >
                <Icon name="TrashIcon" size={13} />
                O'chirish
              </button>
              <button
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setSelectedIds([])}
              >
                Bekor qilish
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm" style={{ minWidth: '1100px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === paginated.length && paginated.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: 'var(--primary)' }}
                  />
                </th>
                {colDefs.map((col) =>
                  visibleCols[col.key] ? (
                    <th
                      key={`th-${col.key}`}
                      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors"
                      onClick={() => toggleSort(col.key)}
                    >
                      {col.label}
                      <SortIcon col={col.key} />
                    </th>
                  ) : null
                )}
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={colDefs.filter((c) => visibleCols[c.key]).length + 2} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ background: 'var(--muted)' }}
                      >
                        <Icon name="ShoppingCartIcon" size={22} className="text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Buyurtmalar topilmadi</p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Joriy filtrlarga mos buyurtmalar yo'q. Qidiruv yoki holat filtrini o'zgartiring.
                      </p>
                      <button
                        className="btn-primary text-xs mt-1"
                        onClick={() => { setSearch(''); setStatusFilter('all'); setBranchFilter('all'); setPaymentFilter('all'); setDateFrom(''); setDateTo(''); }}
                      >
                        Barcha filtrlarni tozalash
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((order, idx) => (
                  <tr
                    key={order.id}
                    className={`
                      group transition-colors duration-100 hover:bg-secondary/50 cursor-pointer
                      ${selectedIds.includes(order.id) ? 'bg-primary/5' : ''}
                    `}
                    style={{ borderBottom: idx < paginated.length - 1 ? '1px solid var(--border)' : 'none' }}
                    onClick={() => setDetailModalOrder(order)}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: 'var(--primary)' }}
                      />
                    </td>

                    {/* Order number */}
                    {visibleCols.orderNumber && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-semibold text-primary font-tabular">{order.orderNumber}</span>
                      </td>
                    )}

                    {/* Customer */}
                    {visibleCols.customer && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{
                              background: order.customerType === 'corporate' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(14, 165, 233, 0.15)',
                              color: order.customerType === 'corporate' ? 'var(--accent)' : 'var(--primary)',
                            }}
                          >
                            {order.customer[0]}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-foreground whitespace-nowrap">{order.customer}</p>
                            <p className="text-xs text-muted-foreground capitalize">{order.customerType}</p>
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Products */}
                    {visibleCols.products && (
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="text-xs text-muted-foreground truncate block">{order.products}</span>
                      </td>
                    )}

                    {/* Qty */}
                    {visibleCols.qty && (
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-medium text-foreground font-tabular">{order.qty}</span>
                      </td>
                    )}

                    {/* Total */}
                    {visibleCols.totalUZS && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-semibold text-foreground font-tabular">
                          {order.totalUZS.toLocaleString('ru-RU')}
                        </span>
                      </td>
                    )}

                    {/* Paid */}
                    {visibleCols.paidUZS && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs font-medium font-tabular ${order.paidUZS === order.totalUZS ? 'text-success' : order.paidUZS > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                          {order.paidUZS === 0 ? '—' : order.paidUZS.toLocaleString('ru-RU')}
                        </span>
                      </td>
                    )}

                    {/* Balance */}
                    {visibleCols.balanceUZS && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs font-medium font-tabular ${order.balanceUZS > 0 ? 'text-danger' : 'text-muted-foreground'}`}>
                          {order.balanceUZS === 0 ? '—' : order.balanceUZS.toLocaleString('ru-RU')}
                        </span>
                      </td>
                    )}

                    {/* Status */}
                    {visibleCols.status && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <StatusBadge variant={order.status} size="sm" />
                      </td>
                    )}

                    {/* Payment method */}
                    {visibleCols.paymentMethod && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-muted-foreground">{order.paymentMethod}</span>
                      </td>
                    )}

                    {/* Branch */}
                    {visibleCols.branch && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-muted-foreground">{order.branch}</span>
                      </td>
                    )}

                    {/* Date */}
                    {visibleCols.date && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="text-xs text-foreground">{order.date}</p>
                          {order.status === 'overdue' && (
                            <p className="text-xs text-danger">Due: {order.dueDate}</p>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Manager */}
                    {visibleCols.manager && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-muted-foreground">{order.manager}</span>
                      </td>
                    )}

                    {/* Row actions */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        {/* View detail */}
                        <div className="relative group/tooltip">
                          <button
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150"
                            onClick={() => setDetailModalOrder(order)}
                          >
                            <Icon name="EyeIcon" size={14} />
                          </button>
                          <div
                            className="absolute bottom-full mb-1 right-0 px-2 py-1 rounded text-xs whitespace-nowrap z-10 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150"
                            style={{ background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                          >
                            Ko'rish
                          </div>
                        </div>

                        {/* Record payment */}
                        {(order.status === 'partial' || order.status === 'invoiced' || order.status === 'overdue' || order.status === 'confirmed') && (
                          <div className="relative group/tooltip">
                            <button
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-success transition-all duration-150"
                              onClick={() => setPaymentModalOrder(order)}
                            >
                              <Icon name="BanknotesIcon" size={14} />
                            </button>
                            <div
                              className="absolute bottom-full mb-1 right-0 px-2 py-1 rounded text-xs whitespace-nowrap z-10 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150"
                              style={{ background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                            >
                              To'lov qilish
                            </div>
                          </div>
                        )}

                        {/* Print invoice */}
                        <div className="relative group/tooltip">
                          <button
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-primary transition-all duration-150"
                            onClick={() => toast.info(`${order.orderNumber} uchun hisob-faktura yaratilmoqda...`)}
                          >
                            <Icon name="DocumentTextIcon" size={14} />
                          </button>
                          <div
                            className="absolute bottom-full mb-1 right-0 px-2 py-1 rounded text-xs whitespace-nowrap z-10 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150"
                            style={{ background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                          >
                            Hisob-faktura
                          </div>
                        </div>

                        {/* Edit */}
                        <div className="relative group/tooltip">
                          <button
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150"
                            onClick={() => setEditOrder(order)}
                          >
                            <Icon name="PencilSquareIcon" size={14} />
                          </button>
                          <div
                            className="absolute bottom-full mb-1 right-0 px-2 py-1 rounded text-xs whitespace-nowrap z-10 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150"
                            style={{ background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                          >
                            Tahrirlash
                          </div>
                        </div>

                        {/* Cancel/delete */}
                        {order.status !== 'paid' && order.status !== 'cancelled' && (
                          <div className="relative group/tooltip">
                            <button
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-danger transition-all duration-150"
                              onClick={() => setDeleteConfirmId(order.id)}
                            >
                              <Icon name="XCircleIcon" size={14} />
                            </button>
                            <div
                              className="absolute bottom-full mb-1 right-0 px-2 py-1 rounded text-xs whitespace-nowrap z-10 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150"
                              style={{ background: 'var(--secondary)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                            >
                              Bekor qilish
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          className="flex items-center justify-between px-5 py-3 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {Math.min((page - 1) * perPage + 1, filtered.length)}–{Math.min(page * perPage, filtered.length)} / {filtered.length} ta buyurtma
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Sahifada:</span>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                className="input-field py-1 px-2 text-xs w-16"
              >
                {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                  <option key={`pp-${n}`} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            >
              <Icon name="ChevronLeftIcon" size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={`page-${pageNum}`}
                  onClick={() => setPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-all duration-150 ${
                    page === pageNum
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            >
              <Icon name="ChevronRightIcon" size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {paymentModalOrder && (
        <RecordPaymentModal
          order={paymentModalOrder}
          onClose={() => setPaymentModalOrder(null)}
        />
      )}

      {/* Order Detail Modal */}
      {detailModalOrder && (
        <OrderDetailModal
          order={detailModalOrder}
          onClose={() => setDetailModalOrder(null)}
          onRecordPayment={(o) => { setDetailModalOrder(null); setPaymentModalOrder(o); }}
        />
      )}

      {/* Add / Edit Order Modal */}
      {editOrder !== undefined && (
        <AddEditOrderModal
          order={editOrder}
          onClose={() => setEditOrder(undefined)}
          onSave={handleSaveOrder}
        />
      )}

      {/* Cancel confirm modal */}
      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Buyurtmani bekor qilish"
        subtitle="Bu amalni qaytarib bo'lmaydi"
        size="sm"
        footer={
          <>
            <button className="btn-secondary text-sm" onClick={() => setDeleteConfirmId(null)}>
              Saqlab qolish
            </button>
            <button className="btn-danger text-sm gap-2" onClick={handleDeleteConfirm}>
              <Icon name="XCircleIcon" size={14} />
              O'chirish
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(239, 68, 68, 0.12)' }}
          >
            <Icon name="ExclamationTriangleIcon" size={20} className="text-danger" />
          </div>
          <div>
            <p className="text-sm text-foreground font-medium mb-1">
              {deleteConfirmId} buyurtmasini o'chirmoqchimisiz?
            </p>
            <p className="text-sm text-muted-foreground">
              Buyurtma ro'yxatdan o'chiriladi. Audit maqsadida to'lov ma'lumotlari tizimda saqlanib qoladi.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
});

SalesOrdersTable.displayName = 'SalesOrdersTable';

export default SalesOrdersTable;
