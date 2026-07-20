'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import { useLanguage } from '@/context/LanguageContext';
import { createClient } from '@/lib/supabase/client';

interface Installation {
  id: string;
  customer: string;
  address: string;
  installation_status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  installation_date: string;
  branch: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'installation' | 'service' | 'meeting';
  assignee: string;
  location?: string;
  color: string;
}

const statusColorMap: Record<string, string> = {
  pending: 'var(--primary)',
  in_progress: 'var(--warning)',
  completed: 'var(--success)',
  cancelled: 'var(--danger)',
};

const statusLabelMap: Record<string, string> = {
  pending: 'Rejalashtirilgan',
  in_progress: 'Jarayonda',
  completed: 'Bajarildi',
  cancelled: 'Bekor qilindi',
};

const DAYS = ['Yak', 'Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha'];
const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

export default function CalendarPage() {
  const { t } = useLanguage();
  const supabase = createClient();

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(today.toISOString().split('T')[0]);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ customer: '', address: '', installation_date: today.toISOString().split('T')[0], branch: 'Namangan' });
  const [saving, setSaving] = useState(false);

  const fetchInstallations = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('installations')
        .select('id, customer, address, installation_status, installation_date, branch')
        .order('installation_date', { ascending: true });
      setInstallations((data as Installation[]) || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstallations();
    const channel = supabase
      .channel('calendar_installations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'installations' }, fetchInstallations)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchInstallations]);

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const getEventsForDate = (day: number): Installation[] => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return installations.filter((i) => i.installation_date === dateStr);
  };

  const selectedEvents = selectedDate ? installations.filter((i) => i.installation_date === selectedDate) : [];

  const todayStr = today.toISOString().split('T')[0];

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  };

  const handleSaveEvent = async () => {
    if (!newEvent.customer || !newEvent.address) return;
    setSaving(true);
    try {
      await supabase.from('installations').insert({
        customer: newEvent.customer,
        address: newEvent.address,
        installation_date: newEvent.installation_date,
        branch: newEvent.branch,
        installation_status: 'pending',
      });
      setShowAddEvent(false);
      setNewEvent({ customer: '', address: '', installation_date: today.toISOString().split('T')[0], branch: 'Namangan' });
      fetchInstallations();
    } finally {
      setSaving(false);
    }
  };

  // Upcoming: next 7 events from today
  const upcomingEvents = installations
    .filter((i) => i.installation_date >= todayStr && i.installation_status !== 'cancelled')
    .slice(0, 6);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t.calendar_title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t.calendar_subtitle}</p>
          </div>
          <button onClick={() => setShowAddEvent(true)} className="btn-primary flex items-center gap-2 text-sm">
            <AppIcon name="PlusIcon" size={16} />
            {t.calendar_add_event}
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Jami montajlar", value: installations.length, color: 'var(--primary)' },
            { label: "Rejalashtirilgan", value: installations.filter(i => i.installation_status === 'pending').length, color: 'var(--primary)' },
            { label: "Jarayonda", value: installations.filter(i => i.installation_status === 'in_progress').length, color: 'var(--warning)' },
            { label: "Bajarildi", value: installations.filter(i => i.installation_status === 'completed').length, color: 'var(--success)' },
          ].map((s) => (
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2 card p-5">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <AppIcon name="ChevronLeftIcon" size={18} />
              </button>
              <h2 className="text-lg font-semibold text-foreground">{MONTHS[currentMonth]} {currentYear}</h2>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <AppIcon name="ChevronRightIcon" size={18} />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
              ))}
            </div>

            {/* Calendar Days */}
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const events = getEventsForDate(day);
                  const isSelected = selectedDate === dateStr;
                  const isToday = dateStr === todayStr;

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`min-h-[60px] p-1.5 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-primary/15 border border-primary/40' : 'hover:bg-secondary'}`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mb-1 ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {events.slice(0, 2).map((ev) => (
                          <div key={ev.id} className="text-xs px-1 py-0.5 rounded truncate" style={{ background: `${statusColorMap[ev.installation_status]}20`, color: statusColorMap[ev.installation_status], fontSize: '10px' }}>
                            {ev.customer}
                          </div>
                        ))}
                        {events.length > 2 && <div className="text-xs text-muted-foreground" style={{ fontSize: '10px' }}>+{events.length - 2} ta</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            {/* Legend */}
            <div className="card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Holat turlari</p>
              <div className="space-y-2">
                {Object.entries(statusLabelMap).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: statusColorMap[key] }} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Day Events */}
            <div className="card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {selectedDate ? `Montajlar — ${selectedDate}` : 'Sana tanlang'}
              </p>
              {selectedEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">Bu kunda montaj yo'q</p>
              ) : (
                <div className="space-y-3">
                  {selectedEvents.map((ev) => (
                    <div key={ev.id} className="p-3 rounded-lg" style={{ background: `${statusColorMap[ev.installation_status]}10`, borderLeft: `3px solid ${statusColorMap[ev.installation_status]}` }}>
                      <p className="text-xs font-semibold text-foreground">{ev.customer}</p>
                      <p className="text-xs text-muted-foreground mt-1">{ev.address}</p>
                      <p className="text-xs mt-1" style={{ color: statusColorMap[ev.installation_status] }}>{statusLabelMap[ev.installation_status]}</p>
                      {ev.branch && <p className="text-xs text-muted-foreground">{ev.branch}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Events */}
            <div className="card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Kelgusi montajlar</p>
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">Rejalashtirilgan montaj yo'q</p>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map((ev) => (
                    <div key={ev.id} className="flex items-start gap-2 cursor-pointer" onClick={() => setSelectedDate(ev.installation_date)}>
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: statusColorMap[ev.installation_status] }} />
                      <div>
                        <p className="text-xs font-medium text-foreground leading-tight">{ev.customer}</p>
                        <p className="text-xs text-muted-foreground">{ev.installation_date} · {ev.branch}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Installation Modal */}
      {showAddEvent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAddEvent(false)}>
          <div className="card w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Yangi montaj qo'shish</h2>
              <button onClick={() => setShowAddEvent(false)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground"><AppIcon name="XMarkIcon" size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Mijoz nomi *</label>
                <input type="text" placeholder="Mijoz ismi yoki kompaniya" className="input w-full text-sm" value={newEvent.customer} onChange={(e) => setNewEvent((p) => ({ ...p, customer: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Manzil *</label>
                <input type="text" placeholder="To'liq manzil" className="input w-full text-sm" value={newEvent.address} onChange={(e) => setNewEvent((p) => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Sana</label>
                  <input type="date" className="input w-full text-sm" value={newEvent.installation_date} onChange={(e) => setNewEvent((p) => ({ ...p, installation_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Filial</label>
                  <select className="input w-full text-sm" value={newEvent.branch} onChange={(e) => setNewEvent((p) => ({ ...p, branch: e.target.value }))}>
                    <option value="Namangan">Namangan</option>
                    <option value="Samarkand">Samarkand</option>
                    <option value="Bukhara">Bukhara</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAddEvent(false)} className="btn-secondary flex-1 text-sm">Bekor qilish</button>
              <button onClick={handleSaveEvent} disabled={saving || !newEvent.customer || !newEvent.address} className="btn-primary flex-1 text-sm disabled:opacity-60">
                {saving ? 'Saqlanmoqda...' : 'Qo\'shish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
