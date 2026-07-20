'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import StatusBadge from '@/components/ui/StatusBadge';
import { useLanguage } from '@/context/LanguageContext';
import { createClient } from '@/lib/supabase/client';

type POStatus = 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';
type POPaymentStatus = 'unpaid' | 'partial' | 'paid';

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string | null;
  supplier_name: string;
  order_date: string;
  expected_date: string | null;
  total_uzs: number;
  po_status: POStatus;
  payment_status: POPaymentStatus;
  notes: string;
  created_at: string;
}

interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  country: string;
  is_active: boolean;
}

interface POFormData {
  supplier_id: string;
  supplier_name: string;
  expected_date: string;
  total_uzs: string;
  notes: string;
  po_status: POStatus;
  payment_status: POPaymentStatus;
}

const statusConfig: Record<POStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'var(--muted-foreground)' },
  sent: { label: 'Sent', color: 'var(--primary)' },
  partial: { label: 'Partial', color: 'var(--warning)' },
  received: { label: 'Received', color: 'var(--success)' },
  cancelled: { label: 'Cancelled', color: 'var(--danger)' },
};

const formatUZS = (n: number) => new Intl.NumberFormat('uz-UZ').format(n) + ' UZS';

const emptyForm = (): POFormData => ({
  supplier_id: '', supplier_name: '', expected_date: '', total_uzs: '0',
  notes: '', po_status: 'draft', payment_status: 'unpaid',
});

