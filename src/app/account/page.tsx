'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { logAuditAction } from '@/lib/auditLogger';
import { sendAccountChangeEmail } from '@/lib/emailService';

const rolePermissions: Record<string, { module: string; view: boolean; create: boolean; edit: boolean; delete: boolean }[]> = {
  Admin: [
    { module: 'Dashboard', view: true, create: true, edit: true, delete: true },
    { module: 'CRM', view: true, create: true, edit: true, delete: true },
    { module: 'Sales', view: true, create: true, edit: true, delete: true },
    { module: 'Warehouse', view: true, create: true, edit: true, delete: true },
    { module: 'Finance', view: true, create: true, edit: true, delete: true },
    { module: 'Employees', view: true, create: true, edit: true, delete: true },
    { module: 'Settings', view: true, create: true, edit: true, delete: true },
  ],
  Manager: [
    { module: 'Dashboard', view: true, create: false, edit: false, delete: false },
    { module: 'CRM', view: true, create: true, edit: true, delete: false },
    { module: 'Sales', view: true, create: true, edit: true, delete: false },
    { module: 'Warehouse', view: true, create: false, edit: false, delete: false },
    { module: 'Finance', view: true, create: false, edit: false, delete: false },
    { module: 'Employees', view: true, create: false, edit: false, delete: false },
    { module: 'Settings', view: false, create: false, edit: false, delete: false },
  ],
  Operator: [
    { module: 'Dashboard', view: false, create: false, edit: false, delete: false },
    { module: 'CRM', view: true, create: false, edit: false, delete: false },
    { module: 'Sales', view: true, create: true, edit: false, delete: false },
    { module: 'Warehouse', view: true, create: false, edit: false, delete: false },
    { module: 'Finance', view: false, create: false, edit: false, delete: false },
    { module: 'Employees', view: false, create: false, edit: false, delete: false },
    { module: 'Settings', view: false, create: false, edit: false, delete: false },
  ],
};

const roleColors: Record<string, string> = {
  Admin: 'bg-danger/10 text-danger border-danger/20',
  Manager: 'bg-primary/10 text-primary border-primary/20',
  Operator: 'bg-success/10 text-success border-success/20',
};

const roleEmoji: Record<string, string> = {
  Admin: '👑',
  Manager: '👔',
  Operator: '🔧',
};

