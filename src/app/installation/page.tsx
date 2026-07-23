'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import { useLanguage } from '@/context/LanguageContext';
import { createClient } from '@/lib/supabase/client';
import MapPickerModal, { MapLocation } from '@/components/MapPickerModal';

type InstallationStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
type InstallationPriority = 'low' | 'normal' | 'high';

interface Installation {
  id: string;
  customer: string;
  phone: string;
  address: string;
  equipment: string;
  description: string;
  technician: string;
  priority: InstallationPriority;
  cost: number;
  notes: string;
  installation_status: InstallationStatus;
  installation_date: string;
  branch: string;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  distance_km?: number;
  created_at: string;
  updated_at: string;
}

interface InstallationFormData {
  customer: string;
  phone: string;
  address: string;
  equipment: string;
  description: string;
  technician: string;
  priority: InstallationPriority;
  cost: string;
  notes: string;
  installation_date: string;
  branch: string;
  installation_status: InstallationStatus;
  location_address: string;
  location_lat: number | null;
  location_lng: number | null;
  distance_km: number | null;
}

const statusConfig: Record<InstallationStatus, { label: string; color: string }> = {
  pending: { label: 'Scheduled', color: 'var(--primary)' },
  in_progress: { label: 'In Progress', color: 'var(--warning)' },
  completed: { label: 'Completed', color: 'var(--success)' },
  cancelled: { label: 'Cancelled', color: 'var(--danger)' },
};

const priorityConfig: Record<InstallationPriority, { label: string; color: string }> = {
  low: { label: 'Past', color: '#64748b' },
  normal: { label: "O'rta", color: 'var(--primary)' },
  high: { label: 'Yuqori', color: 'var(--danger)' },
};

const STATUS_FLOW: Record<InstallationStatus, InstallationStatus | null> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: null,
  cancelled: null,
};

const emptyForm = (): InstallationFormData => ({
  customer: '', phone: '', address: '', equipment: '', description: '',
  technician: '', priority: 'normal', cost: '', notes: '',
  installation_date: new Date().toISOString().split('T')[0],
  branch: 'Namangan', installation_status: 'pending',
  location_address: '', location_lat: null, location_lng: null, distance_km: null,
});

