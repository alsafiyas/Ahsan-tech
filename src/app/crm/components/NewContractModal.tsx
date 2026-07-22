'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';

interface NewContractModalProps {
  open: boolean;
  customerId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function NewContractModal({ open, customerId, onClose, onSaved }: NewContractModalProps) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [form, setForm] = useState({
    number: '',
    type: 'Installation',
    start_date: today,
    end_date: nextYear,
    amount: '',
    status: 'active' as 'active' | 'expired' | 'pending' | 'cancelled',
    object: '',
    notes: '',
  });

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.number.trim() || !form.object.trim() || !form.amount) {
      setError('Contract number, object, and amount are required.');
      return;
    }
    setSaving(true);
    setError('');

    const { error: err } = await supabase.from('contracts').insert({
      customer_id: customerId,
      number: form.number.trim(),
      type: form.type,
      start_date: form.start_date,
      end_date: form.end_date,
      amount: parseInt(form.amount, 10) || 0,
      status: form.status,
      object: form.object.trim(),
      notes: form.notes.trim() || null,
    });

    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
    onClose();
    setForm({
      number: '',
      type: 'Installation',
      start_date: today,
      end_date: nextYear,
      amount: '',
      status: 'active',
      object: '',
      notes: '',
    });
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm bg-secondary text-foreground placeholder-muted-foreground border border-border outline-none focus:ring-1 focus:ring-primary/40';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Contract"
      subtitle="Create a new contract for this customer"
      size="lg"
      footer={
        <>
          <button className="btn-secondary text-sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary text-sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Create Contract'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Contract Number *</label>
            <input
              type="text"
              placeholder="CTR-2025-001"
              className={inputCls}
              value={form.number}
              onChange={(e) => set('number', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Contract Type</label>
            <select className={inputCls} value={form.type} onChange={(e) => set('type', e.target.value)}>
              <option value="Installation">Installation</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Service">Service</option>
              <option value="Monitoring">Monitoring</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Object / Site *</label>
          <input
            type="text"
            placeholder="Main Office, Warehouse A, etc."
            className={inputCls}
            value={form.object}
            onChange={(e) => set('object', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Start Date</label>
            <input type="date" className={inputCls} value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">End Date</label>
            <input type="date" className={inputCls} value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Amount (UZS) *</label>
            <input
              type="number"
              placeholder="5000000"
              className={inputCls}
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
            <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value as any)}>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Notes</label>
          <textarea
            rows={3}
            placeholder="Additional notes..."
            className={`${inputCls} resize-none`}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
