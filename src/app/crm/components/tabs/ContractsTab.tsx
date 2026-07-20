'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import NewContractModal from '../NewContractModal';

interface ContractsTabProps {
  customerId: string;
  onContractAdded: () => void;
  openNewContract?: boolean;
}

interface Contract {
  id: string;
  number: string;
  type: string;
  start_date: string;
  end_date: string;
  amount: number;
  status: 'active' | 'expired' | 'pending' | 'cancelled';
  object: string;
  notes?: string;
}

const statusStyle: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400',
  expired: 'bg-zinc-500/15 text-zinc-400',
  pending: 'bg-amber-500/15 text-amber-400',
  cancelled: 'bg-red-500/15 text-red-400',
};

export default function ContractsTab({ customerId, onContractAdded, openNewContract }: ContractsTabProps) {
  const supabase = createClient();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContractOpen, setNewContractOpen] = useState(false);

  const fetchContracts = useCallback(async () => {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setContracts(data as Contract[]);
    }
    setLoading(false);
  }, [customerId, supabase]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleContractSaved = () => {
    fetchContracts();
    onContractAdded();
  };

  const total = contracts.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Contracts ({loading ? '...' : contracts.length})
          </h3>
          {!loading && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Total value: {total.toLocaleString()} UZS
            </p>
          )}
        </div>
        <button className="btn-primary text-xs gap-1.5" onClick={() => setNewContractOpen(true)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Contract
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}>
              <div className="h-4 bg-border rounded w-1/3 mb-2" />
              <div className="h-3 bg-border rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: 'var(--secondary)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">No contracts yet</p>
          <p className="text-xs text-muted-foreground mt-1">Click "New Contract" to create one</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => (
            <div
              key={c.id}
              className="rounded-xl p-4"
              style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(20,184,166,0.12)' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{c.number}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[c.status]}`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.type} · {c.object}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {c.start_date} → {c.end_date}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {c.amount.toLocaleString()} UZS
                      </span>
                    </div>
                    {c.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{c.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button className="btn-secondary text-xs">View PDF</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <NewContractModal
        open={newContractOpen}
        customerId={customerId}
        onClose={() => setNewContractOpen(false)}
        onSaved={handleContractSaved}
      />
    </div>
  );
}
