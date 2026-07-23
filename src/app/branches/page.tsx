'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import StatusBadge from '@/components/ui/StatusBadge';
import { useLanguage } from '@/context/LanguageContext';
import { createClient } from '@/lib/supabase/client';

interface Branch {
  id: string;
  name: string;
  city: string;
  address: string;
  manager: string;
  phone: string;
  employees: number;
  monthlySales: number;
  stockValue: number;
  status: 'active' | 'inactive';
  openedDate: string;
  createdAt: string;
}

const emptyBranch = (): Omit<Branch, 'id' | 'createdAt'> => ({
  name: '', city: '', address: '', manager: '', phone: '',
  employees: 0, monthlySales: 0, stockValue: 0, status: 'active',
  openedDate: new Date().toISOString().split('T')[0],
});

const formatUZS = (n: number) => {
  if (n >= 1000000000) return (n / 1000000000).toFixed(1) + 'B UZS';
  if (n >= 1000000) return (n / 1000000).toFixed(0) + 'M UZS';
  return new Intl.NumberFormat('uz-UZ').format(n) + ' UZS';
};

const mapRow = (r: any): Branch => ({
  id: r.id,
  name: r.name,
  city: r.city,
  address: r.address,
  manager: r.manager,
  phone: r.phone,
  employees: r.employees ?? 0,
  monthlySales: r.monthly_sales ?? 0,
  stockValue: r.stock_value ?? 0,
  status: r.status ?? 'active',
  openedDate: r.opened_date ?? '',
  createdAt: r.created_at ?? '',
});

const toRow = (b: Omit<Branch, 'id' | 'createdAt'>) => ({
  name: b.name,
  city: b.city,
  address: b.address,
  manager: b.manager,
  phone: b.phone,
  employees: b.employees,
  monthly_sales: b.monthlySales,
  stock_value: b.stockValue,
  status: b.status,
  opened_date: b.openedDate,
  updated_at: new Date().toISOString(),
});

