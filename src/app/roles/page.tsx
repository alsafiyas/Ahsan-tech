'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import { useLanguage } from '@/context/LanguageContext';
import { createClient } from '@/lib/supabase/client';

interface Role {
  id: string;
  name: string;
  emoji: string;
  description: string;
  userCount: number;
  permissions: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean; export: boolean }>;
  assignedEmployeeIds?: string[];
}

interface Employee {
  id: string;
  full_name: string;
  position: string;
  department: string;
  is_active: boolean;
}

const modules = [
  'Boshqaruv paneli', 'CRM', 'Savdo', 'Mahsulotlar', 'Ombor', 'Xarid',
  'Servis', 'Montaj', 'Xodimlar', 'Davomat', 'Maosh', 'Moliya',
  'Hisobotlar', 'Filiallar', 'Audit jurnali', 'Sozlamalar'
];

const moduleKeys = [
  'Dashboard', 'CRM', 'Sales', 'Products', 'Warehouse', 'Purchasing',
  'Service', 'Installation', 'Employees', 'Attendance', 'Payroll', 'Finance',
  'Reports', 'Branches', 'Audit Log', 'Settings'
];

const mockRoles: Role[] = [];

export default function RolesPage() {
  const { t } = useLanguage();
  const supabase = createClient();

  const [roles, setRoles] = useState<Role[]>(mockRoles);
  const [selectedRole, setSelectedRole] = useState<Role | null>(mockRoles[0] ?? null);
  const [showAddRole, setShowAddRole] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Employees state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [empSearch, setEmpSearch] = useState('');

  // Add role form
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleEmoji, setNewRoleEmoji] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleCopyFrom, setNewRoleCopyFrom] = useState('');
  const [newRoleEmployeeIds, setNewRoleEmployeeIds] = useState<string[]>([]);
  const [addEmpSearch, setAddEmpSearch] = useState('');

  // Assign employees modal state (for existing role)
  const [assignEmployeeIds, setAssignEmployeeIds] = useState<string[]>([]);
  const [assignSearch, setAssignSearch] = useState('');

  const fetchEmployees = useCallback(async () => {
    setEmpLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, position, department, is_active')
        .order('full_name', { ascending: true });
      if (!error && data) setEmployees(data as Employee[]);
    } catch (_) {}
    setEmpLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const openAddRole = () => {
    setNewRoleName('');
    setNewRoleEmoji('');
    setNewRoleDesc('');
    setNewRoleCopyFrom('');
    setNewRoleEmployeeIds([]);
    setAddEmpSearch('');
    setShowAddRole(true);
  };

  const openAssignModal = () => {
    if (!selectedRole) return;
    setAssignEmployeeIds(selectedRole.assignedEmployeeIds || []);
    setAssignSearch('');
    setShowAssignModal(true);
  };

  const toggleEmpInList = (id: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;
    const copySource = roles.find((r) => r.name === newRoleCopyFrom);
    const perms = copySource
      ? { ...copySource.permissions }
      : Object.fromEntries(modules.map((m) => [m, { view: false, create: false, edit: false, delete: false, export: false }]));
    const newRole: Role = {
      id: `R${Date.now()}`,
      name: newRoleName.trim(),
      emoji: newRoleEmoji.trim() || '🔑',
      description: newRoleDesc.trim() || '',
      userCount: newRoleEmployeeIds.length,
      permissions: perms,
      assignedEmployeeIds: newRoleEmployeeIds,
    };
    const updated = [...roles, newRole];
    setRoles(updated);
    setSelectedRole(newRole);
    setShowAddRole(false);
  };

  const handleSaveAssign = () => {
    if (!selectedRole) return;
    const updated = roles.map((r) =>
      r.id === selectedRole.id
        ? { ...r, assignedEmployeeIds: assignEmployeeIds, userCount: assignEmployeeIds.length }
        : r
    );
    setRoles(updated);
    setSelectedRole({ ...selectedRole, assignedEmployeeIds: assignEmployeeIds, userCount: assignEmployeeIds.length });
    setShowAssignModal(false);
  };

  const assignedEmployees = employees.filter((e) => (selectedRole?.assignedEmployeeIds || []).includes(e.id));

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
        {/* Header */}
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

        {roles.length === 0 ? (
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
          {/* Role List */}
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
                    <p className="text-xs text-muted-foreground">{role.userCount} foydalanuvchi</p>
                  </div>
                  {selectedRole?.id === role.id && <AppIcon name="ChevronRightIcon" size={14} style={{ color: 'var(--primary)' }} />}
                </div>
              </button>
            ))}
          </div>

          {/* Right panel */}
          {selectedRole && (
          <div className="lg:col-span-3 space-y-4">
            {/* Assigned Employees Card */}
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

            {/* Permissions Matrix */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ruxsatlar matritsasi</p>
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
                      const perms = selectedRole.permissions[mod];
                      return (
                        <tr key={mod} className="border-b hover:bg-secondary/20 transition-colors" style={{ borderColor: 'var(--border)' }}>
                          <td className="px-4 py-3 text-xs font-medium text-foreground">{mod}</td>
                          {(['view', 'create', 'edit', 'delete', 'export'] as const).map((perm) => (
                            <td key={perm} className="px-4 py-3 text-center">
                              {perms[perm] ? (
                                <div className="flex justify-center">
                                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
                                    <AppIcon name="CheckIcon" size={12} style={{ color: 'var(--success)' }} />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-center">
                                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                                    <AppIcon name="XMarkIcon" size={12} style={{ color: 'var(--danger)' }} />
                                  </div>
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t flex items-center justify-end gap-3" style={{ borderColor: 'var(--border)' }}>
                <button className="btn-secondary text-sm">Standartga qaytarish</button>
                <button className="btn-primary text-sm">Ruxsatlarni saqlash</button>
              </div>
            </div>
          </div>
          )}
        </div>
        )}
      </div>

      {/* Add Role Modal */}
      {showAddRole && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAddRole(false)}>
          <div className="card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Yangi rol qo'shish</h2>
              <button onClick={() => setShowAddRole(false)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground">
                <AppIcon name="XMarkIcon" size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Rol nomi</label>
                <input
                  type="text"
                  placeholder="Masalan: Operator"
                  className="input w-full text-sm"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Emoji</label>
                <input
                  type="text"
                  placeholder="📞"
                  className="input w-full text-sm"
                  value={newRoleEmoji}
                  onChange={(e) => setNewRoleEmoji(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Tavsif</label>
                <textarea
                  rows={2}
                  className="input w-full text-sm resize-none"
                  placeholder="Rol tavsifi..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Ruxsatlarni nusxalash</label>
                <select
                  className="input w-full text-sm"
                  value={newRoleCopyFrom}
                  onChange={(e) => setNewRoleCopyFrom(e.target.value)}
                >
                  <option value="">— Noldan boshlash —</option>
                  {roles.map((r) => <option key={r.id}>{r.name}</option>)}
                </select>
              </div>

              {/* Employee selection */}
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
              <button onClick={handleCreateRole} className="btn-primary flex-1 text-sm">Rol yaratish</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Employees Modal */}
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

            {/* Search */}
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

            {/* Selected count */}
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

            {/* Employee list */}
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
              <button onClick={handleSaveAssign} className="btn-primary flex-1 text-sm">
                Saqlash ({assignEmployeeIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
