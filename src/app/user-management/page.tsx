'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { logAuditActionWithAlert } from '@/lib/auditLogger';
import { useRouter } from 'next/navigation';

type UserRole = 'Admin' | 'Manager' | 'Operator';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserFormData {
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  password?: string;
}

const ROLES: UserRole[] = ['Admin', 'Manager', 'Operator'];

const roleColors: Record<UserRole, { bg: string; color: string }> = {
  Admin: { bg: 'rgba(239,68,68,0.12)', color: 'var(--danger)' },
  Manager: { bg: 'rgba(245,158,11,0.12)', color: 'var(--warning)' },
  Operator: { bg: 'rgba(99,102,241,0.12)', color: 'var(--primary)' },
};

const roleIcons: Record<UserRole, string> = {
  Admin: '👑',
  Manager: '👔',
  Operator: '🔧',
};

export default function UserManagementPage() {
  const { userRole, user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | UserRole>('All');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<UserFormData>({ full_name: '', email: '', role: 'Operator', is_active: true, password: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    if (userRole && userRole !== 'Admin') {
      router.replace('/dashboard');
    }
  }, [userRole, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, role, is_active, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data as UserProfile[]) || []);
    } catch (err: any) {
      setPageError(err?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openCreate = () => {
    setEditingUser(null);
    setFormData({ full_name: '', email: '', role: 'Operator', is_active: true, password: '' });
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (u: UserProfile) => {
    setEditingUser(u);
    setFormData({ full_name: u.full_name, email: u.email, role: u.role, is_active: u.is_active, password: '' });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (editingUser) {
        // Update existing user profile
        const updates: Partial<UserProfile> = {
          full_name: formData.full_name,
          role: formData.role,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
          .from('user_profiles')
          .update(updates)
          .eq('id', editingUser.id);

        if (updateError) throw updateError;

        // Log role change if role was modified
        if (editingUser.role !== formData.role) {
          await logAuditActionWithAlert(
            {
              action: 'role_changed',
              actorId: user?.id,
              actorEmail: user?.email || '',
              actorRole: userRole || 'Admin',
              targetUserId: editingUser.id,
              targetEmail: editingUser.email,
              details: {
                old_role: editingUser.role,
                new_role: formData.role,
                full_name: formData.full_name,
              },
            },
            [] // Admin emails resolved via edge function
          );
        }
      } else {
        // Create new user via Supabase Admin API (using service role via edge function is ideal,
        // but here we use signUp flow and then update the profile role)
        if (!formData.password || formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.full_name,
              role: formData.role,
            },
          },
        });

        if (signUpError) throw signUpError;

        // Update role if not Operator (trigger defaults to Operator)
        if (signUpData.user && formData.role !== 'Operator') {
          await supabase
            .from('user_profiles')
            .update({ role: formData.role, is_active: formData.is_active })
            .eq('id', signUpData.user.id);
        }

        // Log user creation
        await logAuditActionWithAlert(
          {
            action: 'user_created',
            actorId: user?.id,
            actorEmail: user?.email || '',
            actorRole: userRole || 'Admin',
            targetUserId: signUpData.user?.id,
            targetEmail: formData.email,
            details: { full_name: formData.full_name, role: formData.role },
          },
          []
        );
      }

      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', deleteConfirm.id);

      if (error) throw error;

      await logAuditActionWithAlert(
        {
          action: 'role_changed',
          actorId: user?.id,
          actorEmail: user?.email || '',
          actorRole: userRole || 'Admin',
          targetUserId: deleteConfirm.id,
          targetEmail: deleteConfirm.email,
          details: { action: 'user_deactivated', full_name: deleteConfirm.full_name },
        },
        []
      );

      setDeleteConfirm(null);
      fetchUsers();
    } catch (err: any) {
      setPageError(err?.message || 'Failed to deactivate user');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = users.filter((u) => {
    const matchSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'All' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    admins: users.filter((u) => u.role === 'Admin').length,
    managers: users.filter((u) => u.role === 'Manager').length,
    operators: users.filter((u) => u.role === 'Operator').length,
  };

  if (userRole && userRole !== 'Admin') return null;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--danger)' }}>
                Admin Only
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Create, edit, and manage system users and their roles</p>
          </div>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
            <AppIcon name="UserPlusIcon" size={16} />
            Add User
          </button>
        </div>

        {pageError && (
          <div className="flex items-center gap-3 p-4 rounded-lg text-sm" style={{ background: 'var(--danger)15', color: 'var(--danger)', border: '1px solid var(--danger)30' }}>
            <AppIcon name="ExclamationCircleIcon" size={16} />
            {pageError}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Users', value: stats.total, color: 'var(--foreground)' },
            { label: 'Active', value: stats.active, color: 'var(--success)' },
            { label: 'Admins', value: stats.admins, color: 'var(--danger)' },
            { label: 'Managers', value: stats.managers, color: 'var(--warning)' },
            { label: 'Operators', value: stats.operators, color: 'var(--primary)' },
          ].map((s) => (
            <div key={s.label} className="card p-4">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <AppIcon name="MagnifyingGlassIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full text-sm"
            />
          </div>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--secondary)' }}>
            {(['All', ...ROLES] as ('All' | UserRole)[]).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${roleFilter === r ? 'bg-card text-foreground' : 'text-muted-foreground'}`}
              >
                {r}
              </button>
            ))}
          </div>
          <button onClick={fetchUsers} className="btn-secondary flex items-center gap-1.5 text-sm">
            <AppIcon name="ArrowPathIcon" size={14} />
            Refresh
          </button>
        </div>

        {/* Users Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <AppIcon name="ArrowPathIcon" size={20} className="animate-spin" />
              <span className="text-sm">Loading users…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <AppIcon name="UsersIcon" size={40} />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                    {['User', 'Email', 'Role', 'Status', 'Created', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const rc = roleColors[u.role];
                    return (
                      <tr key={u.id} className="border-b hover:bg-secondary/30 transition-colors" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                            >
                              {u.full_name?.charAt(0)?.toUpperCase() || u.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">{u.full_name || '—'}</p>
                              <p className="text-xs text-muted-foreground">{u.id.slice(0, 8)}…</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: rc.bg, color: rc.color }}>
                            {roleIcons[u.role]} {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: u.is_active ? 'rgba(16,185,129,0.12)' : 'var(--secondary)', color: u.is_active ? 'var(--success)' : 'var(--muted-foreground)' }}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(u.created_at).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(u)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              title="Edit user"
                            >
                              <AppIcon name="PencilSquareIcon" size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(u)}
                              disabled={u.id === user?.id}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              title={u.id === user?.id ? 'Cannot deactivate yourself' : 'Deactivate user'}
                            >
                              <AppIcon name="UserMinusIcon" size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card w-full max-w-md p-6 space-y-5" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{editingUser ? 'Edit User' : 'Create New User'}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <AppIcon name="XMarkIcon" size={20} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--danger)15', color: 'var(--danger)' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Full Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))}
                  className="input w-full text-sm"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Email Address <span className="text-danger">*</span></label>
                <input
                  type="email"
                  required
                  disabled={!!editingUser}
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  className="input w-full text-sm disabled:opacity-60"
                  placeholder="user@example.com"
                />
                {editingUser && <p className="text-xs text-muted-foreground mt-1">Email cannot be changed after creation</p>}
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Password <span className="text-danger">*</span></label>
                  <input
                    type="password"
                    required={!editingUser}
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                    className="input w-full text-sm"
                    placeholder="Min. 6 characters"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Role <span className="text-danger">*</span></label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value as UserRole }))}
                  className="input w-full text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{roleIcons[r]} {r}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.role === 'Admin' && 'Full system access — all modules and actions'}
                  {formData.role === 'Manager' && 'Manage operations, view reports, limited admin access'}
                  {formData.role === 'Operator' && 'Day-to-day operations, no admin or financial access'}
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--secondary)' }}>
                <div>
                  <p className="text-sm font-medium text-foreground">Active Account</p>
                  <p className="text-xs text-muted-foreground">Inactive users cannot log in</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, is_active: !p.is_active }))}
                  className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200"
                  style={{ background: formData.is_active ? 'var(--primary)' : 'var(--border)' }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                    style={{ transform: formData.is_active ? 'translateX(22px)' : 'translateX(2px)' }}
                  />
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {submitting && <AppIcon name="ArrowPathIcon" size={14} className="animate-spin" />}
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--danger)15' }}>
                <AppIcon name="ExclamationTriangleIcon" size={20} style={{ color: 'var(--danger)' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Deactivate User</h3>
                <p className="text-xs text-muted-foreground">This will prevent the user from logging in</p>
              </div>
            </div>
            <p className="text-sm text-foreground">
              Deactivate <strong>{deleteConfirm.full_name || deleteConfirm.email}</strong>? Their data will be preserved but they will lose access.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1 text-sm">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1 text-sm px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: 'var(--danger)', color: '#fff' }}
              >
                {submitting && <AppIcon name="ArrowPathIcon" size={14} className="animate-spin" />}
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