export default function BranchesPage() {
  const { t } = useLanguage();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<Omit<Branch, 'id' | 'createdAt'>>(emptyBranch());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Branch | null>(null);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        toast.error('Filiallarni yuklashda xatolik', { description: error.message });
        return;
      }
      if (data) setBranches(data.map(mapRow));
    } catch {
      toast.error('Tarmoq xatoligi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  const totalEmployees = branches.reduce((s, b) => s + b.employees, 0);
  const totalSales = branches.reduce((s, b) => s + b.monthlySales, 0);
  const totalStock = branches.reduce((s, b) => s + b.stockValue, 0);

  const openAdd = () => {
    setFormData(emptyBranch());
    setFormError(null);
    setShowAddBranch(true);
  };

  const openEdit = (branch: Branch) => {
    setFormData({
      name: branch.name, city: branch.city, address: branch.address,
      manager: branch.manager, phone: branch.phone, employees: branch.employees,
      monthlySales: branch.monthlySales, stockValue: branch.stockValue,
      status: branch.status, openedDate: branch.openedDate,
    });
    setFormError(null);
    setEditBranch(branch);
    setSelectedBranch(null);
  };

  const handleSaveAdd = async () => {
    if (!formData.name.trim() || !formData.city.trim()) {
      setFormError('Filial nomi va shahar majburiy');
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('branches').insert(toRow(formData));
      if (error) {
        setFormError('Saqlashda xatolik: ' + error.message);
        return;
      }
      toast.success('Filial qo\'shildi');
      setShowAddBranch(false);
      fetchBranches();
    } catch {
      setFormError('Tarmoq xatoligi');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!formData.name.trim() || !formData.city.trim()) {
      setFormError('Filial nomi va shahar majburiy');
      return;
    }
    if (!editBranch) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('branches').update(toRow(formData)).eq('id', editBranch.id);
      if (error) {
        setFormError('Yangilashda xatolik: ' + error.message);
        return;
      }
      toast.success('Filial yangilandi');
      setEditBranch(null);
      fetchBranches();
    } catch {
      setFormError('Tarmoq xatoligi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (branch: Branch) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from('branches').delete().eq('id', branch.id);
      if (error) {
        toast.error('O\'chirishda xatolik', { description: error.message });
        return;
      }
      toast.success(`"${branch.name}" o'chirildi`);
      setSelectedBranch(null);
      setConfirmDelete(null);
      fetchBranches();
    } catch {
      toast.error('Tarmoq xatoligi');
    }
  };

  const handleToggleStatus = async (branch: Branch) => {
    const newStatus = branch.status === 'active' ? 'inactive' : 'active';
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('branches')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', branch.id);
      if (error) {
        toast.error('Holat o\'zgartirishda xatolik');
        return;
      }
      toast.success(`"${branch.name}" ${newStatus === 'active' ? 'faollashtirildi' : 'to\'xtatildi'}`);
      fetchBranches();
    } catch {
      toast.error('Tarmoq xatoligi');
    }
  };

  const BranchForm = ({ onSave, onCancel, title }: { onSave: () => void; onCancel: () => void; title: string }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button onClick={onCancel} className="p-1.5 rounded hover:bg-secondary text-muted-foreground"><AppIcon name="XMarkIcon" size={18} /></button>
        </div>
        {formError && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded">{formError}</p>}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Filial nomi *</label>
              <input type="text" placeholder="Masalan: Toshkent ofisi" className="input w-full text-sm" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Shahar *</label>
              <input type="text" placeholder="Shahar" className="input w-full text-sm" value={formData.city} onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">To'liq manzil</label>
            <input type="text" placeholder="Ko'cha, uy raqami" className="input w-full text-sm" value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Menejer</label>
              <input type="text" placeholder="Menejer ismi" className="input w-full text-sm" value={formData.manager} onChange={(e) => setFormData((p) => ({ ...p, manager: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Telefon</label>
              <input type="text" placeholder="+998 XX XXX XXXX" className="input w-full text-sm" value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Ochilgan sana</label>
              <input type="date" className="input w-full text-sm" value={formData.openedDate} onChange={(e) => setFormData((p) => ({ ...p, openedDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Holat</label>
              <select className="input w-full text-sm" value={formData.status} onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value as 'active' | 'inactive' }))}>
                <option value="active">Faol</option>
                <option value="inactive">Nofaol</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Xodimlar soni</label>
              <input type="number" min={0} className="input w-full text-sm" value={formData.employees} onChange={(e) => setFormData((p) => ({ ...p, employees: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Oylik savdo (UZS)</label>
              <input type="number" min={0} className="input w-full text-sm" value={formData.monthlySales} onChange={(e) => setFormData((p) => ({ ...p, monthlySales: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Ombor qiymati (UZS)</label>
              <input type="number" min={0} className="input w-full text-sm" value={formData.stockValue} onChange={(e) => setFormData((p) => ({ ...p, stockValue: Number(e.target.value) }))} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onCancel} className="btn-secondary flex-1 text-sm" disabled={saving}>Bekor qilish</button>
          <button onClick={onSave} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2" disabled={saving}>
            {saving && <AppIcon name="ArrowPathIcon" size={14} className="animate-spin" />}
            Saqlash
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t.branches_title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t.branches_subtitle}</p>
          </div>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
            <AppIcon name="PlusIcon" size={16} />
            {t.branches_add}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: t.branches_total_branches, value: branches.length, icon: 'BuildingOfficeIcon', color: 'var(--primary)' },
            { label: t.branches_active, value: branches.filter((b) => b.status === 'active').length, icon: 'CheckCircleIcon', color: 'var(--success)' },
            { label: 'Nofaol', value: branches.filter((b) => b.status === 'inactive').length, icon: 'XCircleIcon', color: 'var(--danger)' },
            { label: t.branches_total_employees, value: totalEmployees, icon: 'UserGroupIcon', color: 'var(--warning)' },
            { label: t.branches_total_revenue, value: formatUZS(totalSales), icon: 'BanknotesIcon', color: '#8b5cf6', small: true },
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

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AppIcon name="ArrowPathIcon" size={28} className="animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
          </div>
        ) : branches.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--primary)10' }}>
              <AppIcon name="BuildingOfficeIcon" size={32} style={{ color: 'var(--primary)' }} />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">Hali filiallar yo'q</p>
              <p className="text-sm text-muted-foreground mt-1">Birinchi filialni qo'shing</p>
            </div>
            <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
              <AppIcon name="PlusIcon" size={16} />
              {t.branches_add}
            </button>
          </div>
        ) : (
          /* Branch cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="card p-5 cursor-pointer hover:border-primary/40 transition-all duration-200 hover:shadow-md"
                onClick={() => setSelectedBranch(branch)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}>
                      <AppIcon name="BuildingOfficeIcon" size={20} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{branch.name}</p>
                      <p className="text-xs text-muted-foreground">{branch.city}</p>
                    </div>
                  </div>
                  <StatusBadge status={branch.status === 'active' ? 'active' : 'inactive'} label={branch.status === 'active' ? 'Faol' : 'Nofaol'} />
                </div>

                <div className="space-y-2 text-xs">
                  {branch.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AppIcon name="MapPinIcon" size={12} />
                      <span className="truncate">{branch.address}</span>
                    </div>
                  )}
                  {branch.manager && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AppIcon name="UserIcon" size={12} />
                      <span>Menejer: {branch.manager}</span>
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AppIcon name="PhoneIcon" size={12} />
                      <span>{branch.phone}</span>
                    </div>
                  )}
                  {branch.openedDate && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AppIcon name="CalendarIcon" size={12} />
                      <span>Ochilgan: {branch.openedDate}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t grid grid-cols-3 gap-2" style={{ borderColor: 'var(--border)' }}>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{branch.employees}</p>
                    <p className="text-xs text-muted-foreground">Xodim</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-success">{formatUZS(branch.monthlySales)}</p>
                    <p className="text-xs text-muted-foreground">Savdo/oy</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-primary">{formatUZS(branch.stockValue)}</p>
                    <p className="text-xs text-muted-foreground">Ombor</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t flex gap-2" style={{ borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEdit(branch)} className="flex-1 text-xs py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground flex items-center justify-center gap-1">
                    <AppIcon name="PencilIcon" size={12} /> Tahrirlash
                  </button>
                  <button onClick={() => handleToggleStatus(branch)} className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors flex items-center justify-center gap-1 ${branch.status === 'active' ? 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}`}>
                    {branch.status === 'active' ? (
                      <><AppIcon name="StopIcon" size={12} /> To'xtatish</>
                    ) : (
                      <><AppIcon name="PlayIcon" size={12} /> Yoqish</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedBranch && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedBranch(null)}>
          <div className="card w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}>
                  <AppIcon name="BuildingOfficeIcon" size={20} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{selectedBranch.name}</h2>
                  <p className="text-xs text-muted-foreground">{selectedBranch.city}</p>
                </div>
              </div>
              <button onClick={() => setSelectedBranch(null)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground"><AppIcon name="XMarkIcon" size={18} /></button>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={selectedBranch.status === 'active' ? 'active' : 'inactive'} label={selectedBranch.status === 'active' ? 'Faol' : 'Nofaol'} />
              {selectedBranch.openedDate && (
                <span className="text-xs text-muted-foreground">Ochilgan: {selectedBranch.openedDate}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Manzil', selectedBranch.address, 'col-span-2'],
                ['Menejer', selectedBranch.manager, ''],
                ['Telefon', selectedBranch.phone, ''],
                ['Xodimlar', String(selectedBranch.employees), ''],
                ['Oylik savdo', formatUZS(selectedBranch.monthlySales), ''],
                ['Ombor qiymati', formatUZS(selectedBranch.stockValue), ''],
              ].map(([label, value, cls]) => (
                <div key={label} className={cls}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium text-foreground">{value || '—'}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setConfirmDelete(selectedBranch)} className="btn-secondary flex-1 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center gap-1">
                <AppIcon name="TrashIcon" size={14} /> O'chirish
              </button>
              <button onClick={() => openEdit(selectedBranch)} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1">
                <AppIcon name="PencilIcon" size={14} /> Tahrirlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="card w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-500/15">
                <AppIcon name="ExclamationTriangleIcon" size={20} style={{ color: 'var(--danger)' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Filialni o'chirish</h3>
                <p className="text-xs text-muted-foreground">Bu amal qaytarib bo'lmaydi</p>
              </div>
            </div>
            <p className="text-sm text-foreground">
              <span className="font-semibold">"{confirmDelete.name}"</span> filialini o'chirishni xohlaysizmi?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1 text-sm">Bekor qilish</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 text-sm py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors">
                Ha, o'chirish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add form */}
      {showAddBranch && (
        <BranchForm title="Yangi filial qo'shish" onSave={handleSaveAdd} onCancel={() => setShowAddBranch(false)} />
      )}

      {/* Edit form */}
      {editBranch && (
        <BranchForm title={`Tahrirlash: ${editBranch.name}`} onSave={handleSaveEdit} onCancel={() => setEditBranch(null)} />
      )}
    </AppLayout>
  );
}
