'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import { createClient } from '@/lib/supabase/client';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';
import MapPickerModal, { MapLocation } from '@/components/MapPickerModal';

// Office coordinates (Namangan, Uzbekistan)
const OFFICE_LAT = 40.9983;
const OFFICE_LNG = 71.6726;
const OFFICE_NAME = 'Namangan ishxonasi';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

type TicketStatus = 'pending' | 'repairing' | 'service' | 'ready' | 'completed';
type TicketPriority = 'low' | 'normal' | 'high';

interface ServiceTicket {
  id: string;
  ticket_number: string;
  customer: string;
  phone: string;
  device: string;
  issue: string;
  diagnosis: string;
  technician: string;
  ticket_status: TicketStatus;
  priority: TicketPriority;
  cost: number;
  notes: string;
  days_open: number;
  estimated_date: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  distance_km?: number;
}

interface TicketFormData {
  customer: string;
  phone: string;
  device: string;
  issue: string;
  diagnosis: string;
  technician: string;
  priority: TicketPriority;
  cost: string;
  notes: string;
  estimated_date: string;
  ticket_status: TicketStatus;
  location_address: string;
  location_lat: number | null;
  location_lng: number | null;
  distance_km: number | null;
}

// Technician list is loaded dynamically from the employees table (see fetchTechnicians below).

