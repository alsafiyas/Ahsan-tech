'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Icon from '@/components/ui/AppIcon';
import type { SalesOrder, OrderStatus, PaymentMethod } from './SalesOrdersTable';

interface AddEditOrderModalProps {
  order?: SalesOrder | null;
  onClose: () => void;
  onSave: (order: SalesOrder) => void;
}

const statusOptions: { value: OrderStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'invoiced', label: 'Invoiced' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partial' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

const paymentMethodOptions: PaymentMethod[] = ['Cash', 'Card', 'Bank Transfer', 'Installment', 'Mixed'];

const branchOptions = ['Namangan', 'Samarkand', 'Andijan'];

const managerOptions = ['Sardor Nazarov', 'Malika Tursunova', 'Bobur Rahimov', 'Umida Karimova'];

function generateOrderNumber(): string {
  const num = Math.floor(Math.random() * 900) + 100;
  return `ORD-0${num}`;
}

function todayDMY(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export default function AddEditOrderModal({ order, onClose, onSave }: AddEditOrderModalProps) {
  const isEdit = !!order;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    orderNumber: order?.orderNumber ?? generateOrderNumber(),
    customer: order?.customer ?? '',
    customerType: order?.customerType ?? 'individual' as 'individual' | 'corporate',
    products: order?.products ?? '',
    qty: order?.qty ?? 1,
    totalUZS: order?.totalUZS ?? 0,
    paidUZS: order?.paidUZS ?? 0,
    status: order?.status ?? 'draft' as OrderStatus,
    paymentMethod: order?.paymentMethod ?? 'Cash' as PaymentMethod,
    branch: order?.branch ?? 'Namangan',
    date: order?.date ?? todayDMY(),
    dueDate: order?.dueDate ?? todayDMY(),
    manager: order?.manager ?? 'Sardor Nazarov',
  });

  const set = (key: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.customer.trim()) errs.customer = 'Mijoz nomi kiritilishi shart';
    if (!form.products.trim()) errs.products = 'Mahsulot nomi kiritilishi shart';
    if (form.qty < 1) errs.qty = 'Miqdor 1 dan katta bo\'lishi kerak';
    if (form.totalUZS <= 0) errs.totalUZS = 'Umumiy summa 0 dan katta bo\'lishi kerak';
    if (form.paidUZS < 0) errs.paidUZS = 'To\'langan summa manfiy bo\'lishi mumkin emas';
    if (form.paidUZS > form.totalUZS) errs.paidUZS = 'To\'langan summa umumiy summadan oshmasligi kerak';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    const balanceUZS = form.totalUZS - form.paidUZS;
    const saved: SalesOrder = {
      id: order?.id ?? `order-${Date.now()}`,
      orderNumber: form.orderNumber,
      customer: form.customer,
      customerType: form.customerType,
      products: form.products,
      qty: Number(form.qty),
      totalUZS: Number(form.totalUZS),
      paidUZS: Number(form.paidUZS),
      balanceUZS,
      status: form.status,
      paymentMethod: form.paymentMethod,
      branch: form.branch,
      date: form.date,
      dueDate: form.dueDate,
      manager: form.manager,
    };
    setIsSubmitting(false);
    onSave(saved);
  };

  const inputCls = (field: string) =>
    `input-field text-sm ${errors[field] ? 'border-danger' : ''}`;

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `Buyurtmani tahrirlash — ${order?.orderNumber}` : 'Yangi buyurtma qo\'shish'}
      subtitle={isEdit ? 'Buyurtma ma\'lumotlarini yangilang' : 'Yangi sotuv buyurtmasini kiriting'}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary text-sm" onClick={onClose}>
            Bekor qilish
          </button>
          <button
            type="submit"
            form="order-form"
            disabled={isSubmitting}
            className="btn-primary text-sm gap-2"
          >
            {isSubmitting ? (
              <>
                <Icon name="ArrowPathIcon" size={14} className="animate-spin" />
                Saqlanmoqda...
              </>
            ) : (
              <>
                <Icon name="CheckIcon" size={14} />
                {isEdit ? 'Saqlash' : 'Qo\'shish'}
              </>
            )}
          </button>
        </>
      }
    >
      <form id="order-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Order number + branch row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Buyurtma raqami
            </label>
            <input
              type="text"
              className={inputCls('orderNumber')}
              value={form.orderNumber}
              onChange={(e) => set('orderNumber', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Filial
            </label>
            <select
              className={inputCls('branch')}
              value={form.branch}
              onChange={(e) => set('branch', e.target.value)}
            >
              {branchOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Customer */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Mijoz nomi <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              className={inputCls('customer')}
              placeholder="Masalan: Mirzo Ulugbek LLC"
              value={form.customer}
              onChange={(e) => set('customer', e.target.value)}
            />
            {errors.customer && (
              <p className="text-xs text-danger mt-1 flex items-center gap-1">
                <Icon name="ExclamationCircleIcon" size={12} />
                {errors.customer}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Mijoz turi
            </label>
            <select
              className={inputCls('customerType')}
              value={form.customerType}
              onChange={(e) => set('customerType', e.target.value)}
            >
              <option value="individual">Jismoniy shaxs</option>
              <option value="corporate">Yuridik shaxs</option>
            </select>
          </div>
        </div>

        {/* Products */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Mahsulotlar <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className={inputCls('products')}
            placeholder="Masalan: Hikvision DS-2CD2T47G2 ×4, Cable 100m"
            value={form.products}
            onChange={(e) => set('products', e.target.value)}
          />
          {errors.products && (
            <p className="text-xs text-danger mt-1 flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size={12} />
              {errors.products}
            </p>
          )}
        </div>

        {/* Qty + Total + Paid */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Miqdor <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              min={1}
              className={inputCls('qty')}
              value={form.qty}
              onChange={(e) => set('qty', Number(e.target.value))}
            />
            {errors.qty && (
              <p className="text-xs text-danger mt-1 flex items-center gap-1">
                <Icon name="ExclamationCircleIcon" size={12} />
                {errors.qty}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Umumiy summa (UZS) <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              min={0}
              className={inputCls('totalUZS')}
              value={form.totalUZS}
              onChange={(e) => set('totalUZS', Number(e.target.value))}
            />
            {errors.totalUZS && (
              <p className="text-xs text-danger mt-1 flex items-center gap-1">
                <Icon name="ExclamationCircleIcon" size={12} />
                {errors.totalUZS}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              To'langan (UZS)
            </label>
            <input
              type="number"
              min={0}
              className={inputCls('paidUZS')}
              value={form.paidUZS}
              onChange={(e) => set('paidUZS', Number(e.target.value))}
            />
            {errors.paidUZS && (
              <p className="text-xs text-danger mt-1 flex items-center gap-1">
                <Icon name="ExclamationCircleIcon" size={12} />
                {errors.paidUZS}
              </p>
            )}
          </div>
        </div>

        {/* Balance preview */}
        {form.totalUZS > 0 && (
          <div
            className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm"
            style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            <span className="text-xs text-muted-foreground">Qoldiq (balans):</span>
            <span className={`text-sm font-semibold font-tabular ${form.totalUZS - form.paidUZS > 0 ? 'text-danger' : 'text-success'}`}>
              {(form.totalUZS - form.paidUZS).toLocaleString('ru-RU')} UZS
            </span>
          </div>
        )}

        {/* Status + Payment method */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Holat
            </label>
            <select
              className={inputCls('status')}
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
            >
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              To'lov usuli
            </label>
            <select
              className={inputCls('paymentMethod')}
              value={form.paymentMethod}
              onChange={(e) => set('paymentMethod', e.target.value)}
            >
              {paymentMethodOptions.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Dates + Manager */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Sana (kk.oo.yyyy)
            </label>
            <input
              type="text"
              className={inputCls('date')}
              placeholder="16.07.2026"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Muddat (kk.oo.yyyy)
            </label>
            <input
              type="text"
              className={inputCls('dueDate')}
              placeholder="30.07.2026"
              value={form.dueDate}
              onChange={(e) => set('dueDate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Menejer
            </label>
            <select
              className={inputCls('manager')}
              value={form.manager}
              onChange={(e) => set('manager', e.target.value)}
            >
              {managerOptions.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
}
