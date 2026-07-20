'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import StatusBadge from '@/components/ui/StatusBadge';
import { useLanguage } from '@/context/LanguageContext';
import { createClient } from '@/lib/supabase/client';

interface Employee {
  id: string;
  full_name: string;
  position: string;
  department: string;
  branch: string;
}

interface SalaryConfig {
  id: string;
  employee_id: string;
  base_monthly_salary: number;
  daily_rate: number;
  work_type: 'monthly' | 'daily' | 'task_based';
  working_days_per_month: number;
}

interface AttendanceSummary {
  employee_id: string;
  present_days: number;
  late_days: number;
  absent_days: number;
  total_days: number;
}

interface PayrollRecord {
  id: string;
  employee_id: string | null;
  employee_name: string;
  position: string;
  department: string;
  base_salary: number;
  bonus: number;
  penalty: number;
  advance: number;
  overtime: number;
  tax: number;
  net_salary: number;
  calculated_salary: number;
  attendance_days: number;
  task_count: number;
  work_type: string;
  pay_month: string;
  pay_status: 'paid' | 'pending' | 'processing';
  created_at: string;
}

interface SalaryAdvance {
  id: string;
  employee_id: string;
  employee_name: string;
  amount: number;
  advance_date: string;
  pay_month: string;
  reason: string;
  status: 'given' | 'deducted';
  notes: string;
}

interface SalaryPayment {
  id: string;
  payroll_record_id: string;
  employee_id: string;
  employee_name: string;
  pay_month: string;
  amount_paid: number;
  payment_method: string;
  payment_date: string;
  notes: string;
}

type ActiveTab = 'payroll' | 'advances' | 'payments';

const formatUZS = (n: number) => new Intl.NumberFormat('uz-UZ').format(n) + ' UZS';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Naqd pul' },
  { value: 'bank_transfer', label: 'Bank o\'tkazmasi' },
  { value: 'card', label: 'Karta' },
];

const WORK_TYPES = [
  { value: 'monthly', label: 'Oylik (belgilangan)' },
  { value: 'daily', label: 'Kunlik (kelgan kuniga)' },
  { value: 'task_based', label: 'Ishga qarab' },
];