const statusConfig: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pending',   color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  repairing: { label: 'Repairing', color: 'var(--primary)', bg: 'rgba(99,102,241,0.12)' },
  service:   { label: 'In Service',color: 'var(--warning)', bg: 'rgba(245,158,11,0.12)' },
  ready:     { label: 'Ready',     color: 'var(--success)', bg: 'rgba(34,197,94,0.12)' },
  completed: { label: 'Completed', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

const priorityConfig: Record<TicketPriority, { label: string; color: string }> = {
  low:    { label: 'Low',    color: '#64748b' },
  normal: { label: 'Normal', color: 'var(--primary)' },
  high:   { label: 'High',   color: 'var(--danger)' },
};

const STATUS_FLOW: Record<TicketStatus, TicketStatus | null> = {
  pending:   'repairing',
  repairing: 'service',
  service:   'ready',
  ready:     'completed',
  completed: null,
};

const formatUZS = (n: number) =>
  n > 0 ? new Intl.NumberFormat('ru-RU').format(n) + ' UZS' : '—';

const formatDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const emptyForm = (): TicketFormData => ({
  customer: '', phone: '', device: '', issue: '', diagnosis: '',
  technician: '', priority: 'normal', cost: '',
  notes: '', estimated_date: '', ticket_status: 'pending',
  location_address: '', location_lat: null, location_lng: null, distance_km: null,
});

const EXPORT_HEADERS = ['Ticket #', 'Customer', 'Phone', 'Device', 'Issue', 'Technician', 'Status', 'Priority', 'Cost (UZS)', 'Days Open', 'Est. Date', 'Created', 'Location', 'Distance (km)'];

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ServicePage() {
  const supabase = createClient();

  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [technicians, setTechnicians] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [techFilter, setTechFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<ServiceTicket | null>(null);
  const [formData, setFormData] = useState<TicketFormData>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('service_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setTickets((data as ServiceTicket[]) || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load tickets');
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
      // Non-fatal: technician dropdown will just be empty until employees load
      console.error('Failed to load technicians', e);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchTechnicians();

    const channel = supabase
      .channel('service_tickets_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_tickets' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTickets((prev) => [payload.new as ServiceTicket, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setTickets((prev) =>
            prev.map((t) => t.id === payload.new.id ? (payload.new as ServiceTicket) : t)
          );
          setSelectedTicket((prev) =>
            prev?.id === payload.new.id ? (payload.new as ServiceTicket) : prev
          );
        } else if (payload.eventType === 'DELETE') {
          setTickets((prev) => prev.filter((t) => t.id !== payload.old.id));
          setSelectedTicket((prev) => prev?.id === payload.old.id ? null : prev);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchTickets]);

  const filtered = tickets.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      t.customer?.toLowerCase().includes(q) ||
      t.ticket_number?.toLowerCase().includes(q) ||
      t.device?.toLowerCase().includes(q) ||
      t.technician?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || t.ticket_status === statusFilter;
    const matchTech = techFilter === 'all' || t.technician === techFilter;
    const ticketDate = new Date(t.created_at);
    const matchFrom = !dateFrom || ticketDate >= new Date(dateFrom);
    const matchTo = !dateTo || ticketDate <= new Date(dateTo + 'T23:59:59');
    return matchSearch && matchStatus && matchTech && matchFrom && matchTo;
  });

  const stats = {
    total: tickets.length,
    active: tickets.filter((t) => ['pending', 'repairing', 'service'].includes(t.ticket_status)).length,
    ready: tickets.filter((t) => t.ticket_status === 'ready').length,
    completed: tickets.filter((t) => t.ticket_status === 'completed').length,
  };

  const buildExportRows = () =>
    filtered.map((t) => [
      t.ticket_number || '—',
      t.customer || '—',
      t.phone || '—',
      t.device || '—',
      t.issue || '—',
      t.technician || 'Unassigned',
      statusConfig[t.ticket_status]?.label || t.ticket_status,
      priorityConfig[t.priority as TicketPriority]?.label || t.priority,
      t.cost > 0 ? new Intl.NumberFormat('ru-RU').format(t.cost) : '0',
      t.days_open ?? 0,
      formatDate(t.estimated_date),
      formatDate(t.created_at),
      t.location_address || '—',
      t.distance_km != null ? String(t.distance_km) : '—',
    ]);

  const handleExcelExport = () => {
    setExporting('excel');
    try {
      const period = dateFrom || dateTo ? `${dateFrom || 'start'}_to_${dateTo || 'now'}` : 'all';
      exportToCSV(`service-tickets-${period}`, EXPORT_HEADERS, [], buildExportRows());
    } finally {
      setExporting(null);
    }
  };

  const handlePDFExport = async () => {
    setExporting('pdf');
    try {
      const period = dateFrom || dateTo ? `${dateFrom || 'start'} to ${dateTo || 'now'}` : 'All time';
      await exportToPDF({
        title: 'Service Tickets Report',
        subtitle: `Filtered: ${filtered.length} tickets | Status: ${statusFilter} | Technician: ${techFilter === 'all' ? 'All' : techFilter}`,
        period,
        headers: EXPORT_HEADERS,
        rows: buildExportRows(),
        filename: `service-tickets-${period.replace(/ /g, '-')}`,
        summaryRows: [
          { label: 'Total Tickets', value: String(filtered.length) },
          { label: 'In Progress', value: String(filtered.filter((t) => ['pending', 'repairing', 'service'].includes(t.ticket_status)).length) },
          { label: 'Ready', value: String(filtered.filter((t) => t.ticket_status === 'ready').length) },
          { label: 'Completed', value: String(filtered.filter((t) => t.ticket_status === 'completed').length) },
        ],
      });
    } finally {
      setExporting(null);
    }
  };

  const openCreate = () => {
    setEditingTicket(null);
    setFormData(emptyForm());
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (ticket: ServiceTicket) => {
    setEditingTicket(ticket);
    setFormData({
      customer: ticket.customer || '',
      phone: ticket.phone || '',
      device: ticket.device || '',
      issue: ticket.issue || '',
      diagnosis: ticket.diagnosis || '',
      technician: ticket.technician || technicians[0] || '',
      priority: ticket.priority || 'normal',
      cost: ticket.cost ? String(ticket.cost) : '',
      notes: ticket.notes || '',
      estimated_date: ticket.estimated_date || '',
      ticket_status: ticket.ticket_status,
      location_address: ticket.location_address || '',
      location_lat: ticket.location_lat ?? null,
      location_lng: ticket.location_lng ?? null,
      distance_km: ticket.distance_km ?? null,
    });
    setFormError(null);
    setShowModal(true);
    setSelectedTicket(null);
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
    if (!formData.customer.trim() || !formData.device.trim() || !formData.issue.trim()) {
      setFormError('Customer, device, and issue are required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const payload: any = {
        customer: formData.customer.trim(),
        phone: formData.phone.trim(),
        device: formData.device.trim(),
        issue: formData.issue.trim(),
        diagnosis: formData.diagnosis.trim(),
        technician: formData.technician,
        priority: formData.priority,
        cost: formData.cost ? parseInt(formData.cost, 10) : 0,
        notes: formData.notes.trim(),
        estimated_date: formData.estimated_date || null,
        ticket_status: formData.ticket_status,
        location_address: formData.location_address || null,
        location_lat: formData.location_lat,
        location_lng: formData.location_lng,
        distance_km: formData.distance_km,
      };

      if (editingTicket) {
        const { error: err } = await supabase
          .from('service_tickets')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingTicket.id);
        if (err) throw err;
      } else {
        const ticketNo = 'SRV-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-5);
        const { error: err } = await supabase
          .from('service_tickets')
          .insert({ ...payload, ticket_number: ticketNo, days_open: 0 });
        if (err) throw err;
      }
      setShowModal(false);
    } catch (e: any) {
      setFormError(e?.message || 'Failed to save ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const advanceStatus = async (ticket: ServiceTicket) => {
    const next = STATUS_FLOW[ticket.ticket_status];
    if (!next) return;
    setStatusUpdating(ticket.id);
    try {
      const update: any = { ticket_status: next, updated_at: new Date().toISOString() };
      if (next === 'completed') update.closed_at = new Date().toISOString();
      const { error: err } = await supabase
        .from('service_tickets')
        .update(update)
        .eq('id', ticket.id);
      if (err) throw err;
    } catch (e: any) {
      setError(e?.message || 'Status update failed');
    } finally {
      setStatusUpdating(null);
    }
  };

  const deleteTicket = async (id: string) => {
    if (!confirm('Delete this ticket? This cannot be undone.')) return;
    try {
      const { error: err } = await supabase.from('service_tickets').delete().eq('id', id);
      if (err) throw err;
      setSelectedTicket(null);
    } catch (e: any) {
      setError(e?.message || 'Delete failed');
    }
  };

  const uniqueTechs = Array.from(new Set(tickets.map((t) => t.technician).filter(Boolean)));

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Servis ticketlari</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Servis ticketlarini yarating, tayinlang, kuzating va yoping</p>
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
            <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
              <AppIcon name="PlusIcon" size={16} />
              Yangi ticket
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
            { label: 'Jami ticketlar', value: stats.total, icon: 'TicketIcon', color: 'var(--primary)' },
            { label: 'Jarayonda', value: stats.active, icon: 'WrenchScrewdriverIcon', color: 'var(--warning)' },
            { label: 'Tayyor', value: stats.ready, icon: 'CheckCircleIcon', color: 'var(--success)' },
            { label: 'Yakunlangan', value: stats.completed, icon: 'ArchiveBoxCheckIcon', color: '#64748b' },
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
        <div className="card p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <AppIcon name="MagnifyingGlassIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Mijoz, ticket raqami, qurilma bo'yicha qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full text-sm"
            />
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
          <select
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            className="input text-sm min-w-[160px]"
          >
            <option value="all">Barcha texniklar</option>
            {uniqueTechs.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'repairing', 'service', 'ready', 'completed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'btn-secondary'}`}
              >
                {s === 'all' ? 'Barchasi' : statusConfig[s]?.label ?? s}
              </button>
            ))}
          </div>
          {filtered.length !== tickets.length && (
            <span className="text-xs text-muted-foreground self-center">{filtered.length} dan {tickets.length} ta ticket</span>
          )}
        </div>

        {/* Ticket List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-secondary rounded w-1/4" />
                    <div className="h-4 bg-secondary rounded w-1/2" />
                    <div className="h-3 bg-secondary rounded w-3/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <AppIcon name="WrenchScrewdriverIcon" size={40} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-foreground font-medium">Ticketlar topilmadi</p>
            <p className="text-sm text-muted-foreground mt-1">Filtrlarni o'zgartiring yoki yangi ticket yarating</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((ticket) => {
              const sc = statusConfig[ticket.ticket_status];
              const pc = priorityConfig[ticket.priority as TicketPriority] || priorityConfig.normal;
              const nextStatus = STATUS_FLOW[ticket.ticket_status];
              return (
                <div
                  key={ticket.id}
                  className="card p-4 cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: sc.bg }}>
                        <AppIcon name="WrenchScrewdriverIcon" size={18} style={{ color: sc.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-primary">{ticket.ticket_number}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: sc.bg, color: sc.color }}>
                            {sc.label}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${pc.color}15`, color: pc.color }}>
                            {pc.label}
                          </span>
                        </div>
                        <p className="font-semibold text-foreground text-sm mt-0.5">{ticket.customer}</p>
                        <p className="text-xs text-muted-foreground">{ticket.device}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">Muammo: {ticket.issue}</p>
                        {ticket.location_address && (
                          <div className="flex items-center gap-1 mt-1">
                            <AppIcon name="MapPinIcon" size={11} className="text-muted-foreground flex-shrink-0" />
                            <p className="text-xs text-muted-foreground line-clamp-1">{ticket.location_address}</p>
                            {ticket.distance_km != null && (
                              <span className="text-xs font-medium ml-1 flex-shrink-0" style={{ color: 'var(--primary)' }}>
                                · {ticket.distance_km} km
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      <p className="text-xs text-muted-foreground">Texnik</p>
                      <p className="text-sm font-medium text-foreground">{ticket.technician || 'Tayinlanmagan'}</p>
                      {ticket.estimated_date && (
                        <p className="text-xs text-muted-foreground">Taxm: {formatDate(ticket.estimated_date)}</p>
                      )}
                      {ticket.cost > 0 && (
                        <p className="text-xs font-semibold" style={{ color: 'var(--success)' }}>{formatUZS(ticket.cost)}</p>
                      )}
                      {nextStatus && (
                        <button
                          onClick={(e) => { e.stopPropagation(); advanceStatus(ticket); }}
                          disabled={statusUpdating === ticket.id}
                          className="text-xs px-2 py-1 rounded-lg btn-secondary flex items-center gap-1 ml-auto"
                        >
                          {statusUpdating === ticket.id ? (
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

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTicket(null)}>
          <div className="card w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-foreground">{selectedTicket.ticket_number}</h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: statusConfig[selectedTicket.ticket_status]?.bg, color: statusConfig[selectedTicket.ticket_status]?.color }}>
                    {statusConfig[selectedTicket.ticket_status]?.label}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: `${priorityConfig[selectedTicket.priority as TicketPriority]?.color || '#64748b'}15`, color: priorityConfig[selectedTicket.priority as TicketPriority]?.color || '#64748b' }}>
                    {priorityConfig[selectedTicket.priority as TicketPriority]?.label || 'Normal'} Priority
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Created {formatDate(selectedTicket.created_at)}</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground">
                <AppIcon name="XMarkIcon" size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground mb-0.5">Mijoz</p><p className="font-medium text-foreground">{selectedTicket.customer}</p></div>
              <div><p className="text-xs text-muted-foreground mb-0.5">Telefon</p><p className="font-medium text-foreground">{selectedTicket.phone || '—'}</p></div>
              <div className="col-span-2"><p className="text-xs text-muted-foreground mb-0.5">Qurilma</p><p className="font-medium text-foreground">{selectedTicket.device}</p></div>
              <div className="col-span-2"><p className="text-xs text-muted-foreground mb-0.5">Muammo</p><p className="font-medium text-foreground">{selectedTicket.issue}</p></div>
              {selectedTicket.diagnosis && (
                <div className="col-span-2"><p className="text-xs text-muted-foreground mb-0.5">Diagnostika</p><p className="font-medium text-foreground">{selectedTicket.diagnosis}</p></div>
              )}
              <div><p className="text-xs text-muted-foreground mb-0.5">Tayinlangan texnik</p><p className="font-medium text-foreground">{selectedTicket.technician || 'Tayinlanmagan'}</p></div>
              <div><p className="text-xs text-muted-foreground mb-0.5">Ochiq kunlar</p><p className="font-medium text-foreground">{selectedTicket.days_open ?? 0} kun</p></div>
              <div><p className="text-xs text-muted-foreground mb-0.5">Taxminiy tugash sanasi</p><p className="font-medium text-foreground">{formatDate(selectedTicket.estimated_date)}</p></div>
              <div><p className="text-xs text-muted-foreground mb-0.5">Umumiy xarajat</p><p className="font-bold" style={{ color: 'var(--success)' }}>{formatUZS(selectedTicket.cost)}</p></div>

              {/* Location & Distance */}
              {selectedTicket.location_address && (
                <div className="col-span-2 p-3 rounded-lg space-y-2" style={{ background: 'var(--secondary)' }}>
                  <p className="text-xs text-muted-foreground font-medium">Servis joylashuvi</p>
                  <div className="flex items-start gap-2">
                    <AppIcon name="MapPinIcon" size={14} className="text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed">{selectedTicket.location_address}</p>
                  </div>
                  {selectedTicket.distance_km != null && (
                    <div className="flex items-center gap-2">
                      <AppIcon name="TruckIcon" size={14} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                        {selectedTicket.distance_km} km ishxonadan
                      </span>
                      <span className="text-xs text-muted-foreground">(haydash masofasi)</span>
                    </div>
                  )}
                  {selectedTicket.location_lat && selectedTicket.location_lng && (
                    <a
                      href={`https://www.google.com/maps/dir/${OFFICE_LAT},${OFFICE_LNG}/${selectedTicket.location_lat},${selectedTicket.location_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
                      style={{ color: 'var(--primary)' }}
                    >
                      <AppIcon name="ArrowTopRightOnSquareIcon" size={12} />
                      Xaritada ochish
                    </a>
                  )}
                </div>
              )}

              {selectedTicket.notes && (
                <div className="col-span-2 p-3 rounded-lg" style={{ background: 'var(--secondary)' }}>
                  <p className="text-xs text-muted-foreground mb-0.5">Izohlar</p>
                  <p className="text-sm text-foreground">{selectedTicket.notes}</p>
                </div>
              )}
              {selectedTicket.closed_at && (
                <div className="col-span-2"><p className="text-xs text-muted-foreground mb-0.5">Yopilgan sana</p><p className="font-medium text-foreground">{formatDate(selectedTicket.closed_at)}</p></div>
              )}
            </div>

            <div className="flex gap-3 pt-2 flex-wrap">
              {STATUS_FLOW[selectedTicket.ticket_status] && (
                <button
                  onClick={() => { advanceStatus(selectedTicket); setSelectedTicket(null); }}
                  disabled={statusUpdating === selectedTicket.id}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  {statusUpdating === selectedTicket.id ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <AppIcon name="ArrowRightIcon" size={14} />
                  )}
                  Move to {statusConfig[STATUS_FLOW[selectedTicket.ticket_status]!]?.label}
                </button>
              )}
              <button onClick={() => openEdit(selectedTicket)} className="btn-secondary flex items-center gap-2 text-sm">
                <AppIcon name="PencilIcon" size={14} />
                Tahrirlash
              </button>
              <button
                onClick={() => deleteTicket(selectedTicket.id)}
                className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors"
                style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.08)' }}
              >
                <AppIcon name="TrashIcon" size={14} />
                O'chirish
              </button>
              <button onClick={() => setSelectedTicket(null)} className="btn-secondary text-sm ml-auto">Yopish</button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editingTicket ? 'Ticketni tahrirlash' : 'Yangi servis ticket'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground">
                <AppIcon name="XMarkIcon" size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Mijoz ismi *</label>
                <input type="text" placeholder="Mijoz ismi" value={formData.customer}
                  onChange={(e) => setFormData((p) => ({ ...p, customer: e.target.value }))}
                  className="input w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Telefon</label>
                <input type="text" placeholder="+998 XX XXX XXXX" value={formData.phone}
                  onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                  className="input w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Ustuvorlik</label>
                <select value={formData.priority}
                  onChange={(e) => setFormData((p) => ({ ...p, priority: e.target.value as TicketPriority }))}
                  className="input w-full text-sm">
                  <option value="low">Past</option>
                  <option value="normal">O'rta</option>
                  <option value="high">Yuqori</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Qurilma *</label>
                <input type="text" placeholder="Qurilma modeli / nomi" value={formData.device}
                  onChange={(e) => setFormData((p) => ({ ...p, device: e.target.value }))}
                  className="input w-full text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Muammo tavsifi *</label>
                <textarea rows={2} placeholder="Muammoni tasvirlab bering..." value={formData.issue}
                  onChange={(e) => setFormData((p) => ({ ...p, issue: e.target.value }))}
                  className="input w-full text-sm resize-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Diagnostika</label>
                <textarea rows={2} placeholder="Texnik diagnostika..." value={formData.diagnosis}
                  onChange={(e) => setFormData((p) => ({ ...p, diagnosis: e.target.value }))}
                  className="input w-full text-sm resize-none" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Texnik tayinlash</label>
                <select value={formData.technician}
                  onChange={(e) => setFormData((p) => ({ ...p, technician: e.target.value }))}
                  className="input w-full text-sm">
                  <option value="">Tanlanmagan</option>
                  {technicians.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Holat</label>
                <select value={formData.ticket_status}
                  onChange={(e) => setFormData((p) => ({ ...p, ticket_status: e.target.value as TicketStatus }))}
                  className="input w-full text-sm">
                  {(Object.keys(statusConfig) as TicketStatus[]).map((s) => (
                    <option key={s} value={s}>{statusConfig[s].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Taxminiy sana</label>
                <input type="date" value={formData.estimated_date}
                  onChange={(e) => setFormData((p) => ({ ...p, estimated_date: e.target.value }))}
                  className="input w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Xarajat (UZS)</label>
                <input type="number" placeholder="0" value={formData.cost}
                  onChange={(e) => setFormData((p) => ({ ...p, cost: e.target.value }))}
                  className="input w-full text-sm" />
              </div>

              {/* Location Picker */}
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Servis joylashuvi</label>
                {formData.location_address ? (
                  <div className="p-3 rounded-lg space-y-2" style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}>
                    <div className="flex items-start gap-2">
                      <AppIcon name="MapPinIcon" size={14} className="text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-foreground flex-1 leading-relaxed">{formData.location_address}</p>
                      <button
                        type="button"
                        onClick={clearLocation}
                        className="text-muted-foreground hover:text-foreground flex-shrink-0"
                        title="Clear location"
                      >
                        <AppIcon name="XMarkIcon" size={14} />
                      </button>
                    </div>
                    {formData.distance_km != null && (
                      <div className="flex items-center gap-1.5">
                        <AppIcon name="TruckIcon" size={12} className="text-muted-foreground" />
                        <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                          {formData.distance_km} km ishxonadan
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowMapPicker(true)}
                      className="text-xs flex items-center gap-1.5 transition-colors"
                      style={{ color: 'var(--primary)' }}
                    >
                      <AppIcon name="PencilIcon" size={11} />
                      Joylashuvni o'zgartirish
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
                <textarea rows={2} placeholder="Qo'shimcha izohlar..." value={formData.notes}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  className="input w-full text-sm resize-none" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">Bekor qilish</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editingTicket ? 'O\'zgarishlarni saqlash' : 'Ticket yaratish'}
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
