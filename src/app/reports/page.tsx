'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import { useLanguage } from '@/context/LanguageContext';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReportType {
  key: string;
  labelKey: string;
  icon: string;
  descKey: string;
  color: string;
}

const reportTypes: ReportType[] = [
  { key: 'sales', labelKey: 'reports_sales', icon: 'ShoppingCartIcon', descKey: 'reports_sales_desc', color: 'var(--primary)' },
  { key: 'installation', labelKey: 'reports_installation', icon: 'WrenchScrewdriverIcon', descKey: 'reports_installation_desc', color: '#f97316' },
  { key: 'warehouse', labelKey: 'reports_warehouse', icon: 'BuildingStorefrontIcon', descKey: 'reports_warehouse_desc', color: 'var(--success)' },
  { key: 'service', labelKey: 'reports_service', icon: 'CogIcon', descKey: 'reports_service_desc', color: 'var(--warning)' },
  { key: 'employees', labelKey: 'reports_employees', icon: 'UserGroupIcon', descKey: 'reports_employees_desc', color: '#8b5cf6' },
  { key: 'payroll', labelKey: 'reports_payroll', icon: 'BanknotesIcon', descKey: 'reports_payroll_desc', color: '#06b6d4' },
  { key: 'finance', labelKey: 'reports_finance', icon: 'ChartBarIcon', descKey: 'reports_finance_desc', color: '#ec4899' },
];

const reportLabels: Record<string, string> = {
  sales: 'Savdo hisoboti',
  installation: 'Montaj hisoboti',
  warehouse: 'Ombor hisoboti',
  service: 'Servis hisoboti',
  employees: 'Xodimlar hisoboti',
  payroll: 'Ish haqi hisoboti',
  finance: 'Moliya hisoboti',
};

const formatUZS = (n: number) => {
  if (n >= 1000000000) return (n / 1000000000).toFixed(1) + 'B UZS';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M UZS';
  return new Intl.NumberFormat('en-US').format(n) + ' UZS';
};

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: 'bg-green-500/20 text-green-400',
    Paid: 'bg-green-500/20 text-green-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    Pending: 'bg-yellow-500/20 text-yellow-400',
    partial: 'bg-blue-500/20 text-blue-400',
    Partial: 'bg-blue-500/20 text-blue-400',
    confirmed: 'bg-blue-500/20 text-blue-400',
    overdue: 'bg-red-500/20 text-red-400',
    cancelled: 'bg-red-500/20 text-red-400',
    in_progress: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-green-500/20 text-green-400',
    active: 'bg-green-500/20 text-green-400',
    Active: 'bg-green-500/20 text-green-400',
    inactive: 'bg-red-500/20 text-red-400',
    Inactive: 'bg-red-500/20 text-red-400',
    income: 'bg-green-500/20 text-green-400',
    expense: 'bg-red-500/20 text-red-400',
    'Low Stock': 'bg-orange-500/20 text-orange-400',
    'Out of Stock': 'bg-red-500/20 text-red-400',
    'In Stock': 'bg-green-500/20 text-green-400',
    ready: 'bg-cyan-500/20 text-cyan-400',
    repairing: 'bg-yellow-500/20 text-yellow-400',
    service: 'bg-blue-500/20 text-blue-400',
  };
  const labelMap: Record<string, string> = {
    pending: 'Kutilmoqda',
    in_progress: 'Jarayonda',
    completed: 'Bajarildi',
    cancelled: 'Bekor',
    active: 'Faol',
    inactive: 'Nofaol',
    paid: 'To\'langan',
    partial: 'Qisman',
    confirmed: 'Tasdiqlangan',
    overdue: 'Muddati o\'tgan',
    income: 'Kirim',
    expense: 'Chiqim',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-secondary text-muted-foreground'}`}>
      {labelMap[status] ?? status}
    </span>
  );
}

