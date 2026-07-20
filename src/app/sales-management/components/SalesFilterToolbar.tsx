'use client';

import React from 'react';
import Icon from '@/components/ui/AppIcon';

interface ColDef {
  key: string;
  label: string;
}

interface SalesFilterToolbarProps {
  search: string;
  setSearch: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  branchFilter: string;
  setBranchFilter: (v: string) => void;
  paymentFilter: string;
  setPaymentFilter: (v: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  statusOptions: { key: string; value: string; label: string }[];
  resultCount: number;
  showColMenu: boolean;
  setShowColMenu: (v: boolean) => void;
  visibleCols: Record<string, boolean>;
  setVisibleCols: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  colDefs: ColDef[];
}

const branches = [
  { key: 'br-all', value: 'all', label: 'All Branches' },
  { key: 'br-tashkent', value: 'Tashkent', label: 'Tashkent HQ' },
  { key: 'br-samarkand', value: 'Samarkand', label: 'Samarkand' },
  { key: 'br-namangan', value: 'Namangan', label: 'Namangan' },
  { key: 'br-andijan', value: 'Andijan', label: 'Andijan' },
];

const paymentMethods = [
  { key: 'pm-all', value: 'all', label: 'All Methods' },
  { key: 'pm-cash', value: 'Cash', label: 'Cash' },
  { key: 'pm-card', value: 'Card', label: 'Card' },
  { key: 'pm-bank', value: 'Bank Transfer', label: 'Bank Transfer' },
  { key: 'pm-install', value: 'Installment', label: 'Installment' },
  { key: 'pm-mixed', value: 'Mixed', label: 'Mixed' },
];

export default function SalesFilterToolbar({
  search, setSearch,
  statusFilter, setStatusFilter,
  branchFilter, setBranchFilter,
  paymentFilter, setPaymentFilter,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  statusOptions,
  resultCount,
  showColMenu, setShowColMenu,
  visibleCols, setVisibleCols,
  colDefs,
}: SalesFilterToolbarProps) {
  const activeFilters = [statusFilter !== 'all', branchFilter !== 'all', paymentFilter !== 'all', !!dateFrom, !!dateTo].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Top row: search + controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Icon name="MagnifyingGlassIcon" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, customer, or product..."
            className="input-field pl-9 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name="XMarkIcon" size={13} />
            </button>
          )}
        </div>

        {/* Branch */}
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="input-field text-sm py-2 w-40"
        >
          {branches.map((b) => (
            <option key={b.key} value={b.value}>{b.label}</option>
          ))}
        </select>

        {/* Payment method */}
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="input-field text-sm py-2 w-44"
        >
          {paymentMethods.map((p) => (
            <option key={p.key} value={p.value}>{p.label}</option>
          ))}
        </select>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input-field text-sm py-2 w-36"
            title="From date"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input-field text-sm py-2 w-36"
            title="To date"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="Clear date range"
            >
              <Icon name="XMarkIcon" size={13} />
            </button>
          )}
        </div>

        {/* Column visibility */}
        <div className="relative ml-auto">
          <button
            onClick={() => setShowColMenu(!showColMenu)}
            className="btn-secondary text-xs gap-2"
          >
            <Icon name="ViewColumnsIcon" size={13} />
            Columns
            {Object.values(visibleCols).filter((v) => !v).length > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', fontSize: '10px' }}
              >
                {Object.values(visibleCols).filter((v) => !v).length}
              </span>
            )}
          </button>
          {showColMenu && (
            <div
              className="absolute right-0 top-full mt-1 w-48 rounded-xl py-2 z-40 shadow-xl"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Toggle Columns
              </p>
              {colDefs.map((col) => (
                <label
                  key={`col-toggle-${col.key}`}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-secondary transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={visibleCols[col.key]}
                    onChange={() =>
                      setVisibleCols({ ...visibleCols, [col.key]: !visibleCols[col.key] })
                    }
                    className="w-3.5 h-3.5 rounded"
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span className="text-xs text-foreground">{col.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Clear filters */}
        {(activeFilters > 0 || search) && (
          <button
            className="text-xs text-danger hover:text-danger/80 transition-colors flex items-center gap-1"
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setBranchFilter('all');
              setPaymentFilter('all');
              setDateFrom('');
              setDateTo('');
            }}
          >
            <Icon name="XMarkIcon" size={12} />
            Clear filters
          </button>
        )}
      </div>

      {/* Status filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {statusOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
              statusFilter === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            style={{
              background: statusFilter === opt.value ? 'var(--primary)' : 'var(--muted)',
              border: statusFilter === opt.value ? 'none' : '1px solid var(--border)',
            }}
          >
            {opt.label}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-2">
          {resultCount} result{resultCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}