export default function PayrollPage() {
  const { t } = useLanguage();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<ActiveTab>('payroll');
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaryConfigs, setSalaryConfigs] = useState<SalaryConfig[]>([]);
  const [attendanceSummaries, setAttendanceSummaries] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  // Advance modal
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    employee_id: '',
    amount: '',
    advance_date: new Date().toISOString().split('T')[0],
    pay_month: selectedMonth,
    reason: '',
    notes: '',
  });
  const [savingAdvance, setSavingAdvance] = useState(false);

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<PayrollRecord | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount_paid: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [savingPayment, setSavingPayment] = useState(false);

  // Calculate salary modal
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [calcTarget, setCalcTarget] = useState<Employee | null>(null);
  const [calcForm, setCalcForm] = useState({
    work_type: 'monthly',
    base_salary: '',
    attendance_days: '',
    task_count: '',
    bonus: '',
    penalty: '',
    overtime: '',
    tax_rate: '12',
  });
  const [savingCalc, setSavingCalc] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [payrollRes, advancesRes, paymentsRes, empRes, configRes] = await Promise.all([
        supabase.from('payroll_records').select('*').eq('pay_month', selectedMonth).order('employee_name'),
        supabase.from('salary_advances').select('*').eq('pay_month', selectedMonth).order('advance_date', { ascending: false }),
        supabase.from('salary_payments').select('*').eq('pay_month', selectedMonth).order('payment_date', { ascending: false }),
        supabase.from('employees').select('id, full_name, position, department, branch').eq('is_active', true).order('full_name'),
        supabase.from('employee_salary_config').select('*'),
      ]);

      if (payrollRes.error) throw payrollRes.error;
      if (advancesRes.error) throw advancesRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      if (empRes.error) throw empRes.error;

      setRecords((payrollRes.data as PayrollRecord[]) || []);
      setAdvances((advancesRes.data as SalaryAdvance[]) || []);
      setPayments((paymentsRes.data as SalaryPayment[]) || []);
      setEmployees((empRes.data as Employee[]) || []);
      setSalaryConfigs((configRes.data as SalaryConfig[]) || []);

      // Fetch attendance for the selected month
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`;
      const attRes = await supabase
        .from('attendance')
        .select('employee_id, attendance_status')
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate);

      if (!attRes.error && attRes.data) {
        const summaryMap: Record<string, AttendanceSummary> = {};
        attRes.data.forEach((row: any) => {
          if (!summaryMap[row.employee_id]) {
            summaryMap[row.employee_id] = { employee_id: row.employee_id, present_days: 0, late_days: 0, absent_days: 0, total_days: 0 };
          }
          summaryMap[row.employee_id].total_days++;
          if (row.attendance_status === 'present') summaryMap[row.employee_id].present_days++;
          else if (row.attendance_status === 'late') summaryMap[row.employee_id].late_days++;
          else if (row.attendance_status === 'absent') summaryMap[row.employee_id].absent_days++;
        });
        setAttendanceSummaries(Object.values(summaryMap));
      }
    } catch (e: any) {
      setError(e?.message || 'Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getAttendance = (empId: string) =>
    attendanceSummaries.find((a) => a.employee_id === empId);

  const getSalaryConfig = (empId: string) =>
    salaryConfigs.find((c) => c.employee_id === empId);

  const computeCalcSalary = (
    workType: string,
    baseSalary: number,
    attendanceDays: number,
    taskCount: number,
    workingDaysPerMonth: number,
    dailyRate: number
  ) => {
    if (workType === 'monthly') return baseSalary;
    if (workType === 'daily') return attendanceDays * dailyRate;
    if (workType === 'task_based') return taskCount * dailyRate;
    return baseSalary;
  };

  const markAsPaid = async (id: string) => {
    setMarkingPaid(id);
    try {
      const { error: err } = await supabase
        .from('payroll_records')
        .update({ pay_status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (err) throw err;
      setRecords((prev) => prev.map((r) => r.id === id ? { ...r, pay_status: 'paid' } : r));
      setSelectedRecord((prev) => prev?.id === id ? { ...prev, pay_status: 'paid' } : prev);
      setSuccess('Oylik to\'landi deb belgilandi');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.message || 'Xatolik yuz berdi');
    } finally {
      setMarkingPaid(null);
    }
  };

  // Open calculate salary modal
  const openCalcModal = (emp: Employee) => {
    const config = getSalaryConfig(emp.id);
    const att = getAttendance(emp.id);
    setCalcTarget(emp);
    setCalcForm({
      work_type: config?.work_type || 'monthly',
      base_salary: String(config?.base_monthly_salary || ''),
      attendance_days: String(att ? att.present_days + att.late_days : ''),
      task_count: '',
      bonus: '',
      penalty: '',
      overtime: '',
      tax_rate: '12',
    });
    setShowCalcModal(true);
  };

  const saveCalcSalary = async () => {
    if (!calcTarget) return;
    setSavingCalc(true);
    try {
      const config = getSalaryConfig(calcTarget.id);
      const baseSalary = parseInt(calcForm.base_salary) || 0;
      const attendanceDays = parseInt(calcForm.attendance_days) || 0;
      const taskCount = parseInt(calcForm.task_count) || 0;
      const bonus = parseInt(calcForm.bonus) || 0;
      const penalty = parseInt(calcForm.penalty) || 0;
      const overtime = parseInt(calcForm.overtime) || 0;
      const taxRate = parseFloat(calcForm.tax_rate) || 12;
      const workingDays = config?.working_days_per_month || 26;
      const dailyRate = config?.daily_rate || Math.round(baseSalary / workingDays);

      const calculatedSalary = computeCalcSalary(
        calcForm.work_type, baseSalary, attendanceDays, taskCount, workingDays, dailyRate
      );
      const totalAdvance = advances
        .filter((a) => a.employee_id === calcTarget.id)
        .reduce((s, a) => s + a.amount, 0);
      const grossSalary = calculatedSalary + bonus + overtime;
      const tax = Math.round(grossSalary * taxRate / 100);
      const netSalary = grossSalary - penalty - totalAdvance - tax;

      // Check if record already exists for this month
      const existing = records.find((r) => r.employee_id === calcTarget.id);

      if (existing) {
        const { error: err } = await supabase
          .from('payroll_records')
          .update({
            base_salary: baseSalary,
            bonus,
            penalty,
            advance: totalAdvance,
            overtime,
            tax,
            net_salary: netSalary,
            calculated_salary: calculatedSalary,
            attendance_days: attendanceDays,
            task_count: taskCount,
            work_type: calcForm.work_type,
            pay_status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('payroll_records')
          .insert({
            employee_id: calcTarget.id,
            employee_name: calcTarget.full_name,
            position: calcTarget.position,
            department: calcTarget.department,
            base_salary: baseSalary,
            bonus,
            penalty,
            advance: totalAdvance,
            overtime,
            tax,
            net_salary: netSalary,
            calculated_salary: calculatedSalary,
            attendance_days: attendanceDays,
            task_count: taskCount,
            work_type: calcForm.work_type,
            pay_month: selectedMonth,
            pay_status: 'pending',
          });
        if (err) throw err;
      }

      setShowCalcModal(false);
      setSuccess('Oylik muvaffaqiyatli hisoblandi');
      setTimeout(() => setSuccess(null), 3000);
      fetchAll();
    } catch (e: any) {
      setError(e?.message || 'Xatolik yuz berdi');
    } finally {
      setSavingCalc(false);
    }
  };

  // Advance
  const saveAdvance = async () => {
    if (!advanceForm.employee_id || !advanceForm.amount) return;
    setSavingAdvance(true);
    try {
      const emp = employees.find((e) => e.id === advanceForm.employee_id);
      const { error: err } = await supabase.from('salary_advances').insert({
        employee_id: advanceForm.employee_id,
        employee_name: emp?.full_name || '',
        amount: parseInt(advanceForm.amount),
        advance_date: advanceForm.advance_date,
        pay_month: advanceForm.pay_month || selectedMonth,
        reason: advanceForm.reason,
        notes: advanceForm.notes,
        status: 'given',
      });
      if (err) throw err;
      setShowAdvanceModal(false);
      setAdvanceForm({ employee_id: '', amount: '', advance_date: new Date().toISOString().split('T')[0], pay_month: selectedMonth, reason: '', notes: '' });
      setSuccess('Avans muvaffaqiyatli berildi');
      setTimeout(() => setSuccess(null), 3000);
      fetchAll();
    } catch (e: any) {
      setError(e?.message || 'Xatolik yuz berdi');
    } finally {
      setSavingAdvance(false);
    }
  };

  // Payment
  const openPaymentModal = (rec: PayrollRecord) => {
    setPaymentTarget(rec);
    setPaymentForm({
      amount_paid: String(rec.net_salary),
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowPaymentModal(true);
  };

  const savePayment = async () => {
    if (!paymentTarget) return;
    setSavingPayment(true);
    try {
      const { error: err } = await supabase.from('salary_payments').insert({
        payroll_record_id: paymentTarget.id,
        employee_id: paymentTarget.employee_id,
        employee_name: paymentTarget.employee_name,
        pay_month: paymentTarget.pay_month,
        amount_paid: parseInt(paymentForm.amount_paid),
        payment_method: paymentForm.payment_method,
        payment_date: paymentForm.payment_date,
        notes: paymentForm.notes,
      });
      if (err) throw err;

      // Mark payroll record as paid
      await supabase.from('payroll_records').update({ pay_status: 'paid', updated_at: new Date().toISOString() }).eq('id', paymentTarget.id);

      setShowPaymentModal(false);
      setPaymentTarget(null);
      setSuccess('To\'lov muvaffaqiyatli amalga oshirildi');
      setTimeout(() => setSuccess(null), 3000);
      fetchAll();
    } catch (e: any) {
      setError(e?.message || 'Xatolik yuz berdi');
    } finally {
      setSavingPayment(false);
    }
  };

  const totalNet = records.reduce((s, p) => s + p.net_salary, 0);
  const totalBonus = records.reduce((s, p) => s + p.bonus, 0);
  const totalTax = records.reduce((s, p) => s + p.tax, 0);
  const totalAdvanceGiven = advances.reduce((s, a) => s + a.amount, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amount_paid, 0);

  const calcPreview = () => {
    const baseSalary = parseInt(calcForm.base_salary) || 0;
    const attendanceDays = parseInt(calcForm.attendance_days) || 0;
    const taskCount = parseInt(calcForm.task_count) || 0;
    const bonus = parseInt(calcForm.bonus) || 0;
    const penalty = parseInt(calcForm.penalty) || 0;
    const overtime = parseInt(calcForm.overtime) || 0;
    const taxRate = parseFloat(calcForm.tax_rate) || 12;
    const config = calcTarget ? getSalaryConfig(calcTarget.id) : null;
    const workingDays = config?.working_days_per_month || 26;
    const dailyRate = config?.daily_rate || Math.round(baseSalary / workingDays);
    const totalAdvance = calcTarget ? advances.filter((a) => a.employee_id === calcTarget.id).reduce((s, a) => s + a.amount, 0) : 0;
    const calculatedSalary = computeCalcSalary(calcForm.work_type, baseSalary, attendanceDays, taskCount, workingDays, dailyRate);
    const grossSalary = calculatedSalary + bonus + overtime;
    const tax = Math.round(grossSalary * taxRate / 100);
    const netSalary = grossSalary - penalty - totalAdvance - tax;
    return { calculatedSalary, grossSalary, tax, totalAdvance, netSalary };
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t.payroll_title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t.payroll_subtitle}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input text-sm"
            />
            <button
              onClick={() => setShowAdvanceModal(true)}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <AppIcon name="ArrowUpCircleIcon" size={16} />
              Avans berish
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
        {success && (
          <div className="p-3 rounded-lg text-sm flex items-center gap-2" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--success)' }}>
            <AppIcon name="CheckCircleIcon" size={16} />
            {success}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Jami oylik', value: formatUZS(totalNet), icon: 'BanknotesIcon', color: 'var(--primary)' },
            { label: 'Bonuslar', value: formatUZS(totalBonus), icon: 'GiftIcon', color: 'var(--success)' },
            { label: 'Soliq', value: formatUZS(totalTax), icon: 'DocumentTextIcon', color: 'var(--warning)' },
            { label: 'Avanslar', value: formatUZS(totalAdvanceGiven), icon: 'ArrowUpCircleIcon', color: 'var(--muted-foreground)' },
            { label: 'To\'langan', value: formatUZS(totalPaid), icon: 'CheckCircleIcon', color: 'var(--success)' },
          ].map((s) => (
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}20` }}>
                <AppIcon name={s.icon as any} size={20} style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--secondary)' }}>
          {([
            { key: 'payroll', label: 'Oyliklar', icon: 'BanknotesIcon' },
            { key: 'advances', label: 'Avanslar', icon: 'ArrowUpCircleIcon' },
            { key: 'payments', label: 'To\'lovlar', icon: 'CreditCardIcon' },
          ] as { key: ActiveTab; label: string; icon: string }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <AppIcon name={tab.icon as any} size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="card p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">Yuklanmoqda...</p>
          </div>
        ) : (
          <>
            {/* PAYROLL TAB */}
            {activeTab === 'payroll' && (
              <div className="space-y-4">
                {/* Employees without payroll record */}
                {employees.filter((e) => !records.find((r) => r.employee_id === e.id)).length > 0 && (
                  <div className="card p-4">
                    <p className="text-sm font-semibold text-foreground mb-3">Oylik hisoblanmagan xodimlar</p>
                    <div className="flex flex-wrap gap-2">
                      {employees.filter((e) => !records.find((r) => r.employee_id === e.id)).map((emp) => {
                        const att = getAttendance(emp.id);
                        return (
                          <button
                            key={emp.id}
                            onClick={() => openCalcModal(emp)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:border-primary transition-colors"
                            style={{ borderColor: 'var(--border)' }}
                          >
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--primary)20', color: 'var(--primary)' }}>
                              {emp.full_name.charAt(0)}
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-foreground text-xs">{emp.full_name}</p>
                              <p className="text-xs text-muted-foreground">{att ? `${att.present_days + att.late_days} kun` : 'Davomat yo\'q'}</p>
                            </div>
                            <AppIcon name="CalculatorIcon" size={14} style={{ color: 'var(--primary)' }} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="card overflow-hidden">
                  <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                    <h3 className="font-semibold text-foreground text-sm">{selectedMonth} — Oylik ro'yxati</h3>
                    <span className="text-xs text-muted-foreground">{records.length} xodim</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                          {['Xodim', 'Ish turi', 'Kelgan kun', 'Hisoblangan', 'Bonus', 'Jarima', 'Avans', 'Soliq', 'Sof oylik', 'Holat', 'Amal'].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((rec) => (
                          <tr
                            key={rec.id}
                            className="border-b hover:bg-secondary/30 transition-colors"
                            style={{ borderColor: 'var(--border)' }}
                          >
                            <td className="px-4 py-3 cursor-pointer" onClick={() => setSelectedRecord(rec)}>
                              <p className="font-medium text-foreground text-xs">{rec.employee_name}</p>
                              <p className="text-xs text-muted-foreground">{rec.position}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)' }}>
                                {WORK_TYPES.find((w) => w.value === rec.work_type)?.label || rec.work_type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-foreground font-medium">{rec.attendance_days} kun</td>
                            <td className="px-4 py-3 text-xs text-foreground">{formatUZS(rec.calculated_salary || rec.base_salary)}</td>
                            <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--success)' }}>{rec.bonus > 0 ? `+${formatUZS(rec.bonus)}` : '—'}</td>
                            <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--danger)' }}>{rec.penalty > 0 ? `-${formatUZS(rec.penalty)}` : '—'}</td>
                            <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--warning)' }}>{rec.advance > 0 ? `-${formatUZS(rec.advance)}` : '—'}</td>
                            <td className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--danger)' }}>-{formatUZS(rec.tax)}</td>
                            <td className="px-4 py-3 text-xs font-bold text-foreground">{formatUZS(rec.net_salary)}</td>
                            <td className="px-4 py-3">
                              <StatusBadge
                                status={rec.pay_status === 'paid' ? 'active' : rec.pay_status === 'processing' ? 'pending' : 'inactive'}
                                label={rec.pay_status === 'paid' ? 'To\'landi' : rec.pay_status === 'processing' ? 'Jarayonda' : 'Kutilmoqda'}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openCalcModal(employees.find((e) => e.id === rec.employee_id) || { id: rec.employee_id || '', full_name: rec.employee_name, position: rec.position, department: rec.department, branch: '' })}
                                  className="p-1.5 rounded hover:bg-secondary text-muted-foreground"
                                  title="Qayta hisoblash"
                                >
                                  <AppIcon name="CalculatorIcon" size={14} />
                                </button>
                                {rec.pay_status !== 'paid' && (
                                  <button
                                    onClick={() => openPaymentModal(rec)}
                                    className="p-1.5 rounded text-xs font-medium flex items-center gap-1"
                                    style={{ background: 'var(--primary)20', color: 'var(--primary)' }}
                                    title="To'lov qilish"
                                  >
                                    <AppIcon name="CreditCardIcon" size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {records.length === 0 && (
                          <tr>
                            <td colSpan={11} className="px-4 py-10 text-center text-sm text-muted-foreground">
                              {selectedMonth} uchun oylik yozuvlari yo'q
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ADVANCES TAB */}
            {activeTab === 'advances' && (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="font-semibold text-foreground text-sm">Avanslar — {selectedMonth}</h3>
                  <button onClick={() => setShowAdvanceModal(true)} className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5">
                    <AppIcon name="PlusIcon" size={14} />
                    Avans berish
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                        {['Xodim', 'Miqdor', 'Sana', 'Sabab', 'Holat'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {advances.map((adv) => (
                        <tr key={adv.id} className="border-b hover:bg-secondary/30 transition-colors" style={{ borderColor: 'var(--border)' }}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground text-xs">{adv.employee_name}</p>
                          </td>
                          <td className="px-4 py-3 text-xs font-bold" style={{ color: 'var(--warning)' }}>{formatUZS(adv.amount)}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{adv.advance_date}</td>
                          <td className="px-4 py-3 text-xs text-foreground">{adv.reason || '—'}</td>
                          <td className="px-4 py-3">
                            <StatusBadge
                              status={adv.status === 'given' ? 'pending' : 'active'}
                              label={adv.status === 'given' ? 'Berildi' : 'Ushlab qolindi'}
                            />
                          </td>
                        </tr>
                      ))}
                      {advances.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                            {selectedMonth} uchun avans yo'q
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PAYMENTS TAB */}
            {activeTab === 'payments' && (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="font-semibold text-foreground text-sm">To'lovlar — {selectedMonth}</h3>
                  <span className="text-xs text-muted-foreground">{payments.length} ta to'lov</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                        {['Xodim', 'To\'langan summa', 'To\'lov usuli', 'Sana', 'Izoh'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((pay) => (
                        <tr key={pay.id} className="border-b hover:bg-secondary/30 transition-colors" style={{ borderColor: 'var(--border)' }}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground text-xs">{pay.employee_name}</p>
                          </td>
                          <td className="px-4 py-3 text-xs font-bold" style={{ color: 'var(--success)' }}>{formatUZS(pay.amount_paid)}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {PAYMENT_METHODS.find((m) => m.value === pay.payment_method)?.label || pay.payment_method}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{pay.payment_date}</td>
                          <td className="px-4 py-3 text-xs text-foreground">{pay.notes || '—'}</td>
                        </tr>
                      ))}
                      {payments.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                            {selectedMonth} uchun to'lov yo'q
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Payslip Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedRecord(null)}>
          <div className="card w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Oylik varaqasi</h2>
              <button onClick={() => setSelectedRecord(null)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground"><AppIcon name="XMarkIcon" size={18} /></button>
            </div>
            <div className="text-center pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="font-bold text-foreground text-lg">{selectedRecord.employee_name}</p>
              <p className="text-sm text-muted-foreground">{selectedRecord.position} — {selectedRecord.department}</p>
              <p className="text-xs text-muted-foreground mt-1">{selectedRecord.pay_month}</p>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Ish turi', value: WORK_TYPES.find((w) => w.value === selectedRecord.work_type)?.label || selectedRecord.work_type, color: 'text-foreground' },
                { label: 'Kelgan kunlar', value: `${selectedRecord.attendance_days} kun`, color: 'text-foreground' },
                { label: 'Hisoblangan oylik', value: formatUZS(selectedRecord.calculated_salary || selectedRecord.base_salary), color: 'text-foreground' },
                { label: 'Bonus', value: `+${formatUZS(selectedRecord.bonus)}`, color: 'text-success' },
                { label: 'Qo\'shimcha ish haqi', value: `+${formatUZS(selectedRecord.overtime)}`, color: 'text-success' },
                { label: 'Avans ushlab qolish', value: `-${formatUZS(selectedRecord.advance)}`, color: 'text-warning' },
                { label: 'Jarima', value: `-${formatUZS(selectedRecord.penalty)}`, color: 'text-danger' },
                { label: 'Daromad solig\'i', value: `-${formatUZS(selectedRecord.tax)}`, color: 'text-danger' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className={`font-medium ${row.color}`}>{row.value}</span>
                </div>
              ))}
              <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <span className="font-bold text-foreground">Sof oylik</span>
                <span className="font-bold text-primary text-lg">{formatUZS(selectedRecord.net_salary)}</span>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setSelectedRecord(null)} className="btn-secondary flex-1 text-sm">Yopish</button>
              {selectedRecord.pay_status !== 'paid' && (
                <button
                  onClick={() => { openPaymentModal(selectedRecord); setSelectedRecord(null); }}
                  className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
                >
                  <AppIcon name="CreditCardIcon" size={15} />
                  To'lov qilish
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calculate Salary Modal */}
      {showCalcModal && calcTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowCalcModal(false)}>
          <div className="card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Oylik hisoblash</h2>
              <button onClick={() => setShowCalcModal(false)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground"><AppIcon name="XMarkIcon" size={18} /></button>
            </div>
            <div className="pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="font-medium text-foreground">{calcTarget.full_name}</p>
              <p className="text-xs text-muted-foreground">{calcTarget.position} — {calcTarget.department}</p>
              {getAttendance(calcTarget.id) && (
                <div className="flex gap-3 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--success)' }}>
                    Keldi: {getAttendance(calcTarget.id)!.present_days} kun
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(234,179,8,0.1)', color: 'var(--warning)' }}>
                    Kech: {getAttendance(calcTarget.id)!.late_days} kun
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>
                    Kelmadi: {getAttendance(calcTarget.id)!.absent_days} kun
                  </span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Ish turi</label>
                <select
                  value={calcForm.work_type}
                  onChange={(e) => setCalcForm((f) => ({ ...f, work_type: e.target.value }))}
                  className="input text-sm w-full"
                >
                  {WORK_TYPES.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {calcForm.work_type === 'daily' ? 'Kunlik stavka (UZS)' : 'Asosiy oylik (UZS)'}
                </label>
                <input
                  type="number"
                  value={calcForm.base_salary}
                  onChange={(e) => setCalcForm((f) => ({ ...f, base_salary: e.target.value }))}
                  className="input text-sm w-full"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Kelgan kunlar</label>
                <input
                  type="number"
                  value={calcForm.attendance_days}
                  onChange={(e) => setCalcForm((f) => ({ ...f, attendance_days: e.target.value }))}
                  className="input text-sm w-full"
                  placeholder="0"
                />
              </div>
              {calcForm.work_type === 'task_based' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Bajarilgan ishlar soni</label>
                  <input
                    type="number"
                    value={calcForm.task_count}
                    onChange={(e) => setCalcForm((f) => ({ ...f, task_count: e.target.value }))}
                    className="input text-sm w-full"
                    placeholder="0"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Bonus (UZS)</label>
                <input
                  type="number"
                  value={calcForm.bonus}
                  onChange={(e) => setCalcForm((f) => ({ ...f, bonus: e.target.value }))}
                  className="input text-sm w-full"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Jarima (UZS)</label>
                <input
                  type="number"
                  value={calcForm.penalty}
                  onChange={(e) => setCalcForm((f) => ({ ...f, penalty: e.target.value }))}
                  className="input text-sm w-full"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Qo'shimcha ish haqi (UZS)</label>
                <input
                  type="number"
                  value={calcForm.overtime}
                  onChange={(e) => setCalcForm((f) => ({ ...f, overtime: e.target.value }))}
                  className="input text-sm w-full"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Soliq foizi (%)</label>
                <input
                  type="number"
                  value={calcForm.tax_rate}
                  onChange={(e) => setCalcForm((f) => ({ ...f, tax_rate: e.target.value }))}
                  className="input text-sm w-full"
                  placeholder="12"
                />
              </div>
            </div>
            {/* Preview */}
            {calcForm.base_salary && (
              <div className="rounded-lg p-3 space-y-1.5" style={{ background: 'var(--secondary)' }}>
                <p className="text-xs font-semibold text-foreground mb-2">Hisob-kitob natijasi</p>
                {(() => {
                  const p = calcPreview();
                  return (
                    <>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Hisoblangan oylik</span><span className="font-medium text-foreground">{formatUZS(p.calculatedSalary)}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Avans ushlab qolish</span><span className="font-medium" style={{ color: 'var(--warning)' }}>-{formatUZS(p.totalAdvance)}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Soliq</span><span className="font-medium" style={{ color: 'var(--danger)' }}>-{formatUZS(p.tax)}</span></div>
                      <div className="flex justify-between text-xs font-bold pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                        <span className="text-foreground">Sof oylik</span>
                        <span style={{ color: 'var(--primary)' }}>{formatUZS(p.netSalary)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCalcModal(false)} className="btn-secondary flex-1 text-sm">Bekor qilish</button>
              <button
                onClick={saveCalcSalary}
                disabled={savingCalc || !calcForm.base_salary}
                className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
              >
                {savingCalc && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advance Modal */}
      {showAdvanceModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAdvanceModal(false)}>
          <div className="card w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Avans berish</h2>
              <button onClick={() => setShowAdvanceModal(false)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground"><AppIcon name="XMarkIcon" size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Xodim</label>
                <select
                  value={advanceForm.employee_id}
                  onChange={(e) => setAdvanceForm((f) => ({ ...f, employee_id: e.target.value }))}
                  className="input text-sm w-full"
                >
                  <option value="">Xodimni tanlang</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name} — {e.position}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Miqdor (UZS)</label>
                <input
                  type="number"
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm((f) => ({ ...f, amount: e.target.value }))}
                  className="input text-sm w-full"
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Sana</label>
                  <input
                    type="date"
                    value={advanceForm.advance_date}
                    onChange={(e) => setAdvanceForm((f) => ({ ...f, advance_date: e.target.value }))}
                    className="input text-sm w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Oy</label>
                  <input
                    type="month"
                    value={advanceForm.pay_month}
                    onChange={(e) => setAdvanceForm((f) => ({ ...f, pay_month: e.target.value }))}
                    className="input text-sm w-full"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Sabab</label>
                <input
                  type="text"
                  value={advanceForm.reason}
                  onChange={(e) => setAdvanceForm((f) => ({ ...f, reason: e.target.value }))}
                  className="input text-sm w-full"
                  placeholder="Avans sababi..."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Izoh</label>
                <textarea
                  value={advanceForm.notes}
                  onChange={(e) => setAdvanceForm((f) => ({ ...f, notes: e.target.value }))}
                  className="input text-sm w-full resize-none"
                  rows={2}
                  placeholder="Qo'shimcha izoh..."
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAdvanceModal(false)} className="btn-secondary flex-1 text-sm">Bekor qilish</button>
              <button
                onClick={saveAdvance}
                disabled={savingAdvance || !advanceForm.employee_id || !advanceForm.amount}
                className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
              >
                {savingAdvance && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Avans berish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && paymentTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentModal(false)}>
          <div className="card w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Oylik to'lash</h2>
              <button onClick={() => setShowPaymentModal(false)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground"><AppIcon name="XMarkIcon" size={18} /></button>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'var(--secondary)' }}>
              <p className="font-medium text-foreground text-sm">{paymentTarget.employee_name}</p>
              <p className="text-xs text-muted-foreground">{paymentTarget.position}</p>
              <p className="text-sm font-bold mt-1" style={{ color: 'var(--primary)' }}>Sof oylik: {formatUZS(paymentTarget.net_salary)}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">To'lanadigan summa (UZS)</label>
                <input
                  type="number"
                  value={paymentForm.amount_paid}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, amount_paid: e.target.value }))}
                  className="input text-sm w-full"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">To'lov usuli</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, payment_method: e.target.value }))}
                  className="input text-sm w-full"
                >
                  {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">To'lov sanasi</label>
                <input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, payment_date: e.target.value }))}
                  className="input text-sm w-full"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Izoh</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
                  className="input text-sm w-full"
                  placeholder="Ixtiyoriy izoh..."
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowPaymentModal(false)} className="btn-secondary flex-1 text-sm">Bekor qilish</button>
              <button
                onClick={savePayment}
                disabled={savingPayment || !paymentForm.amount_paid}
                className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
              >
                {savingPayment && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                To'lov qilish
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
