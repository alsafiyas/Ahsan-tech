'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import { useLanguage } from '@/context/LanguageContext';
import { createClient } from '@/lib/supabase/client';

type TransactionType = 'income' | 'expense';

interface Transaction {
  id: string;
  transaction_date: string;
  description: string;
  category: string;
  transaction_type: TransactionType;
  amount: number;
  account: string;
  reference: string;
  created_at: string;
}

interface TransactionFormData {
  transaction_date: string;
  description: string;
  category: string;
  transaction_type: TransactionType;
  amount: string;
  account: string;
  reference: string;
}

interface FinanceSummary {
  ordersRevenue: number;
  purchaseExpenses: number;
  payrollExpenses: number;
}

function formatUZS(n: number): string {
  if (typeof n !== 'number' || isNaN(n)) return '0 UZS';
  const abs = Math.abs(Math.round(n));
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (n < 0 ? '-' : '') + formatted + ' UZS';
}

const CATEGORIES = ['Savdo daromadi', 'Xizmat daromadi', 'Xarid', 'Ish haqi', 'Ijara', 'Kommunal', 'Operatsion', 'Boshqa'];
const ACCOUNTS = ['Kapitalbank', 'Naqd', 'Uzcard'];

const emptyForm = (): TransactionFormData => ({
  transaction_date: new Date().toISOString().split('T')[0],
  description: '',
  category: CATEGORIES[0],
  transaction_type: 'income',
  amount: '',
  account: ACCOUNTS[0],
  reference: '',
});