export default function AccountPage() {
  const { user, userRole } = useAuth();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'permissions'>('profile');

  // Profile state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      setProfileLoading(true);
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .maybeSingle();
        if (data) {
          setFullName(data.full_name || '');
          setEmail(data.email || user.email || '');
        } else {
          setFullName(user.user_metadata?.full_name || '');
          setEmail(user.email || '');
        }
      } catch {
        setFullName(user.user_metadata?.full_name || '');
        setEmail(user.email || '');
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  const handleProfileSave = async () => {
    if (!user) return;
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      // Update auth email if changed
      if (email !== user.email) {
        const { error: emailErr } = await supabase.auth.updateUser({ email });
        if (emailErr) throw emailErr;
      }
      // Update display name in auth metadata
      await supabase.auth.updateUser({ data: { full_name: fullName } });
      // Update user_profiles table
      const { error: profileErr } = await supabase
        .from('user_profiles')
        .update({ full_name: fullName, email, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (profileErr) throw profileErr;
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err?.message || 'Failed to update profile.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Please fill in all password fields.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    setPasswordSaving(true);
    setPasswordMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Log password reset action
      await logAuditAction({
        action: 'password_reset',
        actorId: user?.id,
        actorEmail: user?.email || email,
        actorRole: userRole || '',
        targetUserId: user?.id,
        targetEmail: user?.email || email,
        details: { initiated_by: 'account_page' },
      });
      // Send account change notification email
      sendAccountChangeEmail(
        user?.email || email,
        fullName || 'User',
        'Your account password was changed successfully.'
      ).catch(() => {});
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err?.message || 'Failed to change password.' });
    } finally {
      setPasswordSaving(false);
    }
  };

  const permissions = rolePermissions[userRole || 'Operator'] || rolePermissions['Operator'];
  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : (email?.[0] || 'U').toUpperCase();

  const tabs = [
    { key: 'profile', label: 'Profile', icon: 'UserIcon' },
    { key: 'security', label: 'Security', icon: 'LockClosedIcon' },
    { key: 'permissions', label: 'Role & Permissions', icon: 'ShieldCheckIcon' },
  ] as const;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {profileLoading ? 'Loading...' : fullName || 'My Account'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">{email}</span>
              {userRole && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${roleColors[userRole] || 'bg-secondary text-foreground border-border'}`}>
                  {roleEmoji[userRole] || '👤'} {userRole}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--secondary)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                activeTab === tab.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <AppIcon name={tab.icon as any} size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="card p-6 space-y-5">
            <h3 className="font-semibold text-foreground">Personal Information</h3>
            {profileLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--secondary)' }} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="input w-full text-sm"
                  />
                  {email !== user?.email && (
                    <p className="text-xs text-warning mt-1">⚠ A confirmation email will be sent to verify the new address.</p>
                  )}
                </div>

                {profileMsg && (
                  <div
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
                      profileMsg.type === 'success' ?'bg-success/10 text-success border border-success/20' :'bg-danger/10 text-danger border border-danger/20'
                    }`}
                  >
                    <AppIcon name={profileMsg.type === 'success' ? 'CheckCircleIcon' : 'ExclamationCircleIcon'} size={16} />
                    {profileMsg.text}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleProfileSave}
                    disabled={profileSaving}
                    className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60"
                  >
                    {profileSaving ? (
                      <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    ) : (
                      <AppIcon name="CheckIcon" size={16} />
                    )}
                    {profileSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="card p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-foreground">Change Password</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Use a strong password with at least 8 characters.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="input w-full text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <AppIcon name={showCurrent ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="input w-full text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <AppIcon name={showNew ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
                  </button>
                </div>
                {newPassword && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full transition-all"
                          style={{
                            background:
                              newPassword.length >= i * 3
                                ? newPassword.length >= 12
                                  ? 'var(--success)'
                                  : newPassword.length >= 8
                                  ? 'var(--warning)'
                                  : 'var(--danger)' :'var(--border)',
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {newPassword.length >= 12 ? 'Strong' : newPassword.length >= 8 ? 'Medium' : 'Weak'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="input w-full text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <AppIcon name={showConfirm ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-danger mt-1">Passwords do not match.</p>
                )}
              </div>

              {passwordMsg && (
                <div
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
                    passwordMsg.type === 'success' ?'bg-success/10 text-success border border-success/20' :'bg-danger/10 text-danger border border-danger/20'
                  }`}
                >
                  <AppIcon name={passwordMsg.type === 'success' ? 'CheckCircleIcon' : 'ExclamationCircleIcon'} size={16} />
                  {passwordMsg.text}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={handlePasswordChange}
                  disabled={passwordSaving}
                  className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60"
                >
                  {passwordSaving ? (
                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <AppIcon name="LockClosedIcon" size={16} />
                  )}
                  {passwordSaving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <div className="space-y-4">
            {/* Role Card */}
            <div className="card p-5">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: 'var(--secondary)' }}
                >
                  {roleEmoji[userRole || 'Operator'] || '👤'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{userRole || 'Operator'}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${roleColors[userRole || 'Operator'] || 'bg-secondary text-foreground border-border'}`}>
                      Assigned Role
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {userRole === 'Admin' ?'Full system access — all modules and actions'
                      : userRole === 'Manager' ?'Manage operations, CRM, sales, and view reports' :'Handle sales orders and view assigned modules'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Contact your Admin</p>
                  <p className="text-xs text-muted-foreground">to change your role</p>
                </div>
              </div>
            </div>

            {/* Permissions Table */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <h3 className="font-semibold text-foreground text-sm">Module Permissions</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Your access rights across system modules</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--secondary)' }}>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Module</th>
                      {['View', 'Create', 'Edit', 'Delete'].map((h) => (
                        <th key={h} className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((perm) => (
                      <tr key={perm.module} className="border-b hover:bg-secondary/30 transition-colors" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-5 py-3 text-xs font-medium text-foreground">{perm.module}</td>
                        {(['view', 'create', 'edit', 'delete'] as const).map((p) => (
                          <td key={p} className="px-4 py-3 text-center">
                            {perm[p] ? (
                              <div className="flex justify-center">
                                <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)' }}>
                                  <AppIcon name="CheckIcon" size={11} style={{ color: 'var(--success)' }} />
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-center">
                                <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
                                  <AppIcon name="XMarkIcon" size={11} style={{ color: 'var(--danger)' }} />
                                </div>
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
