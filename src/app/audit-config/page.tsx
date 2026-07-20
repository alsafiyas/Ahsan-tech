'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface AuditRules {
  track_login_success: boolean;
  track_login_failed: boolean;
  track_user_created: boolean;
  track_role_changed: boolean;
  track_password_reset: boolean;
}

interface EmailNotifications {
  enabled: boolean;
  notify_on_login_failed: boolean;
  notify_on_role_changed: boolean;
  notify_on_user_created: boolean;
  notify_on_password_reset: boolean;
  admin_emails: string[];
}

interface RetentionPolicy {
  retention_days: number;
  auto_purge_enabled: boolean;
  purge_frequency: string;
  archive_before_purge: boolean;
}

const defaultAuditRules: AuditRules = {
  track_login_success: true,
  track_login_failed: true,
  track_user_created: true,
  track_role_changed: true,
  track_password_reset: true,
};

const defaultEmailNotifications: EmailNotifications = {
  enabled: true,
  notify_on_login_failed: true,
  notify_on_role_changed: true,
  notify_on_user_created: true,
  notify_on_password_reset: false,
  admin_emails: [],
};

const defaultRetentionPolicy: RetentionPolicy = {
  retention_days: 90,
  auto_purge_enabled: false,
  purge_frequency: 'monthly',
  archive_before_purge: true,
};

