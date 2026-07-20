'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import { useLanguage } from '@/context/LanguageContext';
import { createClient } from '@/lib/supabase/client';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';

interface AuditLog {
  id: string;
  action: string;
  actor_email: string;
  actor_role: string;
  target_email: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const actionSeverity: Record<string, 'info' | 'warning' | 'critical'> = {
  user_created: 'info',
  role_changed: 'warning',
  password_reset: 'warning',
  login_success: 'info',
  login_failed: 'critical',
};

const actionLabel: Record<string, string> = {
  user_created: 'USER CREATED',
  role_changed: 'ROLE CHANGED',
  password_reset: 'PASSWORD RESET',
  login_success: 'LOGIN',
  login_failed: 'LOGIN FAILED',
};

const actionModule: Record<string, string> = {
  user_created: 'Auth',
  role_changed: 'Auth',
  password_reset: 'Auth',
  login_success: 'Auth',
  login_failed: 'Auth',
};

const severityConfig: Record<'info' | 'warning' | 'critical', { color: string; bg: string }> = {
  info: { color: 'var(--primary)', bg: 'rgba(99, 102, 241, 0.1)' },
  warning: { color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.1)' },
  critical: { color: 'var(--danger)', bg: 'rgba(239, 68, 68, 0.1)' },
};

const actionColors: Record<string, string> = {
  user_created: 'var(--success)',
  role_changed: 'var(--warning)',
  password_reset: 'var(--warning)',
  login_success: 'var(--primary)',
  login_failed: 'var(--danger)',
};

function formatDetails(action: string, details: Record<string, unknown>, targetEmail: string | null): string {
  switch (action) {
    case 'user_created':
      return `New user registered: ${targetEmail || ''}${details.full_name ? ` (${details.full_name})` : ''}`;
    case 'role_changed':
      return `Role changed from ${details.old_role || '—'} to ${details.new_role || '—'} for ${targetEmail || ''}`;
    case 'password_reset':
      return `Password changed for ${targetEmail || ''}`;
    case 'login_success':
      return `Successful login for ${targetEmail || ''}`;
    case 'login_failed':
      return `Failed login attempt for ${targetEmail || ''}${details.reason ? ` — ${details.reason}` : ''}`;
    default:
      return JSON.stringify(details);
  }
}

export default function AuditPage() {
  const { t } = useLanguage();
  const supabase = createClient();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('id, action, actor_email, actor_role, target_email, details, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && data) {
        setLogs(data as AuditLog[]);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const actions = ['All', ...Array.from(new Set(logs.map((l) => l.action)))];

  const filtered = logs.filter((log) => {
    const severity = actionSeverity[log.action] || 'info';
    const details = formatDetails(log.action, log.details || {}, log.target_email);
    const matchSearch =
      log.actor_email.toLowerCase().includes(search.toLowerCase()) ||
      details.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase());
    const matchSeverity = severityFilter === 'all' || severity === severityFilter;
    const matchAction = actionFilter === 'All' || log.action === actionFilter;
    const logDate = new Date(log.created_at);
    const matchFrom = !dateFrom || logDate >= new Date(dateFrom);
    const matchTo = !dateTo || logDate <= new Date(dateTo + 'T23:59:59');
    return matchSearch && matchSeverity && matchAction && matchFrom && matchTo;
  });

  const stats = {
    total: logs.length,
    info: logs.filter((l) => (actionSeverity[l.action] || 'info') === 'info').length,
    warning: logs.filter((l) => (actionSeverity[l.action] || 'info') === 'warning').length,
    critical: logs.filter((l) => (actionSeverity[l.action] || 'info') === 'critical').length,
  };

  const EXPORT_HEADERS = ['Timestamp', 'Actor', 'Role', 'Action', 'Module', 'Details', 'Target', 'Severity'];

  const buildExportRows = () =>
    filtered.map((log) => {
      const severity = actionSeverity[log.action] || 'info';
      const details = formatDetails(log.action, log.details || {}, log.target_email);
      const label = actionLabel[log.action] || log.action.toUpperCase();
      const module = actionModule[log.action] || 'System';
      return [
        new Date(log.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' }),
        log.actor_email || '—',
        log.actor_role || '—',
        label,
        module,
        details,
        log.target_email || '—',
        severity,
      ];
    });

  const handleExcelExport = () => {
    setExporting('excel');
    try {
      const rows = buildExportRows();
      const period = dateFrom || dateTo ? `${dateFrom || 'start'} to ${dateTo || 'now'}` : 'All time';
      exportToCSV(`audit-logs-${period}`, EXPORT_HEADERS, [], rows);
    } finally {
      setExporting(null);
    }
  };

  const handlePDFExport = async () => {
    setExporting('pdf');
    try {
      const rows = buildExportRows();
      const period = dateFrom || dateTo ? `${dateFrom || 'start'} to ${dateTo || 'now'}` : 'All time';
      await exportToPDF({
        title: 'Audit Logs Report',
        subtitle: `Filtered: ${filtered.length} events | Severity: ${severityFilter} | Action: ${actionFilter}`,
        period,
        headers: EXPORT_HEADERS,
        rows,
        filename: `audit-logs-${period}`,
        summaryRows: [
          { label: 'Total Events', value: String(filtered.length) },
          { label: 'Info', value: String(filtered.filter((l) => (actionSeverity[l.action] || 'info') === 'info').length) },
          { label: 'Warnings', value: String(filtered.filter((l) => (actionSeverity[l.action] || 'info') === 'warning').length) },
          { label: 'Critical', value: String(filtered.filter((l) => (actionSeverity[l.action] || 'info') === 'critical').length) },
        ],
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t.audit_title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t.audit_subtitle}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExcelExport}
              disabled={exporting !== null || filtered.length === 0}
              className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {exporting === 'excel' ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <AppIcon name="TableCellsIcon" size={15} />
              )}
              Export Excel
            </button>
            <button
              onClick={handlePDFExport}
              disabled={exporting !== null || filtered.length === 0}
              className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {exporting === 'pdf' ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <AppIcon name="DocumentArrowDownIcon" size={15} />
              )}
              Export PDF
            </button>
            <button onClick={fetchLogs} className="btn-secondary flex items-center gap-2 text-sm">
              <AppIcon name="ArrowPathIcon" size={16} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Events', value: stats.total, icon: 'ClipboardDocumentListIcon', color: 'var(--primary)' },
            { label: 'Info', value: stats.info, icon: 'InformationCircleIcon', color: 'var(--primary)' },
            { label: 'Warnings', value: stats.warning, icon: 'ExclamationTriangleIcon', color: 'var(--warning)' },
            { label: 'Critical', value: stats.critical, icon: 'ShieldExclamationIcon', color: 'var(--danger)' },
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
            <input type="text" placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9 w-full text-sm" />
          </div>
          {/* Date range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input text-sm w-36"
              title="From date"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input text-sm w-36"
              title="To date"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                title="Clear date range"
              >
                <AppIcon name="XMarkIcon" size={14} />
              </button>
            )}
          </div>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--secondary)' }}>
            {['all', 'info', 'warning', 'critical'].map((s) => (
              <button key={s} onClick={() => setSeverityFilter(s)} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize ${severityFilter === s ? 'bg-card text-foreground' : 'text-muted-foreground'}`}>{s}</button>
            ))}
          </div>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="input text-sm min-w-[140px]">
            {actions.map((a) => <option key={a}>{a}</option>)}
          </select>
          {filtered.length !== logs.length && (
            <span className="text-xs text-muted-foreground">{filtered.length} of {logs.length} events</span>
          )}
        </div>

        {/* Audit Log Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <AppIcon name="ArrowPathIcon" size={20} className="animate-spin" />
              <span className="text-sm">Loading audit logs...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <AppIcon name="ClipboardDocumentListIcon" size={40} />
              <p className="text-sm">No audit logs found</p>
              <p className="text-xs">Admin actions will appear here once they occur</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                    {['Timestamp', 'Actor', 'Role', 'Action', 'Module', 'Details', 'Target', 'Severity'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => {
                    const severity = actionSeverity[log.action] || 'info';
                    const details = formatDetails(log.action, log.details || {}, log.target_email);
                    const label = actionLabel[log.action] || log.action.toUpperCase();
                    const module = actionModule[log.action] || 'System';
                    const color = actionColors[log.action] || 'var(--muted-foreground)';
                    return (
                      <tr key={log.id} className="border-b hover:bg-secondary/30 transition-colors" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' })}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-foreground whitespace-nowrap">{log.actor_email || '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{log.actor_role || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: `${color}20`, color }}>
                            {label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{module}</td>
                        <td className="px-4 py-3 text-xs text-foreground max-w-xs truncate">{details}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{log.target_email || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize" style={{ background: severityConfig[severity].bg, color: severityConfig[severity].color }}>
                            {severity}
                          </span>
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
    </AppLayout>
  );
}
