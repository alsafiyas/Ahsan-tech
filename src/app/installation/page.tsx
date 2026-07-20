'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import { useLanguage } from '@/context/LanguageContext';
import { createClient } from '@/lib/supabase/client';

type InstallationStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

interface Installation {
  id: string;
  customer: string;
  address: string;
  installation_status: InstallationStatus;
  installation_date: string;
  branch: string;
  created_at: string;
  updated_at: string;
}

interface InstallationFormData {
  customer: string;
  address: string;
  installation_date: string;
  branch: string;
  installation_status: InstallationStatus;
}

const statusConfig: Record<InstallationStatus, { label: string; color: string }> = {
  pending: { label: 'Scheduled', color: 'var(--primary)' },
  in_progress: { label: 'In Progress', color: 'var(--warning)' },
  completed: { label: 'Completed', color: 'var(--success)' },
  cancelled: { label: 'Cancelled', color: 'var(--danger)' },
};

const STATUS_FLOW: Record<InstallationStatus, InstallationStatus | null> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: null,
  cancelled: null,
};

const emptyForm = (): InstallationFormData => ({
  customer: '', address: '', installation_date: new Date().toISOString().split('T')[0],
  branch: 'Namangan', installation_status: 'pending',
});

export default function InstallationPage() {
  const { t } = useLanguage();
  const supabase = createClient();

  const [installations, setInstallations] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Installation | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewTask, setShowNewTask] = useState(false);
  const [formData, setFormData] = useState<InstallationFormData>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const fetchInstallations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('installations')
        .select('*')
        .order('installation_date', { ascending: false });
      if (err) throw err;
      setInstallations((data as Installation[]) || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load installations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstallations();
    const channel = supabase
      .channel('installations_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'installations' }, () => {
        fetchInstallations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchInstallations]);

  const filtered = installations.filter((i) => statusFilter === 'all' || i.installation_status === statusFilter);

  const stats = {
    total: installations.length,
    scheduled: installations.filter((i) => i.installation_status === 'pending').length,
    inProgress: installations.filter((i) => i.installation_status === 'in_progress').length,
    completed: installations.filter((i) => i.installation_status === 'completed').length,
  };

  const advanceStatus = async (inst: Installation) => {
    const next = STATUS_FLOW[inst.installation_status];
    if (!next) return;
    setStatusUpdating(inst.id);
    try {
      const { error: err } = await supabase
        .from('installations')
        .update({ installation_status: next, updated_at: new Date().toISOString() })
        .eq('id', inst.id);
      if (err) throw err;
      fetchInstallations();
      setSelectedTask(null);
    } catch (e: any) {
      setError(e?.message || 'Status update failed');
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleSubmit = async () => {
    if (!formData.customer.trim() || !formData.address.trim()) {
      setFormError('Customer and address are required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const { error: err } = await supabase.from('installations').insert({
        customer: formData.customer.trim(),
        address: formData.address.trim(),
        installation_date: formData.installation_date,
        branch: formData.branch,
        installation_status: formData.installation_status,
      });
      if (err) throw err;
      setShowNewTask(false);
      setFormData(emptyForm());
      fetchInstallations();
    } catch (e: any) {
      setFormError(e?.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t.installation_title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t.installation_subtitle}</p>
          </div>
          <button onClick={() => { setFormData(emptyForm()); setFormError(null); setShowNewTask(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <AppIcon name="PlusIcon" size={16} />
            {t.installation_add_job}
          </button>
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
            { label: t.installation_total_jobs, value: stats.total, icon: 'MapPinIcon', color: 'var(--primary)' },
            { label: t.installation_scheduled, value: stats.scheduled, icon: 'CalendarIcon', color: 'var(--primary)' },
            { label: t.installation_in_progress, value: stats.inProgress, icon: 'WrenchScrewdriverIcon', color: 'var(--warning)' },
            { label: t.installation_completed, value: stats.completed, icon: 'CheckCircleIcon', color: 'var(--success)' },
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

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'in_progress', 'completed', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'btn-secondary'}`}
            >
              {s === 'all' ? 'All Tasks' : statusConfig[s]?.label ?? s}
            </button>
          ))}
        </div>

        {/* Tasks List */}
        {loading ? (
          <div className="card p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">Loading installations...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <AppIcon name="MapPinIcon" size={40} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-foreground font-medium">No installation tasks found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((task) => {
              const sc = statusConfig[task.installation_status];
              const nextStatus = STATUS_FLOW[task.installation_status];
              return (
                <div
                  key={task.id}
                  className="card p-5 cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${sc.color}20` }}>
                        <AppIcon name="MapPinIcon" size={18} style={{ color: sc.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${sc.color}20`, color: sc.color }}>
                            {sc.label}
                          </span>
                        </div>
                        <p className="font-semibold text-foreground text-sm">{task.customer}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{task.address}</p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <AppIcon name="MapPinIcon" size={11} />
                          {task.branch}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      <p className="text-sm font-semibold text-foreground">{task.installation_date}</p>
                      {nextStatus && (
                        <button
                          onClick={(e) => { e.stopPropagation(); advanceStatus(task); }}
                          disabled={statusUpdating === task.id}
                          className="text-xs px-2 py-1 rounded-lg btn-secondary flex items-center gap-1 ml-auto"
                        >
                          {statusUpdating === task.id ? (
                            <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <AppIcon name="ArrowRightIcon" size={12} />
                          )}
                          {statusConfig[nextStatus].label}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTask(null)}>
          <div className="card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{selectedTask.customer}</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${statusConfig[selectedTask.installation_status].color}20`, color: statusConfig[selectedTask.installation_status].color }}>
                  {statusConfig[selectedTask.installation_status].label}
                </span>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground"><AppIcon name="XMarkIcon" size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2"><p className="text-xs text-muted-foreground">Address</p><p className="font-medium text-foreground">{selectedTask.address}</p></div>
              <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium text-foreground">{selectedTask.installation_date}</p></div>
              <div><p className="text-xs text-muted-foreground">Branch</p><p className="font-medium text-foreground">{selectedTask.branch}</p></div>
            </div>

            {/* Google Maps: directions from Namangan office to installation address */}
            <div className="rounded-lg overflow-hidden border border-border">
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground" style={{ background: 'var(--secondary)' }}>
                <AppIcon name="MapPinIcon" size={13} style={{ color: 'var(--primary)' }} />
                <span className="font-medium text-foreground">Ish joyi yo&apos;nalishi</span>
                <span className="ml-auto text-muted-foreground">Namangan ishxonasidan</span>
              </div>
              <iframe
                title="Ish joyi xaritasi"
                width="100%"
                height="220"
                style={{ border: 0, display: 'block' }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps/embed/v1/directions?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&origin=Namangan+ishxonasi,Namangan,Uzbekistan&destination=${encodeURIComponent(selectedTask.address + ', Namangan, Uzbekistan')}&mode=driving`}
              />
              <div className="px-3 py-2 flex items-center gap-2">
                <AppIcon name="MapPinIcon" size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate">{selectedTask.address}</span>
                <a
                  href={`https://www.google.com/maps/dir/Namangan+ishxonasi,Namangan,Uzbekistan/${encodeURIComponent(selectedTask.address + ', Namangan, Uzbekistan')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs font-medium flex items-center gap-1 flex-shrink-0"
                  style={{ color: 'var(--primary)' }}
                >
                  <AppIcon name="ArrowTopRightOnSquareIcon" size={12} />
                  Xaritada ochish
                </a>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              {STATUS_FLOW[selectedTask.installation_status] && (
                <button
                  onClick={() => advanceStatus(selectedTask)}
                  disabled={statusUpdating === selectedTask.id}
                  className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
                >
                  {statusUpdating === selectedTask.id && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Move to {statusConfig[STATUS_FLOW[selectedTask.installation_status]!].label}
                </button>
              )}
              <button onClick={() => setSelectedTask(null)} className="btn-secondary flex-1 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showNewTask && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowNewTask(false)}>
          <div className="card w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">New Installation Task</h2>
              <button onClick={() => setShowNewTask(false)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground"><AppIcon name="XMarkIcon" size={18} /></button>
            </div>
            {formError && (
              <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>{formError}</div>
            )}
            <div className="space-y-3">
              <div><label className="block text-xs text-muted-foreground mb-1">Customer *</label><input type="text" placeholder="Customer name" value={formData.customer} onChange={(e) => setFormData((p) => ({ ...p, customer: e.target.value }))} className="input w-full text-sm" /></div>
              <div><label className="block text-xs text-muted-foreground mb-1">Address *</label><input type="text" placeholder="Installation address" value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} className="input w-full text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-muted-foreground mb-1">Date</label><input type="date" value={formData.installation_date} onChange={(e) => setFormData((p) => ({ ...p, installation_date: e.target.value }))} className="input w-full text-sm" /></div>
                <div><label className="block text-xs text-muted-foreground mb-1">Branch</label><input type="text" placeholder="Branch" value={formData.branch} onChange={(e) => setFormData((p) => ({ ...p, branch: e.target.value }))} className="input w-full text-sm" /></div>
              </div>
              <div><label className="block text-xs text-muted-foreground mb-1">Status</label>
                <select value={formData.installation_status} onChange={(e) => setFormData((p) => ({ ...p, installation_status: e.target.value as InstallationStatus }))} className="input w-full text-sm">
                  {(Object.keys(statusConfig) as InstallationStatus[]).map((s) => <option key={s} value={s}>{statusConfig[s].label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowNewTask(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