export default function PurchasingPage() {
  const { t } = useLanguage();
  const supabase = createClient();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers'>('orders');
  const [showNewPO, setShowNewPO] = useState(false);
  const [formData, setFormData] = useState<POFormData>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, suppliersRes] = await Promise.all([
        supabase.from('purchase_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('suppliers').select('*').order('name', { ascending: true }),
      ]);
      if (ordersRes.error) throw ordersRes.error;
      if (suppliersRes.error) throw suppliersRes.error;
      setOrders((ordersRes.data as PurchaseOrder[]) || []);
      setSuppliers((suppliersRes.data as Supplier[]) || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalSpend = orders.filter((p) => p.po_status !== 'cancelled').reduce((sum, p) => sum + p.total_uzs, 0);
  const pendingOrders = orders.filter((p) => ['sent', 'partial'].includes(p.po_status)).length;

  const handleSubmit = async () => {
    if (!formData.supplier_name.trim()) {
      setFormError('Supplier is required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const poNumber = 'PO-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4);
      const { error: err } = await supabase.from('purchase_orders').insert({
        po_number: poNumber,
        supplier_id: formData.supplier_id || null,
        supplier_name: formData.supplier_name,
        expected_date: formData.expected_date || null,
        total_uzs: parseInt(formData.total_uzs, 10) || 0,
        po_status: formData.po_status,
        payment_status: formData.payment_status,
        notes: formData.notes.trim(),
      });
      if (err) throw err;
      setShowNewPO(false);
      setFormData(emptyForm());
      fetchData();
    } catch (e: any) {
      setFormError(e?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t.purchasing_title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t.purchasing_subtitle}</p>
          </div>
          <button onClick={() => { setFormData(emptyForm()); setFormError(null); setShowNewPO(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <AppIcon name="PlusIcon" size={16} />
            {t.purchasing_add_order}
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg text-sm flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>
            <AppIcon name="ExclamationCircleIcon" size={16} />
            {error}
            <button onClick={() => setError(null)} className="ml-auto"><AppIcon name="XMarkIcon" size={14} /></button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t.purchasing_total_orders, value: orders.length, icon: 'DocumentTextIcon', color: 'var(--primary)' },
            { label: t.purchasing_pending_orders, value: pendingOrders, icon: 'ClockIcon', color: 'var(--warning)' },
            { label: t.purchasing_suppliers, value: suppliers.length, icon: 'TruckIcon', color: 'var(--success)' },
            { label: t.purchasing_total_value, value: formatUZS(totalSpend), icon: 'BanknotesIcon', color: 'var(--muted-foreground)', small: true },
          ].map((s) => (
            <div key={s.label} className="card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}20` }}>
                <AppIcon name={s.icon as any} size={20} style={{ color: s.color }} />
              </div>
              <div>
                <p className={`font-bold text-foreground ${(s as any).small ? 'text-sm' : 'text-2xl'}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--secondary)' }}>
          {[{ key: 'orders', label: 'Purchase Orders' }, { key: 'suppliers', label: 'Suppliers' }].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`px-4 py-2 rounded text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="card p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">Loading...</p>
          </div>
        ) : (
          <>
            {/* Purchase Orders */}
            {activeTab === 'orders' && (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                        {['PO Number', 'Supplier', 'Date', 'Expected', 'Total', 'Status', 'Payment'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((po) => (
                        <tr key={po.id} className="border-b hover:bg-secondary/30 transition-colors cursor-pointer" style={{ borderColor: 'var(--border)' }}>
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{po.po_number}</td>
                          <td className="px-4 py-3 text-xs font-medium text-foreground">{po.supplier_name}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{po.order_date}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{po.expected_date || '—'}</td>
                          <td className="px-4 py-3 text-xs font-bold text-foreground">{formatUZS(po.total_uzs)}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${statusConfig[po.po_status].color}20`, color: statusConfig[po.po_status].color }}>
                              {statusConfig[po.po_status].label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge
                              status={po.payment_status === 'paid' ? 'active' : po.payment_status === 'partial' ? 'pending' : 'inactive'}
                              label={po.payment_status === 'paid' ? 'Paid' : po.payment_status === 'partial' ? 'Partial' : 'Unpaid'}
                            />
                          </td>
                        </tr>
                      ))}
                      {orders.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No purchase orders found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Suppliers */}
            {activeTab === 'suppliers' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suppliers.map((sup) => (
                  <div key={sup.id} className="card p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{sup.name}</p>
                        <p className="text-xs text-muted-foreground">{sup.country}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sup.is_active ? 'bg-success/15 text-success' : 'bg-secondary text-muted-foreground'}`}>
                        {sup.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><p className="text-muted-foreground">Contact</p><p className="font-medium text-foreground">{sup.contact_person || '—'}</p></div>
                      <div><p className="text-muted-foreground">Phone</p><p className="font-medium text-foreground">{sup.phone || '—'}</p></div>
                      <div className="col-span-2"><p className="text-muted-foreground">Email</p><p className="font-medium text-foreground">{sup.email || '—'}</p></div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button className="btn-primary text-xs flex-1">New PO</button>
                    </div>
                  </div>
                ))}
                {suppliers.length === 0 && (
                  <div className="col-span-2 card p-10 text-center text-sm text-muted-foreground">No suppliers found</div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* New PO Modal */}
      {showNewPO && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowNewPO(false)}>
          <div className="card w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">New Purchase Order</h2>
              <button onClick={() => setShowNewPO(false)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground"><AppIcon name="XMarkIcon" size={18} /></button>
            </div>
            {formError && (
              <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>{formError}</div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Supplier *</label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => {
                    const sup = suppliers.find((s) => s.id === e.target.value);
                    setFormData((p) => ({ ...p, supplier_id: e.target.value, supplier_name: sup?.name || '' }));
                  }}
                  className="input w-full text-sm"
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-muted-foreground mb-1">Expected Delivery</label><input type="date" value={formData.expected_date} onChange={(e) => setFormData((p) => ({ ...p, expected_date: e.target.value }))} className="input w-full text-sm" /></div>
                <div><label className="block text-xs text-muted-foreground mb-1">Total (UZS)</label><input type="number" placeholder="0" value={formData.total_uzs} onChange={(e) => setFormData((p) => ({ ...p, total_uzs: e.target.value }))} className="input w-full text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-muted-foreground mb-1">Status</label>
                  <select value={formData.po_status} onChange={(e) => setFormData((p) => ({ ...p, po_status: e.target.value as POStatus }))} className="input w-full text-sm">
                    {(Object.keys(statusConfig) as POStatus[]).map((s) => <option key={s} value={s}>{statusConfig[s].label}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs text-muted-foreground mb-1">Payment</label>
                  <select value={formData.payment_status} onChange={(e) => setFormData((p) => ({ ...p, payment_status: e.target.value as POPaymentStatus }))} className="input w-full text-sm">
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-xs text-muted-foreground mb-1">Notes</label><textarea rows={3} className="input w-full text-sm resize-none" placeholder="Order notes..." value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowNewPO(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Create PO
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
