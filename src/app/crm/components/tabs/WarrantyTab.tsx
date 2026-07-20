'use client';

import React from 'react';
import { Customer } from '../../data/customers';

interface WarrantyTabProps {
  customer: Customer;
}

interface WarrantyItem {
  id: string;
  product: string;
  serialNumber: string;
  model: string;
  purchaseDate: string;
  warrantyEnd: string;
  object: string;
  status: 'valid' | 'expiring' | 'expired';
  daysLeft: number;
}

const mockWarranties: WarrantyItem[] = [
  { id: 'w1', product: 'Hikvision DS-2CD2143G2-I', serialNumber: 'HK2024031500123', model: '4MP AcuSense', purchaseDate: '2024-03-15', warrantyEnd: '2026-03-15', object: 'Main Office', status: 'expired', daysLeft: -122 },
  { id: 'w2', product: 'NVR DS-7608NI-K2/8P', serialNumber: 'NVR2024031500456', model: '8-ch NVR', purchaseDate: '2024-03-15', warrantyEnd: '2027-03-15', object: 'Main Office', status: 'valid', daysLeft: 608 },
  { id: 'w3', product: 'Dahua IPC-HDW2831T-AS', serialNumber: 'DH2024062000789', model: '8MP Lite IR', purchaseDate: '2024-06-20', warrantyEnd: '2026-09-20', object: 'Warehouse A', status: 'expiring', daysLeft: 66 },
  { id: 'w4', product: 'PTZ DS-2DE4425IWG-E', serialNumber: 'PTZ2025011000321', model: '4MP 25x Zoom', purchaseDate: '2025-01-10', warrantyEnd: '2027-01-10', object: 'Parking Zone', status: 'valid', daysLeft: 543 },
  { id: 'w5', product: 'UPS APC Smart-UPS 1500', serialNumber: 'UPS2024031500654', model: 'SMT1500I', purchaseDate: '2024-03-15', warrantyEnd: '2026-03-15', object: 'Main Office', status: 'expired', daysLeft: -122 },
];

const statusStyle: Record<string, { badge: string; bar: string }> = {
  valid: { badge: 'bg-emerald-500/15 text-emerald-400', bar: 'bg-emerald-500' },
  expiring: { badge: 'bg-amber-500/15 text-amber-400', bar: 'bg-amber-500' },
  expired: { badge: 'bg-red-500/15 text-red-400', bar: 'bg-red-500' },
};

function WarrantyProgressBar({ item }: { item: WarrantyItem }) {
  const start = new Date(item.purchaseDate).getTime();
  const end = new Date(item.warrantyEnd).getTime();
  const now = new Date('2026-07-16').getTime();
  const total = end - start;
  const elapsed = now - start;
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">Warranty period</span>
        <span className="text-xs text-muted-foreground">
          {item.daysLeft > 0 ? `${item.daysLeft} days left` : `Expired ${Math.abs(item.daysLeft)} days ago`}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div
          className={`h-full rounded-full transition-all ${statusStyle[item.status].bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-xs text-muted-foreground">{item.purchaseDate}</span>
        <span className="text-xs text-muted-foreground">{item.warrantyEnd}</span>
      </div>
    </div>
  );
}

export default function WarrantyTab({ customer }: WarrantyTabProps) {
  const valid = mockWarranties.filter((w) => w.status === 'valid').length;
  const expiring = mockWarranties.filter((w) => w.status === 'expiring').length;
  const expired = mockWarranties.filter((w) => w.status === 'expired').length;

  return (
    <div className="p-5 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Valid', value: valid, color: 'text-success', bg: 'bg-emerald-500/10' },
          { label: 'Expiring Soon', value: expiring, color: 'text-warning', bg: 'bg-amber-500/10' },
          { label: 'Expired', value: expired, color: 'text-danger', bg: 'bg-red-500/10' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl p-3 text-center ${stat.bg}`}
            style={{ border: '1px solid var(--border)' }}
          >
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Warranty Tracking ({mockWarranties.length} items)</h3>
        <button className="btn-secondary text-xs gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Export
        </button>
      </div>

      <div className="space-y-3">
        {mockWarranties.map((w) => (
          <div
            key={w.id}
            className="rounded-xl p-4"
            style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground truncate">{w.product}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusStyle[w.status].badge}`}>
                    {w.status === 'valid' ? '✓ Valid' : w.status === 'expiring' ? '⚠ Expiring' : '✗ Expired'}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    S/N: <span className="text-foreground font-mono">{w.serialNumber}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Model: <span className="text-foreground">{w.model}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    🏢 {w.object}
                  </span>
                </div>
                <WarrantyProgressBar item={w} />
              </div>
              <button className="btn-secondary text-xs flex-shrink-0">QR Check</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