export default function ReportsPage() {
  const { t } = useLanguage();
  const supabase = createClient();

  const [activeReport, setActiveReport] = useState('sales');
  const [dateRange, setDateRange] = useState('month');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Data states
  const [salesData, setSalesData] = useState<any[]>([]);
  const [warehouseData, setWarehouseData] = useState<any[]>([]);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [serviceData, setServiceData] = useState<any[]>([]);
  const [employeesData, setEmployeesData] = useState<any[]>([]);
  const [financeData, setFinanceData] = useState<any[]>([]);
  const [installationData, setInstallationData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const fetchReportData = useCallback(async (reportKey: string) => {
    setDataLoading(true);
    try {
      if (reportKey === 'sales') {
        const { data } = await supabase.from('orders').select('*').order('order_date', { ascending: false }).limit(200);
        setSalesData(data || []);
      } else if (reportKey === 'installation') {
        const { data } = await supabase.from('installations').select('*').order('installation_date', { ascending: false }).limit(200);
        setInstallationData(data || []);
      } else if (reportKey === 'warehouse') {
        const { data } = await supabase.from('warehouse_stock').select('*, products(name, category)').order('updated_at', { ascending: false }).limit(200);
        setWarehouseData(data || []);
      } else if (reportKey === 'payroll') {
        const { data } = await supabase.from('payroll_records').select('*').order('pay_month', { ascending: false }).limit(200);
        setPayrollData(data || []);
      } else if (reportKey === 'service') {
        const { data } = await supabase.from('service_tickets').select('*').order('created_at', { ascending: false }).limit(200);
        setServiceData(data || []);
      } else if (reportKey === 'employees') {
        const { data } = await supabase.from('employees').select('*').order('full_name', { ascending: true });
        setEmployeesData(data || []);
      } else if (reportKey === 'finance') {
        const { data } = await supabase.from('transactions').select('*').order('transaction_date', { ascending: false }).limit(200);
        setFinanceData(data || []);
      }
    } catch {
      // silently fail — show empty state
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData(activeReport);
  }, [activeReport, fetchReportData]);

  const periodLabel = `${dateRange.charAt(0).toUpperCase() + dateRange.slice(1)} — ${new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;

  // ── Filtered data ──
  const filteredSales = salesData.filter((row) => {
    const matchStatus = statusFilter === 'all' || row.order_status?.toLowerCase() === statusFilter.toLowerCase();
    const matchSearch = !searchQuery || row.customer?.toLowerCase().includes(searchQuery.toLowerCase()) || row.order_number?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const filteredInstallation = installationData.filter((row) => {
    const matchStatus = statusFilter === 'all' || row.installation_status === statusFilter;
    const matchSearch = !searchQuery || row.customer?.toLowerCase().includes(searchQuery.toLowerCase()) || row.address?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const filteredWarehouse = warehouseData.filter((row) => {
    const qty = row.quantity ?? 0;
    const minStock = row.min_stock ?? 0;
    const stockStatus = qty === 0 ? 'outofstock' : qty < minStock ? 'lowstock' : 'instock';
    const matchStatus = statusFilter === 'all' || stockStatus === statusFilter.toLowerCase().replace(' ', '');
    const productName = row.products?.name || '';
    const matchSearch = !searchQuery || productName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const filteredPayroll = payrollData.filter((row) => {
    const matchSearch = !searchQuery || row.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) || row.position?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  const filteredService = serviceData.filter((row) => {
    const matchSearch = !searchQuery || row.customer?.toLowerCase().includes(searchQuery.toLowerCase()) || row.ticket_number?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  const filteredEmployees = employeesData.filter((row) => {
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? row.is_active : !row.is_active);
    const matchSearch = !searchQuery || row.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || row.position?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const filteredFinance = financeData.filter((row) => {
    const matchType = statusFilter === 'all' || row.transaction_type === statusFilter;
    const matchSearch = !searchQuery || row.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  // ── CSV Export ──
  const handleCSVExport = () => {
    if (activeReport === 'sales') {
      exportToCSV(`sales-report`, ['Order #', 'Customer', 'Product', 'Total (UZS)', 'Status', 'Date'], [], filteredSales.map((r) => [r.order_number, r.customer, r.product, r.total_uzs, r.order_status, r.order_date]));
    } else if (activeReport === 'installation') {
      exportToCSV(`installation-report`, ['Mijoz', 'Manzil', 'Holat', 'Sana', 'Filial'], [], filteredInstallation.map((r) => [r.customer, r.address, r.installation_status, r.installation_date, r.branch]));
    } else if (activeReport === 'warehouse') {
      exportToCSV(`warehouse-report`, ['Product', 'Category', 'Qty', 'Min Stock', 'Warehouse'], [], filteredWarehouse.map((r) => [r.products?.name || '—', r.products?.category || '—', r.quantity, r.min_stock, r.warehouse_name]));
    } else if (activeReport === 'payroll') {
      exportToCSV(`payroll-report`, ['Employee', 'Position', 'Department', 'Base', 'Bonus', 'Net', 'Month'], [], filteredPayroll.map((r) => [r.employee_name, r.position, r.department, r.base_salary, r.bonus, r.net_salary, r.pay_month]));
    } else if (activeReport === 'service') {
      exportToCSV(`service-report`, ['Ticket #', 'Customer', 'Device', 'Technician', 'Status', 'Cost'], [], filteredService.map((r) => [r.ticket_number, r.customer, r.device, r.technician, r.ticket_status, r.cost]));
    } else if (activeReport === 'employees') {
      exportToCSV(`employees-report`, ['Name', 'Position', 'Branch', 'Status'], [], filteredEmployees.map((r) => [r.full_name, r.position, r.branch, r.is_active ? 'Active' : 'Inactive']));
    } else if (activeReport === 'finance') {
      exportToCSV(`finance-report`, ['Date', 'Description', 'Category', 'Type', 'Amount', 'Account'], [], filteredFinance.map((r) => [r.transaction_date, r.description, r.category, r.transaction_type, r.amount, r.account]));
    }
  };

  // ── PDF Export ──
  const handlePDFExport = async () => {
    setIsExporting(true);
    try {
      if (activeReport === 'sales') {
        const totalRevenue = filteredSales.reduce((s, r) => s + (r.total_uzs || 0), 0);
        await exportToPDF({
          title: 'Savdo hisoboti', period: periodLabel, companyName: 'CCTV ERP PRO',
          headers: ['Order #', 'Customer', 'Product', 'Total (UZS)', 'Status', 'Date'],
          rows: filteredSales.map((r) => [r.order_number, r.customer, r.product, formatUZS(r.total_uzs || 0), r.order_status, r.order_date]),
          filename: `sales-report`,
          summaryRows: [{ label: 'Total Orders', value: String(filteredSales.length) }, { label: 'Total Revenue', value: formatUZS(totalRevenue) }],
        });
      } else if (activeReport === 'installation') {
        await exportToPDF({
          title: 'Montaj hisoboti', period: periodLabel, companyName: 'CCTV ERP PRO',
          headers: ['Mijoz', 'Manzil', 'Holat', 'Sana', 'Filial'],
          rows: filteredInstallation.map((r) => [r.customer, r.address, r.installation_status, r.installation_date, r.branch]),
          filename: `installation-report`,
          summaryRows: [
            { label: 'Jami', value: String(filteredInstallation.length) },
            { label: 'Bajarildi', value: String(filteredInstallation.filter((r) => r.installation_status === 'completed').length) },
          ],
        });
      } else if (activeReport === 'payroll') {
        const totalNet = filteredPayroll.reduce((s, r) => s + (r.net_salary || 0), 0);
        await exportToPDF({
          title: 'Ish haqi hisoboti', period: periodLabel, companyName: 'CCTV ERP PRO',
          headers: ['Employee', 'Position', 'Department', 'Base', 'Bonus', 'Net', 'Month'],
          rows: filteredPayroll.map((r) => [r.employee_name, r.position, r.department, formatUZS(r.base_salary || 0), formatUZS(r.bonus || 0), formatUZS(r.net_salary || 0), r.pay_month]),
          filename: `payroll-report`,
          summaryRows: [{ label: 'Total Payroll', value: formatUZS(totalNet) }, { label: 'Employees', value: String(filteredPayroll.length) }],
        });
      } else {
        await exportToPDF({
          title: reportLabels[activeReport] ?? activeReport,
          period: periodLabel, companyName: 'CCTV ERP PRO',
          headers: ['Report', 'Period', 'Generated At'],
          rows: [[activeReport, periodLabel, new Date().toLocaleString()]],
          filename: `${activeReport}-report`,
        });
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t.reports_title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t.reports_subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--secondary)' }}>
              {['week', 'month', 'quarter', 'year'].map((r) => (
                <button key={r} onClick={() => setDateRange(r)} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize ${dateRange === r ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{r}</button>
              ))}
            </div>
            <button onClick={handleCSVExport} className="btn-secondary flex items-center gap-2 text-sm">
              <AppIcon name="ArrowDownTrayIcon" size={15} />CSV
            </button>
            <button onClick={handlePDFExport} disabled={isExporting} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60">
              {isExporting ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> : <AppIcon name="DocumentArrowDownIcon" size={15} />}
              PDF
            </button>
          </div>
        </div>

        {/* ── Report Type Selector ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {reportTypes.map((rt) => (
            <button key={rt.key} onClick={() => { setActiveReport(rt.key); setStatusFilter('all'); setSearchQuery(''); }}
              className={`card p-4 text-left transition-all ${activeReport === rt.key ? 'border-primary/50' : 'hover:border-primary/20'}`}
              style={activeReport === rt.key ? { borderColor: rt.color, background: `${rt.color}10` } : {}}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${rt.color}20` }}>
                <AppIcon name={rt.icon as any} size={16} style={{ color: rt.color }} />
              </div>
              <p className="text-xs font-semibold text-foreground leading-tight">{reportLabels[rt.key] ?? rt.key}</p>
            </button>
          ))}
        </div>

        {/* ── Filter toolbar ── */}
        <div className="card p-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <AppIcon name="MagnifyingGlassIcon" size={15} className="text-muted-foreground" />
            <input type="text" placeholder="Qidirish..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1" />
          </div>
          {activeReport === 'sales' && (
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground outline-none">
              <option value="all">Barchasi</option>
              <option value="paid">To'langan</option>
              <option value="partial">Qisman</option>
              <option value="confirmed">Tasdiqlangan</option>
              <option value="overdue">Muddati o'tgan</option>
            </select>
          )}
          {activeReport === 'installation' && (
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground outline-none">
              <option value="all">Barchasi</option>
              <option value="pending">Rejalashtirilgan</option>
              <option value="in_progress">Jarayonda</option>
              <option value="completed">Bajarildi</option>
              <option value="cancelled">Bekor qilindi</option>
            </select>
          )}
          {activeReport === 'warehouse' && (
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground outline-none">
              <option value="all">Barchasi</option>
              <option value="instock">Mavjud</option>
              <option value="lowstock">Kam qoldi</option>
              <option value="outofstock">Tugagan</option>
            </select>
          )}
          {activeReport === 'employees' && (
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground outline-none">
              <option value="all">Barchasi</option>
              <option value="active">Faol</option>
              <option value="inactive">Nofaol</option>
            </select>
          )}
          {activeReport === 'finance' && (
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground outline-none">
              <option value="all">Barchasi</option>
              <option value="income">Kirim</option>
              <option value="expense">Chiqim</option>
            </select>
          )}
        </div>

        {dataLoading ? (
          <div className="card p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">Ma'lumotlar yuklanmoqda...</p>
          </div>
        ) : (
          <>
            {/* ── Sales Report ── */}
            {activeReport === 'sales' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Jami daromad', value: formatUZS(filteredSales.reduce((s, r) => s + (r.total_uzs || 0), 0)), color: 'var(--primary)' },
                    { label: 'Buyurtmalar', value: String(filteredSales.length), color: 'var(--success)' },
                    { label: "To'langan", value: String(filteredSales.filter((r) => r.order_status === 'paid').length), color: 'var(--success)' },
                    { label: 'Kutilmoqda', value: String(filteredSales.filter((r) => ['confirmed', 'partial'].includes(r.order_status)).length), color: 'var(--warning)' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="card p-4">
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      <p className="text-xl font-bold mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
                    </div>
                  ))}
                </div>
                <div className="card overflow-hidden">
                  <div className="p-4 border-b border-border"><h3 className="font-semibold text-foreground text-sm">Buyurtmalar</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border">{['Order #', 'Mijoz', 'Mahsulot', 'Jami', 'Holat', 'Sana'].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                      <tbody>
                        {filteredSales.map((row) => (
                          <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3 text-xs font-mono text-primary">{row.order_number}</td>
                            <td className="px-4 py-3 text-xs text-foreground">{row.customer}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{row.product}</td>
                            <td className="px-4 py-3 text-xs font-semibold text-foreground">{formatUZS(row.total_uzs || 0)}</td>
                            <td className="px-4 py-3"><StatusPill status={row.order_status} /></td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{row.order_date}</td>
                          </tr>
                        ))}
                        {filteredSales.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Ma'lumot topilmadi</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── Installation Report ── */}
            {activeReport === 'installation' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Jami montajlar', value: String(filteredInstallation.length), color: '#f97316' },
                    { label: 'Rejalashtirilgan', value: String(filteredInstallation.filter((r) => r.installation_status === 'pending').length), color: 'var(--primary)' },
                    { label: 'Jarayonda', value: String(filteredInstallation.filter((r) => r.installation_status === 'in_progress').length), color: 'var(--warning)' },
                    { label: 'Bajarildi', value: String(filteredInstallation.filter((r) => r.installation_status === 'completed').length), color: 'var(--success)' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="card p-4">
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      <p className="text-xl font-bold mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
                    </div>
                  ))}
                </div>
                <div className="card overflow-hidden">
                  <div className="p-4 border-b border-border"><h3 className="font-semibold text-foreground text-sm">Montaj vazifalari</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border">{['Mijoz', 'Manzil', 'Holat', 'Sana', 'Filial'].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}</tr></thead>
                      <tbody>
                        {filteredInstallation.map((row) => (
                          <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3 text-xs text-foreground font-medium">{row.customer}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{row.address}</td>
                            <td className="px-4 py-3"><StatusPill status={row.installation_status} /></td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{row.installation_date}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{row.branch || '—'}</td>
                          </tr>
                        ))}
                        {filteredInstallation.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Ma'lumot topilmadi</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── Warehouse Report ── */}
            {activeReport === 'warehouse' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Jami mahsulotlar', value: String(filteredWarehouse.length), color: 'var(--primary)' },
                    { label: 'Mavjud', value: String(filteredWarehouse.filter((r) => r.quantity > r.min_stock).length), color: 'var(--success)' },
                    { label: 'Kam qoldi', value: String(filteredWarehouse.filter((r) => r.quantity > 0 && r.quantity <= r.min_stock).length), color: 'var(--warning)' },
                    { label: 'Tugagan', value: String(filteredWarehouse.filter((r) => r.quantity === 0).length), color: 'var(--danger)' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="card p-4">
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      <p className="text-xl font-bold mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
                    </div>
                  ))}
                </div>
                <div className="card overflow-hidden">
                  <div className="p-4 border-b border-border"><h3 className="font-semibold text-foreground text-sm">Inventar</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border">{['Mahsulot', 'Kategoriya', 'Miqdor', 'Min miqdor', 'Ombor', 'Holat'].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                      <tbody>
                        {filteredWarehouse.map((row) => {
                          const stockStatus = row.quantity === 0 ? 'Out of Stock' : row.quantity <= row.min_stock ? 'Low Stock' : 'In Stock';
                          return (
                            <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                              <td className="px-4 py-3 text-xs text-foreground font-medium">{row.products?.name || '—'}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{row.products?.category || '—'}</td>
                              <td className="px-4 py-3 text-xs font-semibold text-foreground">{row.quantity} {row.unit}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{row.min_stock}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{row.warehouse_name}</td>
                              <td className="px-4 py-3"><StatusPill status={stockStatus} /></td>
                            </tr>
                          );
                        })}
                        {filteredWarehouse.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Ma'lumot topilmadi</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── Payroll Report ── */}
            {activeReport === 'payroll' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Jami ish haqi', value: formatUZS(filteredPayroll.reduce((s, r) => s + (r.net_salary || 0), 0)), color: '#06b6d4' },
                    { label: 'Bonuslar', value: formatUZS(filteredPayroll.reduce((s, r) => s + (r.bonus || 0), 0)), color: 'var(--success)' },
                    { label: 'Ushlanmalar', value: formatUZS(filteredPayroll.reduce((s, r) => s + (r.penalty || 0) + (r.tax || 0), 0)), color: 'var(--danger)' },
                    { label: 'Xodimlar', value: String(filteredPayroll.length), color: 'var(--primary)' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="card p-4">
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      <p className="text-xl font-bold mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
                    </div>
                  ))}
                </div>
                <div className="card overflow-hidden">
                  <div className="p-4 border-b border-border"><h3 className="font-semibold text-foreground text-sm">Ish haqi yozuvlari</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border">{['Xodim', 'Lavozim', 'Bo\'lim', 'Asosiy', 'Bonus', 'Soliq', 'Sof', 'Oy', 'Holat'].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}</tr></thead>
                      <tbody>
                        {filteredPayroll.map((row) => (
                          <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3 text-xs text-foreground font-medium">{row.employee_name}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{row.position}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{row.department}</td>
                            <td className="px-4 py-3 text-xs text-foreground">{formatUZS(row.base_salary || 0)}</td>
                            <td className="px-4 py-3 text-xs text-green-400">{formatUZS(row.bonus || 0)}</td>
                            <td className="px-4 py-3 text-xs text-red-400">{formatUZS(row.tax || 0)}</td>
                            <td className="px-4 py-3 text-xs font-bold text-foreground">{formatUZS(row.net_salary || 0)}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{row.pay_month}</td>
                            <td className="px-4 py-3"><StatusPill status={row.pay_status || 'pending'} /></td>
                          </tr>
                        ))}
                        {filteredPayroll.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-sm text-muted-foreground">Ma'lumot topilmadi</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── Service Report ── */}
            {activeReport === 'service' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Jami talablar', value: String(filteredService.length), color: 'var(--primary)' },
                    { label: 'Jarayonda', value: String(filteredService.filter((r) => ['pending', 'repairing', 'service'].includes(r.ticket_status)).length), color: 'var(--warning)' },
                    { label: 'Tayyor', value: String(filteredService.filter((r) => r.ticket_status === 'ready').length), color: 'var(--success)' },
                    { label: 'Bajarildi', value: String(filteredService.filter((r) => r.ticket_status === 'completed').length), color: '#64748b' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="card p-4">
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      <p className="text-xl font-bold mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
                    </div>
                  ))}
                </div>
                <div className="card overflow-hidden">
                  <div className="p-4 border-b border-border"><h3 className="font-semibold text-foreground text-sm">Servis talabalari</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border">{['Ticket #', 'Mijoz', 'Qurilma', 'Texnik', 'Holat', 'Narx', 'Sana'].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>)}</tr></thead>
                      <tbody>
                        {filteredService.map((row) => (
                          <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3 text-xs font-mono text-primary">{row.ticket_number}</td>
                            <td className="px-4 py-3 text-xs text-foreground">{row.customer}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{row.device}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{row.technician || '—'}</td>
                            <td className="px-4 py-3"><StatusPill status={row.ticket_status} /></td>
                            <td className="px-4 py-3 text-xs text-foreground">{row.cost > 0 ? formatUZS(row.cost) : '—'}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{row.created_at?.split('T')[0]}</td>
                          </tr>
                        ))}
                        {filteredService.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Ma'lumot topilmadi</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── Employees Report ── */}
            {activeReport === 'employees' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Jami xodimlar', value: String(filteredEmployees.length), color: 'var(--primary)' },
                    { label: 'Faol', value: String(filteredEmployees.filter((r) => r.is_active).length), color: 'var(--success)' },
                    { label: 'Nofaol', value: String(filteredEmployees.filter((r) => !r.is_active).length), color: 'var(--danger)' },
                    { label: 'Filiallar', value: String(new Set(filteredEmployees.map((r) => r.branch).filter(Boolean)).size), color: '#8b5cf6' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="card p-4">
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      <p className="text-xl font-bold mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
                    </div>
                  ))}
                </div>
                <div className="card overflow-hidden">
                  <div className="p-4 border-b border-border"><h3 className="font-semibold text-foreground text-sm">Xodimlar</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border">{['Ism', 'Lavozim', 'Filial', 'Telefon', 'Holat'].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                      <tbody>
                        {filteredEmployees.map((row) => (
                          <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3 text-xs text-foreground font-medium">{row.full_name}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{row.position || '—'}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{row.branch || '—'}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{row.phone || '—'}</td>
                            <td className="px-4 py-3"><StatusPill status={row.is_active ? 'active' : 'inactive'} /></td>
                          </tr>
                        ))}
                        {filteredEmployees.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Ma'lumot topilmadi</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── Finance Report ── */}
            {activeReport === 'finance' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Jami kirim', value: formatUZS(filteredFinance.filter((r) => r.transaction_type === 'income').reduce((s, r) => s + (r.amount || 0), 0)), color: 'var(--success)' },
                    { label: 'Jami chiqim', value: formatUZS(filteredFinance.filter((r) => r.transaction_type === 'expense').reduce((s, r) => s + (r.amount || 0), 0)), color: 'var(--danger)' },
                    { label: 'Tranzaksiyalar', value: String(filteredFinance.length), color: 'var(--primary)' },
                    { label: 'Sof balans', value: formatUZS(filteredFinance.reduce((s, r) => r.transaction_type === 'income' ? s + (r.amount || 0) : s - (r.amount || 0), 0)), color: '#ec4899' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="card p-4">
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      <p className="text-xl font-bold mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
                    </div>
                  ))}
                </div>
                <div className="card overflow-hidden">
                  <div className="p-4 border-b border-border"><h3 className="font-semibold text-foreground text-sm">Tranzaksiyalar</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border">{['Sana', 'Tavsif', 'Kategoriya', 'Hisob', 'Tur', 'Miqdor'].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr></thead>
                      <tbody>
                        {filteredFinance.map((row) => (
                          <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3 text-xs text-muted-foreground">{row.transaction_date}</td>
                            <td className="px-4 py-3 text-xs text-foreground font-medium">{row.description}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{row.category}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{row.account}</td>
                            <td className="px-4 py-3"><StatusPill status={row.transaction_type} /></td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-bold ${row.transaction_type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                {row.transaction_type === 'income' ? '+' : '-'}{formatUZS(row.amount || 0)}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {filteredFinance.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Ma'lumot topilmadi</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