export default function AuditConfigPage() {
  const { userRole, user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'rules' | 'notifications' | 'retention'>('rules');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [auditRules, setAuditRules] = useState<AuditRules>(defaultAuditRules);
  const [emailNotifications, setEmailNotifications] = useState<EmailNotifications>(defaultEmailNotifications);
  const [retentionPolicy, setRetentionPolicy] = useState<RetentionPolicy>(defaultRetentionPolicy);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  useEffect(() => {
    if (userRole && userRole !== 'Admin') {
      router.replace('/dashboard');
    }
  }, [userRole, router]);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('audit_config')
        .select('config_key, config_value');

      if (fetchError) throw fetchError;

      if (data) {
        for (const row of data) {
          if (row.config_key === 'audit_rules') {
            setAuditRules({ ...defaultAuditRules, ...(row.config_value as AuditRules) });
          } else if (row.config_key === 'email_notifications') {
            setEmailNotifications({ ...defaultEmailNotifications, ...(row.config_value as EmailNotifications) });
          } else if (row.config_key === 'retention_policy') {
            setRetentionPolicy({ ...defaultRetentionPolicy, ...(row.config_value as RetentionPolicy) });
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const saveConfig = async (key: string, value: object) => {
    setSaving(true);
    setError(null);
    try {
      const { error: upsertError } = await supabase
        .from('audit_config')
        .upsert(
          { config_key: key, config_value: value, updated_by: user?.id, updated_at: new Date().toISOString() },
          { onConflict: 'config_key' }
        );
      if (upsertError) throw upsertError;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (activeTab === 'rules') saveConfig('audit_rules', auditRules);
    else if (activeTab === 'notifications') saveConfig('email_notifications', emailNotifications);
    else saveConfig('retention_policy', retentionPolicy);
  };

  const addAdminEmail = () => {
    const trimmed = newAdminEmail.trim();
    if (!trimmed || !trimmed.includes('@')) return;
    if (emailNotifications.admin_emails.includes(trimmed)) return;
    setEmailNotifications((prev) => ({ ...prev, admin_emails: [...prev.admin_emails, trimmed] }));
    setNewAdminEmail('');
  };

  const removeAdminEmail = (email: string) => {
    setEmailNotifications((prev) => ({ ...prev, admin_emails: prev.admin_emails.filter((e) => e !== email) }));
  };

  const tabs = [
    { key: 'rules' as const, label: 'Audit Rules', icon: 'ShieldCheckIcon' },
    { key: 'notifications' as const, label: 'Email Notifications', icon: 'EnvelopeIcon' },
    { key: 'retention' as const, label: 'Retention Policy', icon: 'ArchiveBoxIcon' },
  ];

  if (userRole && userRole !== 'Admin') return null;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: 'var(--danger)20', color: 'var(--danger)' }}>
                Admin Only
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Audit Configuration</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage audit rules, email alerts, and log retention policies</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60"
            style={saved ? { background: 'var(--success)' } : {}}
          >
            <AppIcon name={saved ? 'CheckIcon' : saving ? 'ArrowPathIcon' : 'CloudArrowUpIcon'} size={16} className={saving ? 'animate-spin' : ''} />
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg text-sm" style={{ background: 'var(--danger)15', color: 'var(--danger)', border: '1px solid var(--danger)30' }}>
            <AppIcon name="ExclamationCircleIcon" size={16} />
            {error}
          </div>
        )}

        <div className="flex gap-6">
          {/* Sidebar Tabs */}
          <div className="w-52 flex-shrink-0">
            <div className="card p-2 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${activeTab === tab.key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                >
                  <AppIcon name={tab.icon as any} size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="card p-12 flex items-center justify-center gap-3 text-muted-foreground">
                <AppIcon name="ArrowPathIcon" size={20} className="animate-spin" />
                <span className="text-sm">Loading configuration…</span>
              </div>
            ) : (
              <>
                {/* Audit Rules */}
                {activeTab === 'rules' && (
                  <div className="card p-6 space-y-5">
                    <div>
                      <h3 className="font-semibold text-foreground">Audit Event Rules</h3>
                      <p className="text-xs text-muted-foreground mt-1">Choose which admin actions are recorded in the audit log</p>
                    </div>
                    <div className="space-y-3">
                      {([
                        { key: 'track_login_success', label: 'Successful Logins', desc: 'Record every successful authentication event', severity: 'info' },
                        { key: 'track_login_failed', label: 'Failed Login Attempts', desc: 'Record failed authentication attempts (recommended)', severity: 'critical' },
                        { key: 'track_user_created', label: 'User Creation', desc: 'Record when new user accounts are created', severity: 'warning' },
                        { key: 'track_role_changed', label: 'Role Changes', desc: 'Record when user roles are modified by admins', severity: 'critical' },
                        { key: 'track_password_reset', label: 'Password Resets', desc: 'Record password reset and change events', severity: 'warning' },
                      ] as { key: keyof AuditRules; label: string; desc: string; severity: string }[]).map((rule) => {
                        const severityColors: Record<string, string> = { info: 'var(--primary)', warning: 'var(--warning)', critical: 'var(--danger)' };
                        const color = severityColors[rule.severity] || 'var(--muted-foreground)';
                        return (
                          <div key={rule.key} className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'var(--secondary)' }}>
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                              <div>
                                <p className="text-sm font-medium text-foreground">{rule.label}</p>
                                <p className="text-xs text-muted-foreground">{rule.desc}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setAuditRules((prev) => ({ ...prev, [rule.key]: !prev[rule.key] }))}
                              className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200"
                              style={{ background: auditRules[rule.key] ? 'var(--primary)' : 'var(--border)' }}
                            >
                              <span
                                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                                style={{ transform: auditRules[rule.key] ? 'translateX(22px)' : 'translateX(2px)' }}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Email Notifications */}
                {activeTab === 'notifications' && (
                  <div className="card p-6 space-y-5">
                    <div>
                      <h3 className="font-semibold text-foreground">Email Notification Preferences</h3>
                      <p className="text-xs text-muted-foreground mt-1">Configure which critical events trigger admin email alerts via Resend</p>
                    </div>

                    {/* Master toggle */}
                    <div className="flex items-center justify-between p-4 rounded-lg border" style={{ borderColor: 'var(--border)', background: emailNotifications.enabled ? 'var(--primary)08' : 'var(--secondary)' }}>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Email Alerts Enabled</p>
                        <p className="text-xs text-muted-foreground">Master switch for all admin email notifications</p>
                      </div>
                      <button
                        onClick={() => setEmailNotifications((prev) => ({ ...prev, enabled: !prev.enabled }))}
                        className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200"
                        style={{ background: emailNotifications.enabled ? 'var(--primary)' : 'var(--border)' }}
                      >
                        <span
                          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                          style={{ transform: emailNotifications.enabled ? 'translateX(22px)' : 'translateX(2px)' }}
                        />
                      </button>
                    </div>

                    {/* Per-event toggles */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notify on Events</p>
                      {([
                        { key: 'notify_on_login_failed', label: 'Failed Login Attempts', desc: 'Alert when someone fails to log in' },
                        { key: 'notify_on_role_changed', label: 'Role Changes', desc: 'Alert when a user role is modified' },
                        { key: 'notify_on_user_created', label: 'New User Created', desc: 'Alert when a new account is registered' },
                        { key: 'notify_on_password_reset', label: 'Password Resets', desc: 'Alert when a password is changed or reset' },
                      ] as { key: keyof EmailNotifications; label: string; desc: string }[]).map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--secondary)', opacity: emailNotifications.enabled ? 1 : 0.5 }}>
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                          <button
                            disabled={!emailNotifications.enabled}
                            onClick={() => setEmailNotifications((prev) => ({ ...prev, [item.key]: !(prev[item.key as keyof EmailNotifications] as boolean) }))}
                            className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 disabled:cursor-not-allowed"
                            style={{ background: (emailNotifications[item.key as keyof EmailNotifications] as boolean) && emailNotifications.enabled ? 'var(--primary)' : 'var(--border)' }}
                          >
                            <span
                              className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                              style={{ transform: (emailNotifications[item.key as keyof EmailNotifications] as boolean) ? 'translateX(22px)' : 'translateX(2px)' }}
                            />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Admin email list */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin Alert Recipients</p>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder="admin@example.com"
                          value={newAdminEmail}
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addAdminEmail()}
                          className="input flex-1 text-sm"
                        />
                        <button onClick={addAdminEmail} className="btn-primary text-sm px-4">Add</button>
                      </div>
                      {emailNotifications.admin_emails.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No recipients added. Alerts will not be sent.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {emailNotifications.admin_emails.map((email) => (
                            <div key={email} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--secondary)' }}>
                              <div className="flex items-center gap-2">
                                <AppIcon name="EnvelopeIcon" size={14} className="text-muted-foreground" />
                                <span className="text-sm text-foreground">{email}</span>
                              </div>
                              <button onClick={() => removeAdminEmail(email)} className="text-muted-foreground hover:text-danger transition-colors">
                                <AppIcon name="XMarkIcon" size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Retention Policy */}
                {activeTab === 'retention' && (
                  <div className="card p-6 space-y-5">
                    <div>
                      <h3 className="font-semibold text-foreground">Log Retention Policy</h3>
                      <p className="text-xs text-muted-foreground mt-1">Define how long audit logs are kept and when they are purged</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs text-muted-foreground mb-1.5">Retention Period (days)</label>
                        <input
                          type="number"
                          min={7}
                          max={3650}
                          value={retentionPolicy.retention_days}
                          onChange={(e) => setRetentionPolicy((prev) => ({ ...prev, retention_days: Number(e.target.value) }))}
                          className="input w-full text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Logs older than this will be eligible for purge</p>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs text-muted-foreground mb-1.5">Purge Frequency</label>
                        <select
                          value={retentionPolicy.purge_frequency}
                          onChange={(e) => setRetentionPolicy((prev) => ({ ...prev, purge_frequency: e.target.value }))}
                          className="input w-full text-sm"
                          disabled={!retentionPolicy.auto_purge_enabled}
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {([
                        { key: 'auto_purge_enabled', label: 'Automatic Purge', desc: 'Automatically delete logs older than the retention period' },
                        { key: 'archive_before_purge', label: 'Archive Before Purge', desc: 'Export logs to archive before deleting them' },
                      ] as { key: keyof RetentionPolicy; label: string; desc: string }[]).map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'var(--secondary)' }}>
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                          <button
                            onClick={() => setRetentionPolicy((prev) => ({ ...prev, [item.key]: !(prev[item.key as keyof RetentionPolicy] as boolean) }))}
                            className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200"
                            style={{ background: (retentionPolicy[item.key as keyof RetentionPolicy] as boolean) ? 'var(--primary)' : 'var(--border)' }}
                          >
                            <span
                              className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                              style={{ transform: (retentionPolicy[item.key as keyof RetentionPolicy] as boolean) ? 'translateX(22px)' : 'translateX(2px)' }}
                            />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Summary card */}
                    <div className="p-4 rounded-lg" style={{ background: 'var(--primary)08', border: '1px solid var(--primary)20' }}>
                      <p className="text-xs font-semibold text-primary mb-2">Current Policy Summary</p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        <li>• Logs retained for <strong className="text-foreground">{retentionPolicy.retention_days} days</strong></li>
                        <li>• Auto-purge: <strong className="text-foreground">{retentionPolicy.auto_purge_enabled ? `Enabled (${retentionPolicy.purge_frequency})` : 'Disabled'}</strong></li>
                        <li>• Archive before purge: <strong className="text-foreground">{retentionPolicy.archive_before_purge ? 'Yes' : 'No'}</strong></li>
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
