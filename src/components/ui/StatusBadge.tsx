import React from 'react';

type BadgeVariant =
  | 'active' | 'inactive' | 'pending' | 'cancelled' | 'draft' | 'paid'
  | 'partial' | 'overdue' | 'service' | 'confirmed' | 'invoiced' | 'received'
  | 'repairing' | 'ready' | 'delivered' | 'assigned' | 'completed' | 'processing';

interface StatusBadgeProps {
  /** Primary prop — use variant OR status (they are identical, both accepted) */
  variant?: BadgeVariant;
  /** Alias for variant — used by some pages */
  status?: BadgeVariant;
  label?: string;
  size?: 'sm' | 'md';
}

const variantMap: Record<BadgeVariant, string> = {
  active: 'badge-active',
  confirmed: 'badge-active',
  received: 'badge-active',
  completed: 'badge-active',
  delivered: 'badge-active',
  paid: 'badge-paid',
  pending: 'badge-pending',
  processing: 'badge-pending',
  repairing: 'badge-pending',
  assigned: 'badge-pending',
  partial: 'badge-partial',
  invoiced: 'badge-partial',
  ready: 'badge-service',
  cancelled: 'badge-cancelled',
  inactive: 'badge-cancelled',
  overdue: 'badge-overdue',
  draft: 'badge-draft',
  service: 'badge-service',
};

const labelMap: Record<BadgeVariant, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
  processing: 'Processing',
  cancelled: 'Cancelled',
  draft: 'Draft',
  paid: 'Paid',
  partial: 'Partial',
  overdue: 'Overdue',
  service: 'In Service',
  confirmed: 'Confirmed',
  invoiced: 'Invoiced',
  received: 'Received',
  repairing: 'Repairing',
  ready: 'Ready',
  delivered: 'Delivered',
  assigned: 'Assigned',
  completed: 'Completed',
};

export default function StatusBadge({ variant, status, label, size = 'md' }: StatusBadgeProps) {
  const resolvedVariant: BadgeVariant = (variant ?? status ?? 'draft') as BadgeVariant;
  const cls = variantMap[resolvedVariant] ?? 'badge-draft';
  const text = label ?? labelMap[resolvedVariant] ?? resolvedVariant;
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${cls} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      }`}
    >
      {text}
    </span>
  );
}