export default function InstallationPage() {
  const { t } = useLanguage();
  const supabase = createClient();

  const [installations, setInstallations] = useState<Installation[]>([]);
  const [technicians, setTechnicians] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Installation | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewTask, setShowNewTask] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
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

  const fetchTechnicians = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('employees')
        .select('full_name')
        .eq('is_active', true)
        .order('full_name', { ascending: true });
      if (err) throw err;
      setTechnicians((data || []).map((e: { full_name: string }) => e.full_name));
    } catch (e) {
      console.error('Failed to load technicians', e);
    }
  }, []);

  useEffect(() => {
    fetchInstallations();
    fetchTechnicians();
    const channel = supabase
      .channel('installations_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'installations' }, () => {
        fetchInstallations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchInstallations, fetchTechnicians]);

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

  const handleMapConfirm = (loc: MapLocation) => {
    setFormData((p) => ({
      ...p,
      location_address: loc.address,
      location_lat: loc.lat,
      location_lng: loc.lng,
      distance_km: loc.distance_km,
    }));
    setShowMapPicker(false);
  };

  const clearLocation = () => {
    setFormData((p) => ({
      ...p,
      location_address: '',
      location_lat: null,
      location_lng: null,
      distance_km: null,
    }));
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
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        equipment: formData.equipment.trim(),
        description: formData.description.trim(),
        technician: formData.technician,
        priority: formData.priority,
        cost: formData.cost ? Number(formData.cost) : 0,
        notes: formData.notes.trim(),
        installation_date: formData.installation_date,
        branch: formData.branch,
        installation_status: formData.installation_status,
        location_address: formData.location_address || null,
        location_lat: formData.location_lat,
        location_lng: formData.location_lng,
        distance_km: formData.distance_km,
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <p className="text-xs text-muted-foreground mb-1">Jami vazifalar</p>
            <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-muted-foreground mb-1">Rejalashtirilgan</p>
            <p className="text-2xl font-semibold" style={{ color: 'var(--primary)' }}>{stats.scheduled}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-muted-foreground mb-1">Jarayonda</p>
            <p className="text-2xl font-semibold" style={{ color: 'var(--warning)' }}>{stats.inProgress}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-muted-foreground mb-1">Bajarildi</p>
            <p className="text-2xl font-semibold" style={{ color: 'var(--success)' }}>{stats.completed}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'pending', 'in_progress', 'completed', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
            >
              {s === 'all' ? 'All Tasks' : statusConfig[s].label}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>{error}</div>
        )}

        {loading ? (
          <div className="card p-8 text-center text-sm text-muted-foreground">Yuklanmoqda...</div>
        ) : filtered.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted-foreground">No installation tasks found</div>
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
                          {task.priority && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${priorityConfig[task.priority].color}20`, color: priorityConfig[task.priority].color }}>
                              {priorityConfig[task.priority].label}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-foreground text-sm">{task.customer}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{task.address}</p>
                        {task.equipment && (
                          <p className="text-xs text-muted-foreground mt-0.5">{task.equipment}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <AppIcon name="MapPinIcon" size={11} />
                            {task.branch}
                          </p>
                          {task.technician && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <AppIcon name="UserIcon" size={11} />
                              {task.technician}
                            </p>
                          )}
                        </div>
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
              {selectedTask.phone && (
                <div><p className="text-xs text-muted-foreground">Telefon</p><p className="font-medium text-foreground">{selectedTask.phone}</p></div>
              )}
              <div><p className="text-xs text-muted-foreground">Date</p><p className="font-medium text-foreground">{selectedTask.installation_date}</p></div>
              <div><p className="text-xs text-muted-foreground">Branch</p><p className="font-medium text-foreground">{selectedTask.branch}</p></div>
              {selectedTask.equipment && (
                <div className="col-span-2"><p className="text-xs text-muted-foreground">Uskuna</p><p className="font-medium text-foreground">{selectedTask.equipment}</p></div>
              )}
              {selectedTask.description && (
                <div className="col-span-2"><p className="text-xs text-muted-foreground">Ish tavsifi</p><p className="font-medium text-foreground">{selectedTask.description}</p></div>
              )}
              {selectedTask.technician && (
                <div><p className="text-xs text-muted-foreground">Texnik</p><p className="font-medium text-foreground">{selectedTask.technician}</p></div>
              )}
              {selectedTask.priority && (
                <div><p className="text-xs text-muted-foreground">Ustuvorlik</p><p className="font-medium text-foreground">{priorityConfig[selectedTask.priority].label}</p></div>
              )}
              {!!selectedTask.cost && (
                <div><p className="text-xs text-muted-foreground">Xarajat</p><p className="font-medium text-foreground">{Number(selectedTask.cost).toLocaleString()} UZS</p></div>
              )}
              {selectedTask.notes && (
                <div className="col-span-2"><p className="text-xs text-muted-foreground">Izohlar</p><p className="font-medium text-foreground">{selectedTask.notes}</p></div>
              )}
            </div>

            {/* OpenStreetMap: directions from Namangan office to installation address */}
            <div className="rounded-lg overflow-hidden border border-border">
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground" style={{ background: 'var(--secondary)' }}>
                <AppIcon name="MapPinIcon" size={13} style={{ color: 'var(--primary)' }} />
                <span className="font-medium text-foreground">Ish joyi yo&apos;nalishi</span>
                <span className="ml-auto text-muted-foreground">Namangan ishxonasidan</span>
              </div>
              <div className="w-full" style={{ height: 220, background: '#e5e7eb' }}>
                {selectedTask.location_lat && selectedTask.location_lng ? (
                  <iframe
                    title="Ish joyi xaritasi"
                    width="100%"
                    height="100%"
                    style={{ border: 0, display: 'block' }}
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${(selectedTask.location_lng - 0.02).toFixed(4)}%2C${(selectedTask.location_lat - 0.01).toFixed(4)}%2C${(selectedTask.location_lng + 0.02).toFixed(4)}%2C${(selectedTask.location_lat + 0.01).toFixed(4)}&layer=mapnik&marker=${selectedTask.location_lat}%2C${selectedTask.location_lng}`}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                    <AppIcon name="MapPinIcon" size={20} className="mr-2 opacity-50" />
                    Joylashuv koordinatalari yo&apos;q
                  </div>
                )}
              </div>
              <div className="px-3 py-2 flex items-center gap-2">
                <AppIcon name="MapPinIcon" size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate">{selectedTask.location_address || selectedTask.address}</span>
                {selectedTask.distance_km != null && (
                  <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--primary)' }}>{selectedTask.distance_km} km</span>
                )}
                <a
                  href={selectedTask.location_lat && selectedTask.location_lng
                    ? `https://www.openstreetmap.org/?mlat=${selectedTask.location_lat}&mlon=${selectedTask.location_lng}#map=16/${selectedTask.location_lat}/${selectedTask.location_lng}`
                    : `https://www.openstreetmap.org/search?query=${encodeURIComponent((selectedTask.location_address || selectedTask.address) + ', Namangan, Uzbekistan')}`
                  }
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
          <div className="card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">New Installation Task</h2>
              <button onClick={() => setShowNewTask(false)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground"><AppIcon name="XMarkIcon" size={18} /></button>
            </div>
            {formError && (
              <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>{formError}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Customer *</label>
                <input type="text" placeholder="Customer name" value={formData.customer} onChange={(e) => setFormData((p) => ({ ...p, customer: e.target.value }))} className="input w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Telefon</label>
                <input type="text" placeholder="+998 XX XXX XXXX" value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} className="input w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Ustuvorlik</label>
                <select value={formData.priority} onChange={(e) => setFormData((p) => ({ ...p, priority: e.target.value as InstallationPriority }))} className="input w-full text-sm">
                  <option value="low">Past</option>
                  <option value="normal">O&apos;rta</option>
                  <option value="high">Yuqori</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Address *</label>
                <input type="text" placeholder="Installation address" value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} className="input w-full text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Uskuna / Qurilma</label>
                <input type="text" placeholder="O'rnatiladigan uskuna modeli" value={formData.equipment} onChange={(e) => setFormData((p) => ({ ...p, equipment: e.target.value }))} className="input w-full text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Ish tavsifi</label>
                <textarea rows={2} placeholder="Montaj ishini tasvirlab bering..." value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} className="input w-full text-sm resize-none" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Texnik tayinlash</label>
                <select value={formData.technician} onChange={(e) => setFormData((p) => ({ ...p, technician: e.target.value }))} className="input w-full text-sm">
                  <option value="">Tanlanmagan</option>
                  {technicians.map((tech) => <option key={tech} value={tech}>{tech}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Status</label>
                <select value={formData.installation_status} onChange={(e) => setFormData((p) => ({ ...p, installation_status: e.target.value as InstallationStatus }))} className="input w-full text-sm">
                  {(Object.keys(statusConfig) as InstallationStatus[]).map((s) => <option key={s} value={s}>{statusConfig[s].label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Date</label>
                <input type="date" value={formData.installation_date} onChange={(e) => setFormData((p) => ({ ...p, installation_date: e.target.value }))} className="input w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Branch</label>
                <input type="text" placeholder="Branch" value={formData.branch} onChange={(e) => setFormData((p) => ({ ...p, branch: e.target.value }))} className="input w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Xarajat (UZS)</label>
                <input type="number" placeholder="0" value={formData.cost} onChange={(e) => setFormData((p) => ({ ...p, cost: e.target.value }))} className="input w-full text-sm" />
              </div>

              {/* Location Picker */}
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Ish joylashuvi</label>
                {formData.location_address ? (
                  <div className="p-3 rounded-lg space-y-2" style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}>
                    <div className="flex items-start gap-2">
                      <AppIcon name="MapPinIcon" size={14} className="text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-foreground flex-1 leading-relaxed">{formData.location_address}</p>
                      <button type="button" onClick={clearLocation} className="text-muted-foreground hover:text-foreground flex-shrink-0" title="Clear location">
                        <AppIcon name="XMarkIcon" size={14} />
                      </button>
                    </div>
                    {formData.distance_km != null && (
                      <div className="flex items-center gap-1.5">
                        <AppIcon name="TruckIcon" size={12} className="text-muted-foreground" />
                        <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>{formData.distance_km} km ishxonadan</span>
                      </div>
                    )}
                    <button type="button" onClick={() => setShowMapPicker(true)} className="text-xs flex items-center gap-1.5 transition-colors" style={{ color: 'var(--primary)' }}>
                      <AppIcon name="PencilIcon" size={11} />
                      Joylashuvni o&apos;zgartirish
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className="w-full flex items-center justify-center gap-2 text-sm py-2.5 rounded-lg border transition-colors hover:border-primary/60"
                    style={{ border: '1px dashed var(--border)', color: 'var(--muted-foreground)' }}
                  >
                    <AppIcon name="MapPinIcon" size={15} />
                    Xaritada joylashuvni tanlash
                  </button>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Izohlar</label>
                <textarea rows={2} placeholder="Qo'shimcha izohlar..." value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} className="input w-full text-sm resize-none" />
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

      {/* Map Picker Modal */}
      {showMapPicker && (
        <MapPickerModal
          onClose={() => setShowMapPicker(false)}
          onConfirm={handleMapConfirm}
          initialLat={formData.location_lat}
          initialLng={formData.location_lng}
        />
      )}
    </AppLayout>
  );
}
