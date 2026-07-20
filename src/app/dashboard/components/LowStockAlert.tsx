'use client';

import React from 'react';
import Icon from '@/components/ui/AppIcon';
import type { LowStockRow } from '@/hooks/useDashboardData';

interface LowStockAlertProps {
  items: LowStockRow[];
  loading: boolean;
}

export default function LowStockAlert({ items, loading }: LowStockAlertProps) {
  return (
    <div
      className="card-base card-glow-warning"
      style={{ background: 'rgba(245, 158, 11, 0.03)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(245, 158, 11, 0.15)' }}
        >
          <Icon name="ExclamationTriangleIcon" size={13} className="text-warning" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Low Stock Alerts</h3>
        <span
          className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ background: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.25)' }}
        >
          {loading ? '...' : `${items?.length || 0} items`}
        </span>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={`skel-${i}`} className="h-8 rounded animate-pulse" style={{ background: 'var(--muted)' }} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items?.map((item) => {
            const pct = Math.round((item?.current_stock / item?.minimum_stock) * 100);
            return (
              <div key={item?.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground truncate max-w-[160px]">{item?.name}</span>
                  <span className="text-xs font-medium text-warning font-tabular flex-shrink-0">
                    {item?.current_stock}/{item?.minimum_stock} {item?.unit}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--muted)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      background: pct <= 20 ? 'var(--danger)' : 'var(--warning)',
                    }}
                  />
                </div>
              </div>
            );
          })}
          {(!items || items.length === 0) && (
            <p className="text-xs text-muted-foreground text-center py-2">All items stocked</p>
          )}
        </div>
      )}
      <button className="w-full mt-3 text-xs text-warning hover:text-accent transition-colors flex items-center justify-center gap-1">
        <Icon name="TruckIcon" size={12} />
        Create purchase order
      </button>
    </div>
  );
}