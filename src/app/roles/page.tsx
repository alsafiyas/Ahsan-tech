'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import { useLanguage } from '@/context/LanguageContext';
import { createClient } from '@/lib/supabase/client';

type PermSet = { view: boolean; create: boolean; edit: boolean; delete: boolean; export: boolean };

interface Role {
  id: string;
  name: string;
  emoji: string;
  description: string;
  permissions: Record<string, PermSet>;
}

interface Employee {
  id: string;
  full_name: string;
  position: string;
  department: string;
  is_active: boolean;
  role_id?: string | null;
}

const modules = [
  'Boshqaruv paneli', 'CRM', 'Savdo', 'Mahsulotlar', 'Ombor', 'Xarid',
  'Servis', 'Montaj', 'Xodimlar', 'Davomat', 'Maosh', 'Moliya',
  'Hisobotlar', 'Filiallar', 'Audit jurnali', 'Sozlamalar'
];

const emptyPermissions = (): Record<string, PermSet> =>
  Object.fromEntries(modules.map((m) => [m, { view: false, create: false, edit: false, delete: false, export: false }]));

export default function RolesPage() {
  const { t } = useLanguage();
  const supabase = createClient();

  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showAddRole, setShowAddRole] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(false);

  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleEmoji, setNewRoleEmoji] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleCopyFrom, setNewRoleCopyFrom] = useState('');
  const [newRoleEmployeeIds, setNewRoleEmployeeIds] = useState<string[]>([]);
  const [newRolePermissions, setNewRolePermissions] = useState<Record<string, PermSet>>(emptyPermissions());
  const [addEmpSearch, setAddEmpSearch] = useState('');
  const [creatingRole, setCreatingRole] = useState(false);
  const [addRoleError, setAddRoleError] = useState<string | null>(null);

  const [assignEmployeeIds, setAssignEmployeeIds] = useState<string[]>([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [savingAssign, setSavingAssign] = useState(false);

  const [draftPermissions, setDraftPermissions] = useState<Record<string, PermSet>>({});
  const [permDirty, setPermDirty] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);

  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    setRolesError(null);
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, emoji, description, permissions')
        .order('created_at', { ascending: true });
      if (error) throw error;
      const loaded = (data || []) as Role[];
      setRoles(loaded);
      setSelectedRole((prev) => {
        if (prev) {
          const stillExists = loaded.find((r) => r.id === prev.id);
          if (stillExists) return stillExists;
        }
        return loaded[0] ?? null;
      });
    } catch (err: any) {
      setRolesError(err?.message || 'Rollarni yuklashda xatolik yuz berdi');
    } finally {
      setRolesLoading(false);
    }
  }, [supabase]);

  const fetchEmployees = useCallback(async () => {
    setEmpLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, position, department, is_active, role_id')
        .order('full_name', { ascending: true });
      if (!error && data) setEmployees(data as Employee[]);
    } catch (_) {}
    setEmpLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchRoles();
    fetchEmployees();
  }, [fetchRoles, fetchEmployees]);

  useEffect(() => {
    if (selectedRole) {
      setDraftPermissions(selectedRole.permissions || emptyPermissions());
      setPermDirty(false);
    } else {
      setDraftPermissions({});
      setPermDirty(false);
    }
  }, [selectedRole?.id]);

  const getAssignedEmployees = useCallback(
    (roleId: string) => employees.filter((e) => e.role_id === roleId),
    [employees]
  );

  const openAddRole = () => {
    setNewRoleName('');
    setNewRoleEmoji('');
    setNewRoleDesc('');
    setNewRoleCopyFrom('');
    setNewRoleEmployeeIds([]);
    setNewRolePermissions(emptyPermissions());
    setAddEmpSearch('');
    setAddRoleError(null);
    setShowAddRole(true);
  };

  const handleCopyFromChange = (roleName: string) => {
    setNewRoleCopyFrom(roleName);
    const source = roles.find((r) => r.name === roleName);
    setNewRolePermissions(source ? { ...source.permissions } : emptyPermissions());
  };

  const toggleNewRolePerm = (mod: string, perm: keyof PermSet) => {
    setNewRolePermissions((prev) => ({
      ...prev,
      [mod]: { ...(prev[mod] || { view: false, create: false, edit: false, delete: false, export: false }), [perm]: !prev[mod]?.[perm] },
    }));
  };

  const openAssignModal = () => {
    if (!selectedRole) return;
    setAssignEmployeeIds(getAssignedEmployees(selectedRole.id).map((e) => e.id));
    setAssignSearch('');
    setShowAssignModal(true);
  };

  const toggleEmpInList = (id: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  // ─────────────────────────────────────────────────────────
  // DIQQAT: bu funksiya ichida VAQTINCHALIK debug alert'lar bor
  // (muammoni topish uchun). Muammo topilgach, bularni olib
  // tashlab, oddiy holatga qaytarish kerak.
  // ─────────────────────────────────────────────────────────
  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    alert('Funksiya ishga tushdi: ' + newRoleName);
    setCreatingRole(true);
    setAddRoleError(null);
    try {
      const { data, error } = await supabase
        .from('roles')
        .insert({
          name: newRoleName.trim(),
          emoji: newRoleEmoji.trim() || '🔑',
          description: newRoleDesc.trim() || '',
          permissions: newRolePermissions,
        })
        .select('id, name, emoji, description, permissions')
        .single();

      if (error) throw error;

      alert('Insert muvaffaqiyatli: ' + JSON.stringify(data));

      if (newRoleEmployeeIds.length > 0) {
        const { error: assignError } = await supabase
          .from('employees')
          .update({ role_id: data.id })
          .in('id', newRoleEmployeeIds);
        if (assignError) throw assignError;
        await fetchEmployees();
      }

      const newRole = data as Role;
      setRoles((prev) => [...prev, newRole]);
      setSelectedRole(newRole);
      setShowAddRole(false);
    } catch (err: any) {
      alert('XATO: ' + JSON.stringify(err));
      setAddRoleError(err?.message || 'Rol yaratishda xatolik yuz berdi');
    } finally {
      setCreatingRole(false);
    }
  };

  const handleSaveAssign = async () => {
    if (!selectedRole) return;
    setSavingAssign(true);
    try {
      const currentAssigned = getAssignedEmployees(selectedRole.id).map((e) => e.id);
      const toAdd = assignEmployeeIds.filter((id) => !currentAssigned.includes(id));
      const toRemove = currentAssigned.filter((id) => !assignEmployeeIds.includes(id));

      if (toAdd.length > 0) {
        const { error } = await supabase.from('employees').update({ role_id: selectedRole.id }).in('id', toAdd);
        if (error) throw error;
      }
      if (toRemove.length > 0) {
        const { error } = await supabase.from('employees').update({ role_id: null }).in('id', toRemove);
        if (error) throw error;
      }
      await fetchEmployees();
      setShowAssignModal(false);
    } catch (err) {
      console.error('Failed to save employee assignment', err);
    } finally {
      setSavingAssign(false);
    }
  };

  const togglePerm = (mod: string, perm: keyof PermSet) => {
    setDraftPermissions((prev) => ({
      ...prev,
      [mod]: { ...(prev[mod] || { view: false, create: false, edit: false, delete: false, export: false }), [perm]: !prev[mod]?.[perm] },
    }));
    setPermDirty(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSavingPerms(true);
    try {
      const { error } = await supabase
        .from('roles')
        .update({ permissions: draftPermissions })
        .eq('id', selectedRole.id);
      if (error) throw error;
      setRoles((prev) => prev.map((r) => (r.id === selectedRole.id ? { ...r, permissions: draftPermissions } : r)));
      setSelectedRole((prev) => (prev ? { ...prev, permissions: draftPermissions } : prev));
      setPermDirty(false);
    } catch (err) {
      console.error('Failed to save permissions', err);
    } finally {
      setSavingPerms(false);
    }
  };

  const handleResetPermissions = () => {
    if (selectedRole) setDraftPermissions(selectedRole.permissions || emptyPermissions());
    setPermDirty(false);
  };

  const assignedEmployees = selectedRole ? getAssignedEmployees(selectedRole.id) : [];

  const filteredForAssign = employees.filter((e) =>
    e.full_name.toLowerCase().includes(assignSearch.toLowerCase()) ||
    e.position?.toLowerCase().includes(assignSearch.toLowerCase())
  );

  const filteredForAdd = employees.filter((e) =>
    e.full_name.toLowerCase().includes(addEmpSearch.toLowerCase()) ||
    e.position?.toLowerCase().includes(addEmpSearch.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t.roles_title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t.roles_subtitle}</p>
          </div>
          <button onClick={openAddRole} className="btn-primary flex items-center gap-2 text-sm">
            <AppIcon name="PlusIcon" size={16} />
            {t.roles_add}
          </button>
        </div>

        {rolesError && (
          <div className="flex items-center gap-3 p-4 rounded-lg text-sm" style={{ background: 'var(--danger)15', color: 'var(--danger)', border: '1px solid var(--danger)30' }}>
            <AppIcon name="ExclamationCircleIcon" size={16} />
            {rolesError}
          </div>
        )}

        {rolesLoading ? (
          <div className="card flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <AppIcon name="ArrowPathIcon" size={20} className="animate-spin" />
            <span className="text-sm">Yuklanmoqda...</span>
          </div>
        ) : roles.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <AppIcon name="ShieldCheckIcon" size={40} className="text-muted-foreground mb-3 opacity-40" />
            <p className="font-medium text-foreground mb-1">Hali rol yaratilmagan</p>
            <p className="text-sm text-muted-foreground mb-4">Boshlash uchun birinchi rolni yarating</p>
            <button onClick={openAddRole} className="btn-primary flex items-center gap-2 text-sm">
              <AppIcon name="PlusIcon" size={16} />
              {t.roles_add}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full card p-4 text-left transition-all ${selectedRole?.id === role.id ? 'border-primary/50 bg-primary/5' : 'hover:border-primary/20'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{role.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">{role.name}</p>
                      <p className="text-xs text-muted-foreground">{getAssignedEmployees(role.id).length} foydalanuvchi</p>
                    </div>
                    {selectedRole?.id === role.id && <AppIcon name="ChevronRightIcon" size={14} style={{ color: 'var(--primary)' }} />}
                  </div>
                </button>
              ))}
            </div>

            {selectedRole && (
              <div className="lg:col-span-3 space-y-4">
                <div className="card overflow-hidden">
                  <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{selectedRole.emoji}</span>
                      <div>
                        <h3 className="font-semibold text-foreground">{selectedRole.name}</h3>
                        <p className="text-xs text-muted-foreground">{selectedRole.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={openAssignModal}
                      className="btn-secondary flex items-center gap-2 text-xs"
                    >
                      <AppIcon name="UserPlusIcon" size={14} />
                      Xodim belgilash
                    </button>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Tayinlangan xodimlar ({assignedEmployees.length})
                    </p>
                    {empLoading ? (
                      <p className="text-xs text-muted-foreground">Yuklanmoqda...</p>
                    ) : assignedEmployees.length === 0 ? (
                      <div className="flex flex-col items-center py-6 text-center">
                        <AppIcon name="UsersIcon" size={32} className="text-muted-foreground mb-2 opacity-40" />
                        <p className="text-sm text-muted-foreground">Hali xodim tayinlanmagan</p>
                        <button onClick={openAssignModal} className="mt-2 text-xs text-primary hover:underline">
                          Xodim qo'shish
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {assignedEmployees.map((emp) => (
                          <div
                            key={emp.id}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                            style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}
                          >
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ background: 'var(--primary)' }}>
                              {emp.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span>{emp.full_name}</span>
                            <span className="text-muted-foreground">· {emp.position || '—'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ruxsatlar matritsasi */}
                <div className="card overflow-hidden">
                  <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ruxsatlar matritsasi</p>
                    {permDirty && (
                      <span className="text-xs font-medium" style={{ color: 'var(--warning)' }}>Saqlanmagan o'zgarishlar bor</span>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Modul</th>
                          {[t.roles_permission_view, t.roles_permission_add, t.roles_permission_edit, t.roles_permission_delete, t.roles_permission_export].map((h) => (
                            <th key={h} className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {modules.map((mod) => {
                          const perms = draftPermissions[mod] || { view: false, create: false, edit: false, delete: false, export: false };
                          return (
                            <tr key={mod} className="border-b hover:bg-secondary/20 transition-colors" style={{ borderColor: 'var(--border)' }}>
                              <td className="px-4 py-3 text-xs font-medium text-foreground">{mod}</td>
                              {(['view', 'create', 'edit', 'delete', 'export'] as const).map((perm) => {
                                const active = perms[perm];
                                return (
                                  <td key={perm} className="px-4 py-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => togglePerm(mod, perm)}
                                      className={`w-7 h-7 mx-auto rounded-md flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                                        active
                                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                          : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 opacity-50 hover:opacity-100'
                                      }`}
                                    >
                                      {active ? '✓' : '✕'}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-5 py-3 border-t flex items-center justify-end gap-3" style={{ borderColor: 'var(--border)' }}>
                    <button
                      onClick={handleResetPermissions}
                      disabled={!permDirty}
                      className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Bekor qilish
                    </button>
                    <button
                      onClick={handleSavePermissions}
                      disabled={!permDirty || savingPerms}
                      className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingPerms && <AppIcon name="ArrowPathIcon" size={14} className="animate-spin" />}
                      Ruxsatlarni saqlash
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Yangi rol qo'shish modali */}
      {showAddRole && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAddRole(false)}>
          <div className="card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Yangi rol qo'shish</h2>
              <button onClick={() => setShowAddRole(false)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground">
                <AppIcon name="XMarkIcon" size={18} />
              </button>
            </div>

            {addRoleError && (
              <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--danger)15', color: 'var(--danger)' }}>
                {addRoleError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Rol nomi</label>
                <input
                  type="text"
                  placeholder="Masalan: Texnik"
                  className="input w-full text-sm"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Emoji</label>
                <input
                  type="text"
                  placeholder="🔧"
                  className="input w-full text-sm"
                  value={newRoleEmoji}
                  onChange={(e) => setNewRoleEmoji(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Tavsif</label>
                <input
                  type="text"
                  placeholder="Rol haqida qisqacha"
                  className="input w-full text-sm"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Ruxsatlarni nusxalash</label>
                <select
                  className="input w-full text-sm"
                  value={newRoleCopyFrom}
                  onChange={(e) => handleCopyFromChange(e.target.value)}
                >
                  <option value="">— Noldan boshlash —</option>
                  {roles.map((r) => <option key={r.id}>{r.name}</option>)}
                </select>
              </div>

              {/* Modal ichidagi ruxsatlar tanlash jadvali */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Ruxsatlarni tanlash</label>
                <div className="border rounded-lg overflow-hidden max-h-56 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
                  <table className="w-full text-xs">
                    <thead className="sticky top-0" style={{ background: 'var(--card)' }}>
                      <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Modul</th>
                        {[t.roles_permission_view, t.roles_permission_add, t.roles_permission_edit, t.roles_permission_delete, t.roles_permission_export].map((h) => (
                          <th key={h} className="px-2 py-2 text-center font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map((mod) => {
                        const perms = newRolePermissions[mod] || { view: false, create: false, edit: false, delete: false, export: false };
                        return (
                          <tr key={mod} className="border-b hover:bg-secondary/20" style={{ borderColor: 'var(--border)' }}>
                            <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{mod}</td>
                            {(['view', 'create', 'edit', 'delete', 'export'] as const).map((perm) => {
                              const active = perms[perm];
                              return (
                                <td key={perm} className="px-2 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleNewRolePerm(mod, perm)}
                                    className={`w-6 h-6 mx-auto rounded flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer ${
                                      active
                                        ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                                        : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 opacity-50 hover:opacity-100'
                                    }`}
                                  >
                                    {active ? '✓' : '✕'}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Xodimlarni tanlash
                  {newRoleEmployeeIds.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: 'var(--primary)', color: '#fff' }}>
                      {newRoleEmployeeIds.length}
                    </span>
                  )}
                </label>
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                  <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
                    <input
                      type="text"
                      placeholder="Xodim qidirish..."
                      className="input w-full text-xs py-1.5"
                      value={addEmpSearch}
                      onChange={(e) => setAddEmpSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto">
                    {empLoading ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Yuklanmoqda...</p>
                    ) : filteredForAdd.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Xodim topilmadi</p>
                    ) : (
                      filteredForAdd.map((emp) => {
                        const checked = newRoleEmployeeIds.includes(emp.id);
                        return (
                          <label
                            key={emp.id}
                            className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-secondary/30 transition-colors ${checked ? 'bg-primary/5' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleEmpInList(emp.id, newRoleEmployeeIds, setNewRoleEmployeeIds)}
                              className="rounded"
                            />
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background: checked ? 'var(--primary)' : 'var(--muted)' }}>
                              {emp.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{emp.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{emp.position || '—'} · {emp.department || '—'}</p>
                            </div>
                            {!emp.is_active && (
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>
                                Nofaol
                              </span>
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAddRole(false)} className="btn-secondary flex-1 text-sm">Bekor qilish</button>
              <button
                onClick={handleCreateRole}
                disabled={creatingRole || !newRoleName.trim()}
                className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {creatingRole && <AppIcon name="ArrowPathIcon" size={14} className="animate-spin" />}
                Rol yaratish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Xodimlarni biriktirish modali */}
      {showAssignModal && selectedRole && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAssignModal(false)}>
          <div className="card w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedRole.emoji} {selectedRole.name} — Xodimlar
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Bu rolga xodimlarni tanlang</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground">
                <AppIcon name="XMarkIcon" size={18} />
              </button>
            </div>

            <div className="relative">
              <AppIcon name="MagnifyingGlassIcon" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Xodim qidirish..."
                className="input w-full text-sm pl-8"
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
              />
            </div>

            {assignEmployeeIds.length > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{assignEmployeeIds.length} xodim tanlandi</span>
                <button
                  onClick={() => setAssignEmployeeIds([])}
                  className="text-danger hover:underline"
                  style={{ color: 'var(--danger)' }}
                >
                  Barchasini olib tashlash
                </button>
              </div>
            )}

            <div className="border rounded-lg overflow-hidden max-h-72 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
              {empLoading ? (
                <p className="text-xs text-muted-foreground text-center py-6">Yuklanmoqda...</p>
              ) : filteredForAssign.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Xodim topilmadi</p>
              ) : (
                filteredForAssign.map((emp) => {
                  const checked = assignEmployeeIds.includes(emp.id);
                  return (
                    <label
                      key={emp.id}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/30 transition-colors border-b last:border-b-0 ${checked ? 'bg-primary/5' : ''}`}
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEmpInList(emp.id, assignEmployeeIds, setAssignEmployeeIds)}
                        className="rounded"
                      />
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: checked ? 'var(--primary)' : 'var(--muted)' }}
                      >
                        {emp.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{emp.position || '—'} · {emp.department || '—'}</p>
                      </div>
                      {!emp.is_active && (
                        <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>
                          Nofaol
                        </span>
                      )}
                      {checked && (
                        <AppIcon name="CheckCircleIcon" size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      )}
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowAssignModal(false)} className="btn-secondary flex-1 text-sm">Bekor qilish</button>
              <button
                onClick={handleSaveAssign}
                disabled={savingAssign}
                className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {savingAssign && <AppIcon name="ArrowPathIcon" size={14} className="animate-spin" />}
                Saqlash ({assignEmployeeIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
