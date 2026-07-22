'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';

interface AddCustomerModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddCustomerModal({ open, onClose, onSaved }: AddCustomerModalProps) {
  const supabase = createClient();
  const [type, setType] = useState<'physical' | 'legal'>('physical');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    company: '',
    phone: '',
    telegram: '',
    email: '',
    address: '',
    district: '',
    city: 'Toshkent',
    status: 'active' as 'active' | 'inactive' | 'vip',
    notes: '',
  });

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Name and phone are required.');
      return;
    }
    setSaving(true);
    setError('');

    const { error: err } = await supabase.from('customers').insert({
      type,
      name: form.name.trim(),
      company: form.company.trim() || null,
      phone: form.phone.trim(),
      telegram: form.telegram.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim(),
      district: form.district.trim() || null,
      city: form.city.trim() || 'Toshkent',
      status: form.status,
      notes: form.notes.trim() || null,
      total_debt: 0,
      last_activity: new Date().toISOString().split('T')[0],
    });

    setSaving(false);
    if (err) { setError(err.message); return; }

    onSaved();
    onClose();
    setForm({ name: '', company: '', phone: '', telegram: '', email: '', address: '', district: '', city: 'Toshkent', status: 'active', notes: '' });
    setType('physical');
  };

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm bg-secondary text-foreground placeholder-muted-foreground border border-border outline-none focus:ring-1 focus:ring-primary/40';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add New Customer"
      subtitle="Fill in the customer details below"
      size="lg"
      footer={
        <>
          <button className="btn-secondary text-sm" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary text-sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Customer'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
        )}

        {/* Type selector */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">Customer Type</label>
          <div className="flex gap-3">
            {(['physical', 'legal'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all duration-150 ${
                  type === t
                    ? 'border-primary bg-primary/10 text-primary' :'border-border text-muted-foreground hover:bg-secondary'
                }`}
              >
                {t === 'physical' ? '👤 Individual (Physical)' : '🏢 Company (Legal)'}
              </button>
            ))}
          </div>
        </div>

        {/* Name fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              {type === 'physical' ? 'Full Name *' : 'Contact Person *'}
            </label>
            <input type="text" placeholder={type === 'physical' ? 'Akbar Yusupov' : 'Sardor Mirzayev'} className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          {type === 'legal' && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Company Name</label>
              <input type="text" placeholder="Mirzayev Security LLC" className={inputCls} value={form.company} onChange={(e) => set('company', e.target.value)} />
            </div>
          )}
          {type === 'physical' && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
              <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="vip">VIP</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
        </div>

        {/* Contact info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Phone *</label>
            <input type="tel" placeholder="+998 90 123 45 67" className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Telegram</label>
            <input type="text" placeholder="@username" className={inputCls} value={form.telegram} onChange={(e) => set('telegram', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
            <input type="email" placeholder="customer@example.com" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          {type === 'legal' && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
              <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="vip">VIP</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Address</label>
          <input type="text" placeholder="Chilonzor tumani, 9-mavze, 12-uy" className={inputCls} value={form.address} onChange={(e) => set('address', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">District</label>
            <input type="text" placeholder="Chilonzor" className={inputCls} value={form.district} onChange={(e) => set('district', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">City</label>
            <input type="text" placeholder="Toshkent" className={inputCls} value={form.city} onChange={(e) => set('city', e.target.value)} />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Notes</label>
          <textarea rows={3} placeholder="Additional notes about this customer..." className={`${inputCls} resize-none`} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
