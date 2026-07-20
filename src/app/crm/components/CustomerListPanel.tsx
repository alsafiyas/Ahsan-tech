'use client';

import React from 'react';
import { Customer } from '../page';

interface CustomerListPanelProps {
  customers: Customer[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeType: 'all' | 'physical' | 'legal';
  onTypeChange: (t: 'all' | 'physical' | 'legal') => void;
}

const statusColors: Record<string, string> = {
  vip: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  inactive: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
};

export default function CustomerListPanel({
  customers, loading, selectedId, onSelect, searchQuery, onSearchChange, activeType, onTypeChange,
}: CustomerListPanelProps) {
  const filtered = customers.filter((c) => {
    const matchType = activeType === 'all' || c.type === activeType;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.company?.toLowerCase().includes(q) ?? false) ||
      (c.email?.toLowerCase().includes(q) ?? false);
    return matchType && matchSearch;
  });

  return (
    <div
      className="flex flex-col h-full rounded-xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {/* Search */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg text-sm bg-secondary text-foreground placeholder-muted-foreground border-0 outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Type filter */}
      <div className="flex gap-1 p-2 border-b" style={{ borderColor: 'var(--border)' }}>
        {(['all', 'physical', 'legal'] as const).map((t) => (
          <button
            key={t}
            onClick={() => onTypeChange(t)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
              activeType === t
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {t === 'all' ? 'All' : t === 'physical' ? 'Physical' : 'Legal'}
          </button>
        ))}
      </div>

      {/* Count */}
      <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
        <p className="text-xs text-muted-foreground">
          {loading ? 'Loading...' : `${filtered.length} customers`}
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="space-y-1 p-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-lg p-3 animate-pulse" style={{ background: 'var(--secondary)' }}>
                <div className="flex gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-border flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-border rounded w-2/3" />
                    <div className="h-2.5 bg-border rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <p className="text-sm text-muted-foreground">No customers found</p>
          </div>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`w-full text-left px-3 py-3 border-b transition-all duration-150 ${
                selectedId === c.id
                  ? 'bg-primary/10 border-l-2 border-l-primary' :'hover:bg-secondary/60'
              }`}
              style={{ borderBottomColor: 'var(--border)' }}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    background: c.type === 'legal' ? 'rgba(99,102,241,0.15)' : 'rgba(20,184,166,0.15)',
                    color: c.type === 'legal' ? '#818cf8' : '#2dd4bf',
                  }}
                >
                  {c.type === 'legal' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                    </svg>
                  ) : (
                    c.name.charAt(0)
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                    <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full border font-medium ${statusColors[c.status]}`}>
                      {c.status === 'vip' ? 'VIP' : c.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {c.company && (
                    <p className="text-xs text-muted-foreground truncate">{c.company}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">{c.phone}</p>
                  {c.totalDebt > 0 && (
                    <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--danger)' }}>
                      Debt: {c.totalDebt.toLocaleString()} UZS
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
