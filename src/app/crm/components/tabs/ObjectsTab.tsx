'use client';

import React from 'react';
import { Customer } from '../../data/customers';

interface ObjectsTabProps {
  customer: Customer;
}

interface SiteObject {
  id: string;
  name: string;
  address: string;
  type: string;
  cameras: number;
  installedDate: string;
  status: 'active' | 'maintenance' | 'inactive';
}

const mockObjects: SiteObject[] = [
  { id: 'o1', name: 'Main Office', address: 'Chilonzor 9-mavze, 12-uy, 1-qavat', type: 'Office', cameras: 8, installedDate: '2024-03-15', status: 'active' },
  { id: 'o2', name: 'Warehouse A', address: 'Chilonzor 9-mavze, 14-uy', type: 'Warehouse', cameras: 12, installedDate: '2024-06-20', status: 'active' },
  { id: 'o3', name: 'Parking Zone', address: 'Chilonzor 9-mavze, parking', type: 'Outdoor', cameras: 4, installedDate: '2025-01-10', status: 'maintenance' },
];

const statusStyle: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400',
  maintenance: 'bg-amber-500/15 text-amber-400',
  inactive: 'bg-zinc-500/15 text-zinc-400',
};

export default function ObjectsTab({ customer }: ObjectsTabProps) {
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Objects / Sites ({mockObjects.length})</h3>
        <button className="btn-primary text-xs gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Object
        </button>
      </div>

      <div className="space-y-3">
        {mockObjects.map((obj) => (
          <div
            key={obj.id}
            className="rounded-xl p-4"
            style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(99,102,241,0.12)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{obj.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[obj.status]}`}>
                      {obj.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{obj.address}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-muted-foreground">
                      <span className="text-foreground font-medium">{obj.cameras}</span> cameras
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Type: <span className="text-foreground font-medium">{obj.type}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Installed: <span className="text-foreground font-medium">{obj.installedDate}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button className="btn-secondary text-xs">View Map</button>
                <button className="btn-secondary text-xs">Details</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