export default function FinancePage() {
  const { t } = useLanguage();
  const supabase = createClient();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>({ ordersRevenue: 0, purchaseExpenses: 0, payrollExpenses: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<TransactionFormData>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [txRes, ordersRes, poRes, payrollRes] = await Promise.all([
        supabase.from('transactions').select('*').order('transaction_date', { ascending: false }),
        supabase.from('orders').select('total_uzs, order_status'),
        supabase.from('purchase_orders').select('total_uzs, po_status'),
        supabase.from('payroll_records').select('net_salary, pay_status'),
      ]);

      if (txRes.error) throw txRes.error;
      setTransactions((txRes.data as Transaction[]) || []);

      const ordersRevenue = (ordersRes.data || [])
        .filter((o: any) => o.order_status === 'paid' || o.order_status === 'partial')
        .reduce((s: number, o: any) => s + (Number(o.total_uzs) || 0), 0);

      const purchaseExpenses = (poRes.data || [])
        .filter((p: any) => p.po_status === 'received' || p.po_status === 'partial')
        .reduce((s: number, p: any) => s + (Number(p.total_uzs) || 0), 0);

      const payrollExpenses = (payrollRes.data || [])
        .filter((r: any) => r.pay_status === 'paid')
        .reduce((s: number, r: any) => s + (Number(r.net_salary) || 0), 0);

      setSummary({ ordersRevenue, purchaseExpenses, payrollExpenses });
    } catch (e: any) {
      setError(e?.message || 'Ma\'lumotlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel('finance_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const filtered = transactions.filter((tx) => {
    const matchType = typeFilter === 'all' || tx.transaction_type === typeFilter;
    const matchSearch =
      tx.description.toLowerCase().includes(search.toLowerCase()) ||
      tx.category.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  // Totals from manual transactions
  const txIncome = transactions
    .filter((tx) => tx.transaction_type === 'income')
    .reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
  const txExpense = transactions
    .filter((tx) => tx.transaction_type === 'expense')
    .reduce((s, tx) => s + (Number(tx.amount) || 0), 0);

  // Grand totals including orders/payroll
  const totalIncome = txIncome + summary.ordersRevenue;
  const totalExpense = txExpense + summary.purchaseExpenses + summary.payrollExpenses;
  const balance = totalIncome - totalExpense;

  // Account balances from manual transactions only
  const accountBalances = ACCOUNTS.map((acc) => {
    const income = transactions
      .filter((tx) => tx.account === acc && tx.transaction_type === 'income')
      .reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
    const expense = transactions
      .filter((tx) => tx.account === acc && tx.transaction_type === 'expense')
      .reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
    return { name: acc, balance: income - expense };
  });

  const handleSubmit = async () => {
    if (!formData.description.trim()) {
      setFormError('Tavsif kiritish shart.');
      return;
    }
    const amt = parseInt(formData.amount, 10);
    if (!amt || amt <= 0) {
      setFormError('To\'g\'ri summa kiriting.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const { error: err } = await supabase.from('transactions').insert({
        transaction_date: formData.transaction_date,
        description: formData.description.trim(),
        category: formData.category,
        transaction_type: formData.transaction_type,
        amount: amt,
        account: formData.account,
        reference: formData.reference.trim(),
      });
      if (err) throw err;
      setShowAddModal(false);
      setFormData(emptyForm());
      fetchAll();
    } catch (e: any) {
      setFormError(e?.message || 'Saqlashda xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    try {
      const { error: err } = await supabase.from('transactions').delete().eq('id', id);
      if (err) throw err;
      setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    } catch (e: any) {
      setError(e?.message || 'O\'chirishda xatolik');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t.finance_title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t.finance_subtitle}</p>
          </div>
          <button
            onClick={() => { setFormData(emptyForm()); setFormError(null); setShowAddModal(true); }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <AppIcon name="PlusIcon" size={16} />
            {t.finance_add_transaction}
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg text-sm flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>
            <AppIcon name="ExclamationCircleIcon" size={16} />
            {error}
            <button onClick={() => setError(null)} className="ml-auto"><AppIcon name="XMarkIcon" size={14} /></button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
                <AppIcon name="ArrowDownCircleIcon" size={20} style={{ color: 'var(--success)' }} />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{t.finance_total_income}</p>
            </div>
            {loading ? (
              <div className="h-8 w-32 bg-secondary animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{formatUZS(totalIncome)}</p>
            )}
            <div className="mt-2 space-y-0.5">
              <p className="text-xs text-muted-foreground">Tranzaksiyalar: {formatUZS(txIncome)}</p>
              <p className="text-xs text-muted-foreground">Buyurtmalar: {formatUZS(summary.ordersRevenue)}</p>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
                <AppIcon name="ArrowUpCircleIcon" size={20} style={{ color: 'var(--danger)' }} />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{t.finance_total_expense}</p>
            </div>
            {loading ? (
              <div className="h-8 w-32 bg-secondary animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-bold" style={{ color: 'var(--danger)' }}>{formatUZS(totalExpense)}</p>
            )}
            <div className="mt-2 space-y-0.5">
              <p className="text-xs text-muted-foreground">Tranzaksiyalar: {formatUZS(txExpense)}</p>
              <p className="text-xs text-muted-foreground">Xaridlar: {formatUZS(summary.purchaseExpenses)}</p>
              <p className="text-xs text-muted-foreground">Ish haqi: {formatUZS(summary.payrollExpenses)}</p>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
                <AppIcon name="ScaleIcon" size={20} style={{ color: balance >= 0 ? 'var(--success)' : 'var(--danger)' }} />
              </div>
              <p className="text-sm font-medium text-muted-foreground">{t.finance_net_balance}</p>
            </div>
            {loading ? (
              <div className="h-8 w-32 bg-secondary animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-bold" style={{ color: balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {balance >= 0 ? '+' : ''}{formatUZS(balance)}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">Jami kirim − chiqim</p>
          </div>
        </div>

        {/* Account Balances */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Hisoblar</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {accountBalances.map((acc) => (
              <div key={acc.name} className="card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <AppIcon
                    name={acc.name === 'Naqd' ? 'BanknotesIcon' : acc.name === 'Uzcard' ? 'CreditCardIcon' : 'BuildingLibraryIcon'}
                    size={18}
                    style={{ color: 'var(--primary)' }}
                  />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{acc.name}</p>
                  {loading ? (
                    <div className="h-4 w-24 bg-secondary animate-pulse rounded mt-1" />
                  ) : (
                    <p className="text-sm font-bold mt-0.5" style={{ color: acc.balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {formatUZS(acc.balance)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions Table */}
        {loading ? (
          <div className="card p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">Yuklanmoqda...</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-semibold text-foreground text-sm">Tranzaksiyalar ({filtered.length})</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <AppIcon name="MagnifyingGlassIcon" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Qidirish..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input pl-8 text-xs w-40"
                  />
                </div>
                {(['all', 'income', 'expense'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setTypeFilter(f)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${typeFilter === f ? 'bg-primary text-primary-foreground' : 'btn-secondary'}`}
                  >
                    {f === 'all' ? 'Hammasi' : f === 'income' ? 'Kirim' : 'Chiqim'}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                    {['Sana', 'Tavsif', 'Kategoriya', 'Hisob', 'Havola', 'Summa', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx) => (
                    <tr key={tx.id} className="border-b hover:bg-secondary/30 transition-colors" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{tx.transaction_date}</td>
                      <td className="px-4 py-3 text-xs font-medium text-foreground">{tx.description}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{tx.category}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{tx.account}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--primary)' }}>{tx.reference || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold" style={{ color: tx.transaction_type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                          {tx.transaction_type === 'income' ? '+' : '-'}{formatUZS(Number(tx.amount))}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(tx.id)}
                          disabled={deleteId === tx.id}
                          className="p-1 rounded hover:bg-danger/10 text-muted-foreground hover:text-danger transition-colors"
                          title="O'chirish"
                        >
                          {deleteId === tx.id
                            ? <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin inline-block" />
                            : <AppIcon name="TrashIcon" size={14} />
                          }
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        Tranzaksiyalar topilmadi
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="card w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{t.finance_add_transaction}</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground">
                <AppIcon name="XMarkIcon" size={18} />
              </button>
            </div>
            {formError && (
              <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>{formError}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Tavsif *</label>
                <input
                  type="text"
                  placeholder="Tranzaksiya tavsifi"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="input w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Turi</label>
                <select
                  value={formData.transaction_type}
                  onChange={(e) => setFormData((p) => ({ ...p, transaction_type: e.target.value as TransactionType }))}
                  className="input w-full text-sm"
                >
                  <option value="income">Kirim</option>
                  <option value="expense">Chiqim</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Summa (UZS)</label>
                <input
                  type="number"
                  placeholder="0"
                  min="1"
                  value={formData.amount}
                  onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                  className="input w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Kategoriya</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                  className="input w-full text-sm"
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Hisob</label>
                <select
                  value={formData.account}
                  onChange={(e) => setFormData((p) => ({ ...p, account: e.target.value }))}
                  className="input w-full text-sm"
                >
                  {ACCOUNTS.map((a) => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Sana</label>
                <input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData((p) => ({ ...p, transaction_date: e.target.value }))}
                  className="input w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Havola</label>
                <input
                  type="text"
                  placeholder="masalan: SO-2026-001"
                  value={formData.reference}
                  onChange={(e) => setFormData((p) => ({ ...p, reference: e.target.value }))}
                  className="input w-full text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary flex-1 text-sm">Bekor qilish</button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
              >
                {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Qo'shish
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
