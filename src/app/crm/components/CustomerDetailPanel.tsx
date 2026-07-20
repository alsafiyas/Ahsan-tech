'use client';

import React, { useState } from 'react';
import ContactInfoTab from './tabs/ContactInfoTab';
import ObjectsTab from './tabs/ObjectsTab';
import ContractsTab from './tabs/ContractsTab';
import PaymentHistoryTab from './tabs/PaymentHistoryTab';
import ServiceHistoryTab from './tabs/ServiceHistoryTab';
import WarrantyTab from './tabs/WarrantyTab';
import { Customer } from '../page';

interface CustomerDetailPanelProps {
  customer: Customer;
  onEdit: () => void;
  onContractAdded: () => void;
}

const tabs = [
  { key: 'contact', label: 'Contact Info' },
  { key: 'objects', label: 'Objects/Sites' },
  { key: 'contracts', label: 'Contracts' },
  { key: 'payments', label: 'Payments' },
  { key: 'service', label: 'Service History' },
  { key: 'warranty', label: 'Warranty' },
];

const statusColors: Record<string, string> = {
  vip: 'bg-amber-500/15 text-amber-400',
  active: 'bg-emerald-500/15 text-emerald-400',
  inactive: 'bg-zinc-500/15 text-zinc-400',
};

export default function CustomerDetailPanel({ customer, onEdit, onContractAdded }: CustomerDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('contact');

  return (
    <div
      className="flex flex-col h-full rounded-xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {/* Customer header */}
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0"
              style={{
                background: customer.type === 'legal' ? 'rgba(99,102,241,0.15)' : 'rgba(20,184,166,0.15)',
                color: customer.type === 'legal' ? '#818cf8' : '#2dd4bf',
              }}
            >
              {customer.type === 'legal' ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                </svg>
              ) : (
                customer.name.charAt(0)
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-foreground">{customer.name}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[customer.status]}`}>
                  {customer.status === 'vip' ? '⭐ VIP' : customer.status === 'active' ? 'Active' : 'Inactive'}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: customer.type === 'legal' ? 'rgba(99,102,241,0.12)' : 'rgba(20,184,166,0.12)',
                    color: customer.type === 'legal' ? '#818cf8' : '#2dd4bf',
                  }}
                >
                  {customer.type === 'legal' ? '🏢 Legal Entity' : '👤 Individual'}
                </span>
              </div>
              {customer.company && (
                <p className="text-sm text-muted-foreground mt-0.5">{customer.company}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {customer.district && `${customer.district}, `}{customer.city} · Last activity: {customer.lastActivity}
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{customer.totalContracts}</p>
              <p className="text-xs text-muted-foreground">Contracts</p>
            </div>
            <div className="w-px h-8" style={{ background: 'var(--border)' }} />
            <div className="text-center">
              <p className={`text-lg font-bold ${customer.totalDebt > 0 ? 'text-danger' : 'text-success'}`}>
                {customer.totalDebt > 0 ? `${(customer.totalDebt / 1000000).toFixed(1)}M` : '0'}
              </p>
              <p className="text-xs text-muted-foreground">Debt (UZS)</p>
            </div>
            <div className="w-px h-8" style={{ background: 'var(--border)' }} />
            <div className="flex gap-2">
              <button className="btn-secondary text-xs gap-1.5" onClick={onEdit}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </button>
              <button
                className="btn-primary text-xs gap-1.5"
                onClick={() => setActiveTab('contracts')}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Contract
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto scrollbar-thin" style={{ borderColor: 'var(--border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-all duration-150 border-b-2 ${
              activeTab === tab.key
                ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === 'contact' && <ContactInfoTab customer={customer as any} />}
        {activeTab === 'objects' && <ObjectsTab customer={customer as any} />}
        {activeTab === 'contracts' && (
          <ContractsTab
            customerId={customer.id}
            onContractAdded={onContractAdded}
            openNewContract={activeTab === 'contracts'}
          />
        )}
        {activeTab === 'payments' && <PaymentHistoryTab customer={customer as any} />}
        {activeTab === 'service' && <ServiceHistoryTab customer={customer as any} />}
        {activeTab === 'warranty' && <WarrantyTab customer={customer as any} />}
      </div>
    </div>
  );
}
