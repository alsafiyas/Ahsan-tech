'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface KPIData {
  todaySales: number;
  todayProfit: number;
  monthlySales: number;
  monthlyProfit: number;
  overdueInvoices: number;
  overdueAmount: number;
  devicesInService: number;
  readyForPickup: number;
  warehouseSkus: number;
  lowStockCount: number;
  todayInstallations: number;
  completedInstallations: number;
  inProgressInstallations: number;
  activeEmployees: number;
  totalEmployees: number;
  lateEmployees: number;
  absentEmployees: number;
  totalAuditLogs?: number;
  criticalAlerts?: number;
  systemUptime?: number;
  activeUsers?: number;
}

export interface OrderRow {
  id: string;
  order_number: string;
  customer: string;
  product: string;
  total_uzs: number;
  order_status: string;
  branch: string;
  order_date: string;
}

export interface TicketRow {
  id: string;
  ticket_number: string;
  customer: string;
  device: string;
  issue: string;
  ticket_status: string;
  days_open: number;
}

export interface LowStockRow {
  id: string;
  name: string;
  sku: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
}

export interface DailySalesPoint {
  date: string;
  sales: number;
  profit: number;
}

export interface TopProductCategory {
  name: string;
  value: number;
  color: string;
}

export interface MonthlyBranchPoint {
  month: string;
  tashkent: number;
  samarkand: number;
  namangan: number;
}

