'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import StatusBadge from '@/components/ui/StatusBadge';
import { useLanguage } from '@/context/LanguageContext';
import { createClient } from '@/lib/supabase/client';
import FaceIdModal from './components/FaceIdModal';

interface Employee {
  id: string;
  full_name: string;
  position: string;
  department: string;
  branch: string;
  phone: string;
  address: string;
  email: string;
  is_active: boolean;
  auth_user_id: string | null;
  created_at: string;
}

interface EmployeeFormData {
  full_name: string;
  position: string;
  department: string;
  branch: string;
  phone: string;
  address: string;
  email: string;
  is_active: boolean;
}

interface GeneratedCredentials {
  email: string;
  password: string;
  employeeName: string;
}

const BRANCHES = ['Namangan', 'Samarkand', 'Bukhara'];
const DEPARTMENTS = ['IT', 'Sales', 'HR', 'Finance', 'Operations', 'Security', 'Support'];
const avatarColors = ['var(--primary)', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#6366f1'];

const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
  let pwd = '';
  for (let i = 0; i < 10; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
};

const generateUsername = (fullName: string) => {
  const parts = fullName.trim().toLowerCase().split(/\s+/);
  const base = parts.length >= 2
    ? parts[0] + '.' + parts[parts.length - 1]
    : parts[0];
  return base.replace(/[^a-z0-9.]/g, '') + Math.floor(10 + Math.random() * 90);
};

const emptyForm = (): EmployeeFormData => ({
  full_name: '', position: '', department: DEPARTMENTS[0], branch: BRANCHES[0],
  phone: '', address: '', email: '', is_active: true,
});

export default function EmployeesPage() {
  const { t } = useLanguage();
  const supabase = createClient();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [credentials, setCredentials] = useState<GeneratedCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [faceIdTarget, setFaceIdTarget] = useState<{ employee: Employee; mode: 'register' | 'checkin' } | null>(null);
  const [faceIdSuccessMsg, setFaceIdSuccessMsg] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setEmployees((data as Employee[]) || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    const channel = supabase
      .channel('employees_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
        fetchEmployees();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchEmployees]);

  const branches = ['All', ...Array.from(new Set(employees.map((e) => e.branch).filter(Boolean)))];

  const filtered = employees.filter((e) => {
    const matchSearch =
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.position?.toLowerCase().includes(search.toLowerCase()) ||
      e.phone?.toLowerCase().includes(search.toLowerCase());
    const matchBranch = selectedBranch === 'All' || e.branch === selectedBranch;
    return matchSearch && matchBranch;
  });

  const stats = {
    total: employees.length,
    active: employees.filter((e) => e.is_active).length,
    inactive: employees.filter((e) => !e.is_active).length,
    branches: new Set(employees.map((e) => e.branch).filter(Boolean)).size,
  };

  const openCreate = () => {
    setEditingEmployee(null);
    setFormData(emptyForm());
    setFormError(null);
    setShowAddModal(true);
  };

  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      full_name: emp.full_name || '',
      position: emp.position || '',
      department: emp.department || DEPARTMENTS[0],
      branch: emp.branch || BRANCHES[0],
      phone: emp.phone || '',
      address: emp.address || '',
      email: emp.email || '',
      is_active: emp.is_active,
    });
    setFormError(null);
    setShowAddModal(true);
    setSelectedEmployee(null);
  };

  const handleSubmit = async () => {
    if (!formData.full_name.trim()) {
      setFormError("To'liq ism kiritilishi shart.");
      return;
    }
    if (!formData.phone.trim()) {
      setFormError("Telefon raqami kiritilishi shart.");
      return;
    }
    if (!formData.address.trim()) {
      setFormError("Yashash manzili kiritilishi shart.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        full_name: formData.full_name.trim(),
        position: formData.position.trim(),
        department: formData.department,
        branch: formData.branch,
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        email: formData.email.trim(),
        is_active: formData.is_active,
      };

      if (editingEmployee) {
        const { error: err } = await supabase.from('employees').update(payload).eq('id', editingEmployee.id);
        if (err) throw err;
        // Optimistic update for edit
        setEmployees((prev) => prev.map((e) => e.id === editingEmployee.id ? { ...e, ...payload } : e));
        setShowAddModal(false);
      } else {
        // Duplicate check — by full_name OR phone across all branches
        const nameLower = formData.full_name.trim().toLowerCase();
        const phoneTrimmed = formData.phone.trim();
        const duplicate = employees.find(
          (e) =>
            e.full_name.toLowerCase() === nameLower ||
            (phoneTrimmed && e.phone === phoneTrimmed)
        );
        if (duplicate) {
          setFormError(
            `Bu xodim allaqachon ro'yxatda mavjud: "${duplicate.full_name}" (${duplicate.branch} filiali). Bir xodimni ikki marta qo'shib bo'lmaydi.`
          );
          setSubmitting(false);
          return;
        }

        // Insert employee first
        const { data: newEmp, error: insertErr } = await supabase
          .from('employees')
          .insert(payload)
          .select()
          .single();
        if (insertErr) throw insertErr;

        // Optimistic update — add new employee to top of list immediately
        setEmployees((prev) => [newEmp as Employee, ...prev]);

        // Generate credentials
        const generatedEmail = formData.email.trim() ||
          `${generateUsername(formData.full_name)}@company.uz`;
        const generatedPassword = generatePassword();

        // Create auth account via Edge Function
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-employee-auth`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`,
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            },
            body: JSON.stringify({
              employee_id: newEmp.id,
              full_name: formData.full_name.trim(),
              email: generatedEmail,
              password: generatedPassword,
            }),
          }
        );

        const result = await response.json();
        if (!response.ok || result.error) {
          setShowAddModal(false);
          setFormError(null);
          setError(`Xodim saqlandi, lekin tizim hisobi yaratilmadi: ${result.error || 'Noma\'lum xato'}`);
          return;
        }

        setShowAddModal(false);
        // Show credentials modal
        setCredentials({
          email: generatedEmail,
          password: generatedPassword,
          employeeName: formData.full_name.trim(),
        });
      }
    } catch (e: any) {
      setFormError(e?.message || 'Xodimni saqlashda xato yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteEmployee = async (id: string) => {
    if (!confirm("Bu xodimni o'chirishni tasdiqlaysizmi?")) return;
    // Optimistic removal
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    setSelectedEmployee(null);
    try {
      const { error: err } = await supabase.from('employees').delete().eq('id', id);
      if (err) {
        // Revert on error
        fetchEmployees();
        throw err;
      }
    } catch (e: any) {
      setError(e?.message || 'Delete failed');
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t.employees_title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t.employees_subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
              <AppIcon name="PlusIcon" size={16} />
              {t.employees_add}
            </button>
          </div>
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
            { label: t.employees_total, value: stats.total, icon: 'UserGroupIcon', color: 'var(--primary)' },
            { label: t.employees_active, value: stats.active, icon: 'CheckCircleIcon', color: 'var(--success)' },
            { label: 'Inactive', value: stats.inactive, icon: 'XCircleIcon', color: 'var(--danger)' },
            { label: t.employees_departments, value: stats.branches, icon: 'BuildingOfficeIcon', color: 'var(--muted-foreground)' },
          ].map((s) => (
            <div key={s.label} className="card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}20` }}>
                <AppIcon name={s.icon as any} size={20} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <AppIcon name="MagnifyingGlassIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Xodimlarni qidirish..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9 w-full text-sm" />
          </div>
          <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="input text-sm min-w-[130px]">
            {branches.map((b) => <option key={b}>{b}</option>)}
          </select>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--secondary)' }}>
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-card text-foreground' : 'text-muted-foreground'}`}>
              <AppIcon name="Squares2X2Icon" size={16} />
            </button>
            <button onClick={() => setViewMode('table')} className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-card text-foreground' : 'text-muted-foreground'}`}>
              <AppIcon name="TableCellsIcon" size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="card p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">Xodimlar yuklanmoqda...</p>
          </div>
        ) : (
          <>
            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((emp, idx) => (
                  <div
                    key={emp.id}
                    className="card p-5 cursor-pointer hover:border-primary/40 transition-colors"
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{ background: avatarColors[idx % avatarColors.length] }}
                      >
                        {getInitials(emp.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{emp.position || '—'}</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {emp.phone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <AppIcon name="PhoneIcon" size={12} />
                          <span>{emp.phone}</span>
                        </div>
                      )}
                      {emp.address && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <AppIcon name="MapPinIcon" size={12} />
                          <span className="truncate">{emp.address}</span>
                        </div>
                      )}
                      {emp.department && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <AppIcon name="BuildingOfficeIcon" size={12} />
                          <span>{emp.department}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                      <StatusBadge
                        status={emp.is_active ? 'active' : 'inactive'}
                        label={emp.is_active ? 'Active' : 'Inactive'}
                      />
                      <div className="flex items-center gap-1">
                        {emp.auth_user_id && (
                          <div className="flex items-center gap-1 text-xs mr-1" style={{ color: 'var(--success)' }}>
                            <AppIcon name="KeyIcon" size={12} />
                          </div>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setFaceIdTarget({ employee: emp, mode: 'checkin' }); }}
                          className="p-1.5 rounded hover:bg-secondary transition-colors"
                          title="Davomat (Face ID)"
                          style={{ color: 'var(--primary)' }}
                        >
                          <AppIcon name="FingerPrintIcon" size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setFaceIdTarget({ employee: emp, mode: 'register' }); }}
                          className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground"
                          title="Face ID ro'yxatdan o'tkazish"
                        >
                          <AppIcon name="IdentificationIcon" size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(emp); }}
                          className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          title="Tahrirlash"
                        >
                          <AppIcon name="PencilSquareIcon" size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteEmployee(emp.id); }}
                          className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-danger transition-colors"
                          title="O'chirish"
                        >
                          <AppIcon name="TrashIcon" size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="col-span-full card p-10 text-center text-sm text-muted-foreground">Xodimlar topilmadi</div>
                )}
              </div>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                        {['Xodim', 'Lavozim', 'Bo\'lim', 'Telefon', 'Manzil', 'Holat', ''].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((emp, idx) => (
                        <tr key={emp.id} className="border-b hover:bg-secondary/30 cursor-pointer transition-colors" style={{ borderColor: 'var(--border)' }} onClick={() => setSelectedEmployee(emp)}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: avatarColors[idx % avatarColors.length] }}>
                                {getInitials(emp.full_name)}
                              </div>
                              <span className="font-medium text-foreground text-xs">{emp.full_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{emp.position || '—'}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{emp.department || '—'}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{emp.phone || '—'}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground max-w-[150px] truncate">{emp.address || '—'}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={emp.is_active ? 'active' : 'inactive'} label={emp.is_active ? 'Active' : 'Inactive'} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); setFaceIdTarget({ employee: emp, mode: 'checkin' }); }}
                                className="p-1.5 rounded hover:bg-secondary transition-colors"
                                title="Davomat (Face ID)"
                                style={{ color: 'var(--primary)' }}
                              >
                                <AppIcon name="FingerPrintIcon" size={14} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setFaceIdTarget({ employee: emp, mode: 'register' }); }}
                                className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground"
                                title="Face ID ro'yxatdan o'tkazish"
                              >
                                <AppIcon name="IdentificationIcon" size={14} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); openEdit(emp); }} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                                <AppIcon name="PencilSquareIcon" size={14} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); deleteEmployee(emp.id); }} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-danger transition-colors">
                                <AppIcon name="TrashIcon" size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">Xodimlar topilmadi</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedEmployee(null)}>
          <div className="card w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Xodim profili</h2>
              <button onClick={() => setSelectedEmployee(null)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground">
                <AppIcon name="XMarkIcon" size={18} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white" style={{ background: 'var(--primary)' }}>
                {getInitials(selectedEmployee.full_name)}
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{selectedEmployee.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedEmployee.position || '—'}</p>
                <StatusBadge status={selectedEmployee.is_active ? 'active' : 'inactive'} label={selectedEmployee.is_active ? 'Active' : 'Inactive'} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Lavozim', selectedEmployee.position || '—'],
                ['Bo\'lim', selectedEmployee.department || '—'],
                ['Filial', selectedEmployee.branch || '—'],
                ['Telefon', selectedEmployee.phone || '—'],
                ['Email', selectedEmployee.email || '—'],
                ['Manzil', selectedEmployee.address || '—'],
              ].map(([label, value]) => (
                <div key={label} className={label === 'Manzil' || label === 'Email' ? 'col-span-2' : ''}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium text-foreground break-all">{value}</p>
                </div>
              ))}
            </div>
            {selectedEmployee.auth_user_id && (
              <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>
                <AppIcon name="KeyIcon" size={16} />
                <span>Tizim hisobi yaratilgan</span>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => openEdit(selectedEmployee)} className="btn-secondary flex-1 text-sm">Tahrirlash</button>
              <button
                onClick={() => deleteEmployee(selectedEmployee.id)}
                className="flex-1 text-sm px-3 py-2 rounded-lg"
                style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.08)' }}
              >
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="card w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingEmployee ? 'Xodimni tahrirlash' : 'Yangi xodim qo\'shish'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground">
                <AppIcon name="XMarkIcon" size={18} />
              </button>
            </div>

            {!editingEmployee && (
              <div className="p-3 rounded-lg text-xs flex items-start gap-2" style={{ background: 'rgba(var(--primary-rgb, 99,102,241),0.08)', color: 'var(--primary)' }}>
                <AppIcon name="InformationCircleIcon" size={14} className="mt-0.5 flex-shrink-0" />
                <span>Xodim saqlangandan so'ng avtomatik ravishda tizimga kirish uchun <strong>login va parol</strong> generatsiya qilinadi.</span>
              </div>
            )}

            {formError && (
              <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>{formError}</div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Full Name */}
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">To'liq ism *</label>
                <input
                  type="text"
                  placeholder="Ism Familiya"
                  value={formData.full_name}
                  onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))}
                  className="input w-full text-sm"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Telefon raqami *</label>
                <input
                  type="tel"
                  placeholder="+998 90 123 45 67"
                  value={formData.phone}
                  onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                  className="input w-full text-sm"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Email {!editingEmployee && '(ixtiyoriy)'}</label>
                <input
                  type="email"
                  placeholder="xodim@company.uz"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  className="input w-full text-sm"
                />
              </div>

              {/* Address */}
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Yashash manzili *</label>
                <input
                  type="text"
                  placeholder="Shahar, ko'cha, uy raqami"
                  value={formData.address}
                  onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                  className="input w-full text-sm"
                />
              </div>

              {/* Position */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Lavozim</label>
                <input
                  type="text"
                  placeholder="Masalan: Dasturchi"
                  value={formData.position}
                  onChange={(e) => setFormData((p) => ({ ...p, position: e.target.value }))}
                  className="input w-full text-sm"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Bo'lim</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))}
                  className="input w-full text-sm"
                >
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>

              {/* Branch */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Filial</label>
                <select
                  value={formData.branch}
                  onChange={(e) => setFormData((p) => ({ ...p, branch: e.target.value }))}
                  className="input w-full text-sm"
                >
                  {BRANCHES.map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>

              {/* Active */}
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active" className="text-sm text-foreground">Faol xodim</label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary flex-1 text-sm">Bekor qilish</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editingEmployee ? 'Saqlash' : 'Qo\'shish va hisob yaratish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {credentials && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6 space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <AppIcon name="CheckCircleIcon" size={32} style={{ color: 'var(--success)' }} />
              </div>
              <h2 className="text-lg font-bold text-foreground">Xodim muvaffaqiyatli qo'shildi!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                <strong>{credentials.employeeName}</strong> uchun tizim hisobi yaratildi
              </p>
            </div>

            <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--secondary)' }}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kirish ma'lumotlari</p>

              {/* Email/Login */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg" style={{ background: 'var(--card)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">Login (Email)</p>
                  <p className="text-sm font-mono font-semibold text-foreground truncate">{credentials.email}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(credentials.email, 'email')}
                  className="p-2 rounded-lg flex-shrink-0 transition-colors"
                  style={{ background: copiedField === 'email' ? 'rgba(16,185,129,0.15)' : 'var(--secondary)', color: copiedField === 'email' ? 'var(--success)' : 'var(--muted-foreground)' }}
                >
                  <AppIcon name={copiedField === 'email' ? 'CheckIcon' : 'ClipboardDocumentIcon'} size={16} />
                </button>
              </div>

              {/* Password */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg" style={{ background: 'var(--card)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">Parol</p>
                  <p className="text-sm font-mono font-semibold text-foreground">{credentials.password}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(credentials.password, 'password')}
                  className="p-2 rounded-lg flex-shrink-0 transition-colors"
                  style={{ background: copiedField === 'password' ? 'rgba(16,185,129,0.15)' : 'var(--secondary)', color: copiedField === 'password' ? 'var(--success)' : 'var(--muted-foreground)' }}
                >
                  <AppIcon name={copiedField === 'password' ? 'CheckIcon' : 'ClipboardDocumentIcon'} size={16} />
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg text-xs flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
              <AppIcon name="ExclamationTriangleIcon" size={14} className="mt-0.5 flex-shrink-0" />
              <span>Bu ma'lumotlarni xodimga yetkazing. Parol faqat bir marta ko'rsatiladi.</span>
            </div>

            <button
              onClick={() => setCredentials(null)}
              className="btn-primary w-full text-sm"
            >
              Tushunarli, yopish
            </button>
          </div>
        </div>
      )}

      {/* Face ID Success Toast */}
      {faceIdSuccessMsg && (
        <div
          className="fixed bottom-6 right-6 z-[80] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium"
          style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)' }}
        >
          <AppIcon name="CheckCircleIcon" size={18} />
          {faceIdSuccessMsg}
          <button onClick={() => setFaceIdSuccessMsg(null)} className="ml-2 opacity-70 hover:opacity-100">
            <AppIcon name="XMarkIcon" size={14} />
          </button>
        </div>
      )}

      {/* Face ID Modal */}
      {faceIdTarget && (
        <FaceIdModal
          employee={faceIdTarget.employee}
          mode={faceIdTarget.mode}
          onClose={() => setFaceIdTarget(null)}
          onSuccess={(msg) => {
            setFaceIdTarget(null);
            setFaceIdSuccessMsg(msg);
            setTimeout(() => setFaceIdSuccessMsg(null), 4000);
          }}
        />
      )}
    </AppLayout>
  );
}
