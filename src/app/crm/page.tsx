'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import CustomerListPanel from './components/CustomerListPanel';
import CustomerDetailPanel from './components/CustomerDetailPanel';
import AddCustomerModal from './components/AddCustomerModal';
import EditCustomerModal from './components/EditCustomerModal';
import { createClient } from '@/lib/supabase/client';

export interface Customer {
  id: string;
  type: 'physical' | 'legal';
  name: string;
  company?: string;
  phone: string;
  telegram?: string;
  email?: string;
  address: string;
  district?: string;
  city: string;
  status: 'active' | 'inactive' | 'vip';
  totalContracts: number;
  totalDebt: number;
  lastActivity: string;
  notes?: string;
}

export default function CRMPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState<'all' | 'physical' | 'legal'>('all');
  const supabase = createClient();

  const fetchCustomers = useCallback(async () => {
    const { data, error } = await supabase
      .from('customers')
      .select(`*, contracts(id)`)
      .order('last_activity', { ascending: false });

    if (!error && data) {
      const mapped: Customer[] = data.map((c: any) => ({
        id: c.id,
        type: c.type,
        name: c.name,
        company: c.company,
        phone: c.phone,
        telegram: c.telegram,
        email: c.email,
        address: c.address,
        district: c.district,
        city: c.city,
        status: c.status,
        totalContracts: c.contracts?.length ?? 0,
        totalDebt: c.total_debt ?? 0,
        lastActivity: c.last_activity ?? '',
        notes: c.notes,
      }));
      setCustomers(mapped);
      if (!selectedCustomerId && mapped.length > 0) {
        setSelectedCustomerId(mapped[0].id);
      }
    }
    setLoading(false);
  }, [supabase, selectedCustomerId]);

  useEffect(() => {
    fetchCustomers();

    const channel = supabase
      .channel('crm_customers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchCustomers)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, fetchCustomers)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditModalOpen(true);
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) ?? null;

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Customer Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              CRM — contacts, contracts, service history &amp; warranty tracking
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary text-xs gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Export
            </button>
            <button className="btn-primary text-xs gap-2" onClick={() => setAddModalOpen(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Customer
            </button>
          </div>
        </div>

        {/* Main split layout */}
        <div className="flex gap-5 min-h-[calc(100vh-180px)]">
          {/* Left: customer list */}
          <div className="w-80 flex-shrink-0">
            <CustomerListPanel
              customers={customers}
              loading={loading}
              selectedId={selectedCustomerId}
              onSelect={setSelectedCustomerId}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeType={activeType}
              onTypeChange={setActiveType}
            />
          </div>

          {/* Right: customer detail */}
          <div className="flex-1 min-w-0">
            {selectedCustomer ? (
              <CustomerDetailPanel
                customer={selectedCustomer}
                onEdit={() => handleEditCustomer(selectedCustomer)}
                onContractAdded={fetchCustomers}
              />
            ) : (
              <div
                className="flex flex-col items-center justify-center h-full rounded-xl text-center"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ background: 'var(--secondary)' }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-foreground">Select a customer</p>
                <p className="text-xs text-muted-foreground mt-1">Choose from the list to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddCustomerModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSaved={fetchCustomers}
      />

      {editingCustomer && (
        <EditCustomerModal
          open={editModalOpen}
          customer={editingCustomer}
          onClose={() => { setEditModalOpen(false); setEditingCustomer(null); }}
          onSaved={fetchCustomers}
        />
      )}
    </AppLayout>
  );
}
