'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import { useLanguage } from '@/context/LanguageContext';
import { createClient } from '@/lib/supabase/client';

interface AttendanceRow {
  id: string;
  employee_id: string | null;
  attendance_date: string;
  attendance_status: 'present' | 'late' | 'absent' | 'on_leave';
  check_in_time: string | null;
  created_at: string;
  employees?: {
    full_name: string;
    position: string;
    branch: string;
  } | null;
}

const statusConfig: Record<AttendanceRow['attendance_status'], { label: string; color: string }> = {
  present: { label: 'Present', color: 'var(--success)' },
  absent: { label: 'Absent', color: 'var(--danger)' },
  late: { label: 'Late', color: 'var(--warning)' },
  on_leave: { label: 'On Leave', color: 'var(--primary)' },
};

export default function AttendancePage() {
  const { t } = useLanguage();
  const supabase = createClient();

  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('attendance')
        .select('*, employees(full_name, position, branch)')
        .eq('attendance_date', selectedDate)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setRecords((data as AttendanceRow[]) || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const filtered = records.filter((r) => {
    const name = r.employees?.full_name?.toLowerCase() || '';
    const branch = r.employees?.branch?.toLowerCase() || '';
    const q = search.toLowerCase();
    return !q || name.includes(q) || branch.includes(q);
  });

  const stats = {
    present: records.filter((r) => r.attendance_status === 'present').length,
    late: records.filter((r) => r.attendance_status === 'late').length,
    absent: records.filter((r) => r.attendance_status === 'absent').length,
    onLeave: records.filter((r) => r.attendance_status === 'on_leave').length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t.attendance_title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t.attendance_subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input text-sm"
            />
            <button className="btn-secondary flex items-center gap-2 text-sm">
              <AppIcon name="ArrowDownTrayIcon" size={16} />
              Export
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
            { label: t.attendance_present, value: stats.present, icon: 'CheckCircleIcon', color: 'var(--success)' },
            { label: t.attendance_late, value: stats.late, icon: 'ClockIcon', color: 'var(--warning)' },
            { label: t.attendance_absent, value: stats.absent, icon: 'XCircleIcon', color: 'var(--danger)' },
            { label: 'On Leave', value: stats.onLeave, icon: 'CalendarIcon', color: 'var(--primary)' },
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

        {/* Search */}
        <div className="card p-4">
          <div className="relative max-w-sm">
            <AppIcon name="MagnifyingGlassIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9 w-full text-sm" />
          </div>
        </div>

        {/* Attendance Table */}
        {loading ? (
          <div className="card p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">Loading attendance...</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                    {['Employee', 'Branch', 'Check In', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((rec) => (
                    <tr key={rec.id} className="border-b hover:bg-secondary/30 transition-colors" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground text-xs">{rec.employees?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{rec.employees?.position || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{rec.employees?.branch || '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono text-foreground">{rec.check_in_time || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${statusConfig[rec.attendance_status].color}20`, color: statusConfig[rec.attendance_status].color }}>
                          {statusConfig[rec.attendance_status].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        No attendance records for {selectedDate}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