export interface DashboardData {
  kpi: KPIData;
  recentOrders: OrderRow[];
  serviceTickets: TicketRow[];
  lowStockItems: LowStockRow[];
  dailySales: DailySalesPoint[];
  topProducts: TopProductCategory[];
  monthlyRevenue: MonthlyBranchPoint[];
  loading: boolean;
  chartsLoading: boolean;
  tableLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  'IP Cameras': 'var(--primary)',
  'DVR / NVR': 'var(--accent)',
  'Cables & Acc.': 'var(--success)',
  'PTZ Cameras': '#a78bfa',
  'Other': 'var(--muted-foreground)',
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} ${MONTH_LABELS[d.getMonth()]}`;
}

function subtractDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - days);
  return r;
}

// ─── Smart in-memory cache ───────────────────────────────────────────────────
interface CacheEntry<T> {
  data: T;
  ts: number;
}
const _cache: Record<string, CacheEntry<any>> = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = _cache[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { delete _cache[key]; return null; }
  return entry.data as T;
}
function setCache<T>(key: string, data: T): void {
  _cache[key] = { data, ts: Date.now() };
}
function invalidateCache(prefix: string): void {
  Object.keys(_cache).forEach(k => { if (k.startsWith(prefix)) delete _cache[k]; });
}

const DEFAULT_KPI: KPIData = {
  todaySales: 0, todayProfit: 0, monthlySales: 0, monthlyProfit: 0,
  overdueInvoices: 0, overdueAmount: 0, devicesInService: 0, readyForPickup: 0,
  warehouseSkus: 0, lowStockCount: 0, todayInstallations: 0, completedInstallations: 0,
  inProgressInstallations: 0, activeEmployees: 0, totalEmployees: 0,
  lateEmployees: 0, absentEmployees: 0,
  totalAuditLogs: 0, criticalAlerts: 0, systemUptime: 99.9, activeUsers: 0,
};

export function useDashboardData(role?: string | null): DashboardData {
  const [state, setState] = useState<DashboardData>({
    kpi: DEFAULT_KPI,
    recentOrders: [], serviceTickets: [], lowStockItems: [],
    dailySales: [], topProducts: [], monthlyRevenue: [],
    loading: true, chartsLoading: true, tableLoading: true,
    error: null, lastUpdated: null,
  });

  const supabase = createClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Phase 1: critical KPIs + tables ──────────────────────────────────────
  const fetchCritical = useCallback(async (forceRefresh = false) => {
    const cacheKey = `dashboard_critical_${role || 'all'}`;
    if (!forceRefresh) {
      const cached = getCached<Partial<DashboardData>>(cacheKey);
      if (cached) {
        setState(prev => ({ ...prev, ...cached, loading: false, tableLoading: false }));
        return;
      }
    }
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const last14 = subtractDays(today, 13).toISOString().split('T')[0];

      const needsHR = !role || role === 'Admin' || role === 'Manager';
      const isAdmin = role === 'Admin';

      const queries: PromiseLike<any>[] = [
        supabase.from('orders').select('*').order('order_date', { ascending: false }).limit(8),
        supabase.from('service_tickets').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('orders').select('total_uzs, order_status, order_date, branch').gte('order_date', last14).order('order_date', { ascending: true }),
      ];
      if (needsHR) {
        queries.push(
          supabase.from('employees').select('id, is_active'),
          supabase.from('attendance').select('attendance_status').eq('attendance_date', todayStr),
          supabase.from('installations').select('installation_status').eq('installation_date', todayStr),
        );
      }
      if (isAdmin) {
        queries.push(
          supabase.from('audit_logs').select('id', { count: 'exact', head: true }),
          supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('is_resolved', false),
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        );
      }

      const results = await Promise.all(queries);
      let idx = 0;
      const orders: OrderRow[] = results[idx++]?.data || [];
      const tickets: TicketRow[] = results[idx++]?.data || [];
      const allOrders: OrderRow[] = results[idx++]?.data || [];

      const todayOrders = allOrders.filter(o => o.order_date === todayStr);
      const todaySales = todayOrders.reduce((s, o: any) => s + (o.total_uzs || 0), 0);
      const todayProfit = Math.round(todaySales * 0.25);
      const monthOrders = allOrders.filter(o => o.order_date >= monthStart);
      const monthlySales = monthOrders.reduce((s, o: any) => s + (o.total_uzs || 0), 0);
      const monthlyProfit = Math.round(monthlySales * 0.25);
      const overdueOrders = orders.filter((o: any) => o.order_status === 'overdue');
      const overdueInvoices = overdueOrders.length;
      const overdueAmount = overdueOrders.reduce((s, o: any) => s + (o.total_uzs || 0), 0);
      const devicesInService = tickets.length;
      const readyForPickup = tickets.filter((t: any) => t.ticket_status === 'ready').length;

      const dailySalesMap: Record<string, { sales: number; profit: number }> = {};
      for (let i = 13; i >= 0; i--) {
        const d = subtractDays(today, i);
        dailySalesMap[d.toISOString().split('T')[0]] = { sales: 0, profit: 0 };
      }
      allOrders.forEach((o: any) => {
        if (dailySalesMap[o.order_date] !== undefined) {
          dailySalesMap[o.order_date].sales += o.total_uzs || 0;
          dailySalesMap[o.order_date].profit += Math.round((o.total_uzs || 0) * 0.25);
        }
      });
      const dailySales: DailySalesPoint[] = Object.entries(dailySalesMap).map(([dateStr, vals]) => ({
        date: formatDate(new Date(dateStr)), sales: vals.sales, profit: vals.profit,
      }));

      let totalEmployees = 0, activeEmployees = 0, lateEmployees = 0, absentEmployees = 0;
      let todayInstallations = 0, completedInstallations = 0, inProgressInstallations = 0;
      if (needsHR) {
        const employees = results[idx++]?.data || [];
        const attendance = results[idx++]?.data || [];
        const installations = results[idx++]?.data || [];
        totalEmployees = employees.filter((e: any) => e.is_active).length;
        activeEmployees = attendance.filter((a: any) => a.attendance_status === 'present' || a.attendance_status === 'late').length;
        lateEmployees = attendance.filter((a: any) => a.attendance_status === 'late').length;
        absentEmployees = attendance.filter((a: any) => a.attendance_status === 'absent').length;
        todayInstallations = installations.length;
        completedInstallations = installations.filter((i: any) => i.installation_status === 'completed').length;
        inProgressInstallations = installations.filter((i: any) => i.installation_status === 'in_progress').length;
      }

      let totalAuditLogs = 0, criticalAlerts = 0, activeUsers = 0;
      if (isAdmin) {
        totalAuditLogs = results[idx++]?.count || 0;
        criticalAlerts = results[idx++]?.count || 0;
        activeUsers = results[idx++]?.count || 0;
      }

      const criticalData: Partial<DashboardData> = {
        kpi: {
          todaySales, todayProfit, monthlySales, monthlyProfit,
          overdueInvoices, overdueAmount, devicesInService, readyForPickup,
          warehouseSkus: 0, lowStockCount: 0,
          todayInstallations, completedInstallations, inProgressInstallations,
          activeEmployees, totalEmployees, lateEmployees, absentEmployees,
          totalAuditLogs, criticalAlerts, systemUptime: 99.9, activeUsers,
        },
        recentOrders: orders,
        serviceTickets: tickets,
        dailySales,
        lastUpdated: new Date(),
      };
      setCache(cacheKey, criticalData);
      setState(prev => ({ ...prev, ...criticalData, loading: false, tableLoading: false }));
    } catch (err: any) {
      setState(prev => ({ ...prev, loading: false, tableLoading: false, error: err?.message || 'Failed to load dashboard data' }));
    }
  }, [role]);

  // ── Phase 2: heavy chart data (deferred) ─────────────────────────────────
  const fetchCharts = useCallback(async (forceRefresh = false) => {
    const cacheKey = `dashboard_charts_${role || 'all'}`;
    if (!forceRefresh) {
      const cached = getCached<Partial<DashboardData>>(cacheKey);
      if (cached) {
        setState(prev => ({ ...prev, ...cached, chartsLoading: false }));
        return;
      }
    }
    try {
      const today = new Date();
      const yearStart = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
      const [productsRes, yearOrdersRes] = await Promise.all([
        supabase.from('products').select('id, name, category, price_uzs, current_stock, minimum_stock, sku, unit').order('current_stock', { ascending: true }),
        supabase.from('orders').select('total_uzs, branch, order_date').gte('order_date', yearStart),
      ]);

      const products = productsRes.data || [];
      const yearOrders = yearOrdersRes.data || [];
      const warehouseSkus = products.length;
      const lowStockItems = products.filter((p: any) => p.current_stock < p.minimum_stock);
      const lowStockCount = lowStockItems.length;

      const categoryTotals: Record<string, number> = {};
      products.forEach((p: any) => {
        const cat = p.category || 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + ((p.price_uzs || 0) * (p.current_stock || 0));
      });
      const totalValue = Object.values(categoryTotals).reduce((s, v) => s + v, 0) || 1;
      const topProducts: TopProductCategory[] = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([name, value]) => ({
          name, value: Math.round((value / totalValue) * 100),
          color: CATEGORY_COLORS[name] || 'var(--muted-foreground)',
        }));

      const monthlyMap: Record<string, { tashkent: number; samarkand: number; namangan: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap[key] = { tashkent: 0, samarkand: 0, namangan: 0 };
      }
      yearOrders.forEach((o: any) => {
        const key = o.order_date?.substring(0, 7);
        if (key && monthlyMap[key]) {
          const branch = (o.branch || '').toLowerCase();
          const val = Math.round((o.total_uzs || 0) / 1_000_000);
          if (branch.includes('samarkand')) monthlyMap[key].samarkand += val;
          else if (branch.includes('namangan')) monthlyMap[key].namangan += val;
          else monthlyMap[key].tashkent += val;
        }
      });
      const monthlyRevenue: MonthlyBranchPoint[] = Object.entries(monthlyMap).map(([key, vals]) => {
        const [, month] = key.split('-');
        return { month: MONTH_LABELS[parseInt(month, 10) - 1], ...vals };
      });

      const chartData: Partial<DashboardData> = {
        topProducts: topProducts.length > 0 ? topProducts : [
          { name: 'IP Cameras', value: 38, color: 'var(--primary)' },
          { name: 'DVR / NVR', value: 24, color: 'var(--accent)' },
          { name: 'Cables & Acc.', value: 18, color: 'var(--success)' },
          { name: 'PTZ Cameras', value: 12, color: '#a78bfa' },
          { name: 'Other', value: 8, color: 'var(--muted-foreground)' },
        ],
        monthlyRevenue,
        lowStockItems: lowStockItems.slice(0, 5),
      };
      setCache(cacheKey, chartData);
      setState(prev => ({
        ...prev, ...chartData,
        kpi: { ...prev.kpi, warehouseSkus, lowStockCount },
        chartsLoading: false,
      }));
    } catch {
      setState(prev => ({ ...prev, chartsLoading: false }));
    }
  }, [role]);

  // ── Debounced realtime refresh ────────────────────────────────────────────
  const scheduleRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      invalidateCache('dashboard_');
      fetchCritical(true);
      fetchCharts(true);
    }, 1500);
  }, [fetchCritical, fetchCharts]);

  useEffect(() => {
    fetchCritical();
    const chartTimer = setTimeout(() => fetchCharts(), 400);

    let channel: any = null;
    try {
      channel = supabase
        .channel('dashboard_consolidated')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'service_tickets' }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'installations' }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, scheduleRefresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, scheduleRefresh)
        .subscribe();
    } catch {
      // Realtime subscriptions are optional — don't crash the dashboard
    }

    return () => {
      clearTimeout(chartTimer);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchCritical, fetchCharts, scheduleRefresh]);

  return state;
}
