'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import Icon from '@/components/ui/AppIcon';
import StatusBadge from '@/components/ui/StatusBadge';
import type { SalesOrder } from './SalesOrdersTable';

interface RecordPaymentFormData {
  amount: string;
  paymentMethod: string;
  paymentDate: string;
  reference: string;
  notes: string;
}

interface RecordPaymentModalProps {
  order: SalesOrder;
  onClose: () => void;
}

// Backend integration point: POST /api/orders/:id/payments

export default function RecordPaymentModal({ order, onClose }: RecordPaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RecordPaymentFormData>({
    defaultValues: {
      amount: order.balanceUZS.toString(),
      paymentMethod: 'Cash',
      paymentDate: '2026-07-16',
      reference: '',
      notes: '',
    },
  });

  const watchedAmount = watch('amount');
  const amountNum = Number(watchedAmount?.replace(/\D/g, '')) || 0;
  const isFullPayment = amountNum >= order.balanceUZS;

  const onSubmit = async (data: RecordPaymentFormData) => {
    setIsSubmitting(true);
    // Backend integration: POST /api/orders/:id/payments { amount, paymentMethod, paymentDate, reference, notes }
    await new Promise((r) => setTimeout(r, 1000));
    toast.success(`Payment of ${Number(data.amount.replace(/\D/g, '')).toLocaleString('ru-RU')} UZS recorded for ${order.orderNumber}`);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Record Payment"
      subtitle={`${order.orderNumber} — ${order.customer}`}
      size="md"
      footer={
        <>
          <button type="button" className="btn-secondary text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="payment-form"
            disabled={isSubmitting}
            className="btn-primary text-sm"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Icon name="ArrowPathIcon" size={14} className="animate-spin" />
                Recording...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Icon name="BanknotesIcon" size={14} />
                Record Payment
              </span>
            )}
          </button>
        </>
      }
    >
      {/* Order summary */}
      <div
        className="flex items-center justify-between p-3 rounded-xl mb-5"
        style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary">{order.orderNumber}</span>
            <StatusBadge variant={order.status} size="sm" />
          </div>
          <p className="text-xs text-muted-foreground">{order.products}</p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-xs text-muted-foreground">Balance due</p>
          <p className="text-base font-bold text-danger font-tabular">
            {order.balanceUZS.toLocaleString('ru-RU')} UZS
          </p>
        </div>
      </div>

      {/* Payment progress */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Payment progress</span>
          <span className="text-xs font-medium text-foreground font-tabular">
            {order.paidUZS.toLocaleString('ru-RU')} / {order.totalUZS.toLocaleString('ru-RU')} UZS
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.round((order.paidUZS / order.totalUZS) * 100)}%`,
              background: 'var(--warning)',
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground">
            {Math.round((order.paidUZS / order.totalUZS) * 100)}% paid
          </span>
          <span className="text-xs text-muted-foreground">
            {Math.round((order.balanceUZS / order.totalUZS) * 100)}% remaining
          </span>
        </div>
      </div>

      {/* Form */}
      <form id="payment-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Payment Amount (UZS) <span className="text-danger">*</span>
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Full balance: {order.balanceUZS.toLocaleString('ru-RU')} UZS
          </p>
          <div className="relative">
            <input
              type="text"
              className={`input-field pr-16 font-tabular text-base font-semibold ${errors.amount ? 'border-danger' : isFullPayment ? 'border-success' : ''}`}
              {...register('amount', {
                required: 'Amount is required',
                validate: (v) => {
                  const n = Number(v.replace(/\D/g, ''));
                  if (n <= 0) return 'Amount must be greater than 0';
                  if (n > order.balanceUZS) return `Cannot exceed balance of ${order.balanceUZS.toLocaleString('ru-RU')} UZS`;
                  return true;
                },
              })}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {isFullPayment && <Icon name="CheckCircleIcon" size={14} className="text-success" />}
              <span className="text-xs text-muted-foreground">UZS</span>
            </div>
          </div>
          {errors.amount && (
            <p className="text-xs text-danger mt-1.5 flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size={12} />
              {errors.amount.message}
            </p>
          )}
          {isFullPayment && !errors.amount && (
            <p className="text-xs text-success mt-1.5 flex items-center gap-1">
              <Icon name="CheckCircleIcon" size={12} />
              This will fully settle the order
            </p>
          )}
          {/* Quick fill buttons */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">Quick:</span>
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={`pct-${pct}`}
                type="button"
                className="px-2 py-0.5 rounded text-xs font-medium transition-all duration-150 hover:bg-primary hover:text-primary-foreground"
                style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
                onClick={() => setValue('amount', Math.round((order.balanceUZS * pct) / 100).toString())}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Payment method */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Payment Method <span className="text-danger">*</span>
          </label>
          <select
            className={`input-field ${errors.paymentMethod ? 'border-danger' : ''}`}
            {...register('paymentMethod', { required: 'Payment method is required' })}
          >
            <option value="Cash">Cash</option>
            <option value="Card">Card (POS terminal)</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Installment">Installment payment</option>
          </select>
          {errors.paymentMethod && (
            <p className="text-xs text-danger mt-1.5 flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size={12} />
              {errors.paymentMethod.message}
            </p>
          )}
        </div>

        {/* Payment date */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Payment Date <span className="text-danger">*</span>
          </label>
          <input
            type="date"
            className={`input-field ${errors.paymentDate ? 'border-danger' : ''}`}
            {...register('paymentDate', { required: 'Payment date is required' })}
          />
          {errors.paymentDate && (
            <p className="text-xs text-danger mt-1.5 flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size={12} />
              {errors.paymentDate.message}
            </p>
          )}
        </div>

        {/* Reference */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Transaction Reference
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Bank transfer reference, cheque number, or POS receipt ID
          </p>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. TRF-20260716-0041"
            {...register('reference')}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Internal Notes
          </label>
          <textarea
            rows={2}
            className="input-field resize-none"
            placeholder="Optional notes for accounting team..."
            {...register('notes')}
          />
        </div>
      </form>
    </Modal>
  );
}