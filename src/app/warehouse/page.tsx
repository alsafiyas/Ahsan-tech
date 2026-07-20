'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import StatusBadge from '@/components/ui/StatusBadge';
import { useLanguage } from '@/context/LanguageContext';
import { useWarehouseData } from '@/hooks/useWarehouseData';

export default function WarehousePage() {
  const { t } = useLanguage();
  const {
    stockItems,
    movements,
    stats,
    lowStockItems,
    loading,
    error,
    receiveStock,
    issueStock,
  } = useWarehouseData();

  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');
  const [search, setSearch] = useState('');
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Receive form state
  const [receiveForm, setReceiveForm] = useState({
    productId: '',
    warehouse: 'Tashkent Main',
    quantity: '',
    reference: '',
    performedBy: 'Warehouse Manager',
  });

  // Issue form state
  const [issueForm, setIssueForm] = useState({
    productId: '',
    warehouse: 'Tashkent Main',
    quantity: '',
    toLocation: 'Customer',
    reference: '',
    performedBy: 'Warehouse Manager',
  });

  const filteredStock = stockItems.filter((s) =>
    s.product.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase()) ||
    s.warehouse.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMovements = movements.filter((m) =>
    m.product.toLowerCase().includes(search.toLowerCase()) ||
    m.reference.toLowerCase().includes(search.toLowerCase())
  );

  const uniqueProducts = Array.from(
    new Map(stockItems.map((s) => [s.productId, { id: s.productId, name: s.product }])).values()
  );

  const handleReceive = async () => {
    if (!receiveForm.productId || !receiveForm.quantity || !receiveForm.reference) {
      setFormError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const result = await receiveStock(
      receiveForm.productId,
      receiveForm.warehouse,
      parseInt(receiveForm.quantity, 10),
      receiveForm.reference,
      receiveForm.performedBy
    );
    setSubmitting(false);
    if (result.success) {
      setShowReceiveModal(false);
      setReceiveForm({ productId: '', warehouse: 'Tashkent Main', quantity: '', reference: '', performedBy: 'Warehouse Manager' });
    } else {
      setFormError(result.error ?? 'Failed to receive stock.');
    }
  };

  const handleIssue = async () => {
    if (!issueForm.productId || !issueForm.quantity || !issueForm.reference) {
      setFormError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const result = await issueStock(
      issueForm.productId,
      issueForm.warehouse,
      parseInt(issueForm.quantity, 10),
      issueForm.toLocation,
      issueForm.reference,
      issueForm.performedBy
    );
    setSubmitting(false);
    if (result.success) {
      setShowIssueModal(false);
      setIssueForm({ productId: '', warehouse: 'Tashkent Main', quantity: '', toLocation: 'Customer', reference: '', performedBy: 'Warehouse Manager' });
    } else {
      setFormError(result.error ?? 'Failed to issue stock.');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t.warehouse_title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t.warehouse_subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setFormError(null); setShowReceiveModal(true); }}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <AppIcon name="ArrowDownTrayIcon" size={16} />
              {t.warehouse_incoming}
            </button>
            <button
              onClick={() => { setFormError(null); setShowIssueModal(true); }}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <AppIcon name="ArrowUpTrayIcon" size={16} />
              {t.warehouse_outgoing}
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="card p-3 flex items-center gap-2" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
            <AppIcon name="ExclamationCircleIcon" size={16} style={{ color: 'var(--danger)' }} />
            <span className="text-sm" style={{ color: 'var(--danger)' }}>{error}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-4 flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-lg bg-secondary flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-6 bg-secondary rounded w-12" />
                  <div className="h-3 bg-secondary rounded w-24" />
                </div>
              </div>
            ))
          ) : (
            [
              { label: t.warehouse_total_items, value: stats.totalItems, icon: 'CubeIcon', color: 'var(--primary)' },
              { label: t.warehouse_low_stock_items, value: stats.lowStockCount, icon: 'ExclamationTriangleIcon', color: 'var(--warning)' },
              { label: t.field_branch, value: stats.warehouseCount, icon: 'BuildingStorefrontIcon', color: 'var(--success)' },
              { label: t.warehouse_movements, value: stats.todayMovements, icon: 'ArrowsRightLeftIcon', color: 'var(--muted-foreground)' },
            ].map((s) => (
              <div key={s.label} className="card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}20` }}>
                  <AppIcon name={s.icon as any} size={20} style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Low Stock Alert */}
        {!loading && lowStockItems.length > 0 && (
          <div className="card p-4" style={{ borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.05)' }}>
            <div className="flex items-center gap-2 mb-3">
              <AppIcon name="ExclamationTriangleIcon" size={16} style={{ color: 'var(--warning)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>
                Low Stock Alert — {lowStockItems.length} items need restocking
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map((item) => (
                <span
                  key={item.id}
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)' }}
                >
                  {item.product} ({item.quantity}/{item.minStock} {item.unit}) — {item.warehouse}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--secondary)' }}>
          {[{ key: 'stock', label: 'Current Stock' }, { key: 'movements', label: 'Movements' }].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <AppIcon name="MagnifyingGlassIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 w-full text-sm"
          />
        </div>

        {/* Stock Table */}
        {activeTab === 'stock' && (
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-8 flex items-center justify-center">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Loading stock levels...</span>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                      {['Product', 'Category', 'Warehouse', 'Quantity', 'Min Stock', 'Status', 'Last Movement'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No stock items found
                        </td>
                      </tr>
                    ) : (
                      filteredStock.map((item) => (
                        <tr key={item.id} className="border-b hover:bg-secondary/30 transition-colors" style={{ borderColor: 'var(--border)' }}>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-foreground text-xs">{item.product}</p>
                              <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{item.category}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{item.warehouse}</td>
                          <td className="px-4 py-3">
                            <span className={`text-sm font-bold ${item.quantity === 0 ? 'text-danger' : item.quantity <= item.minStock ? 'text-warning' : 'text-success'}`}>
                              {item.quantity} {item.unit}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{item.minStock} {item.unit}</td>
                          <td className="px-4 py-3">
                            <StatusBadge
                              status={item.quantity === 0 ? 'inactive' : item.quantity <= item.minStock ? 'pending' : 'active'}
                              label={item.quantity === 0 ? 'Out of Stock' : item.quantity <= item.minStock ? 'Low Stock' : 'In Stock'}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.movementType === 'in' ? 'bg-success' : item.movementType === 'out' ? 'bg-danger' : 'bg-primary'}`} />
                              <span className="text-xs text-muted-foreground">{item.lastMovement}</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Movements Table */}
        {activeTab === 'movements' && (
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-8 flex items-center justify-center">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Loading movements...</span>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                      {['Date', 'Product', 'Type', 'Qty', 'From', 'To', 'Reference', 'User'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMovements.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No movements found
                        </td>
                      </tr>
                    ) : (
                      filteredMovements.map((m) => (
                        <tr key={m.id} className="border-b hover:bg-secondary/30 transition-colors" style={{ borderColor: 'var(--border)' }}>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{m.date}</td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-foreground text-xs">{m.product}</p>
                              <p className="text-xs text-muted-foreground font-mono">{m.sku}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.type === 'in' ? 'bg-success/15 text-success' : m.type === 'out' ? 'bg-danger/15 text-danger' : 'bg-primary/15 text-primary'}`}>
                              {m.type === 'in' ? '↓ Receive' : m.type === 'out' ? '↑ Issue' : '⇄ Transfer'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-foreground">{m.quantity}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{m.from}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{m.to}</td>
                          <td className="px-4 py-3 text-xs font-mono text-primary">{m.reference}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{m.user}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Receive Stock Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowReceiveModal(false)}>
          <div className="card w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Receive Stock</h2>
              <button onClick={() => setShowReceiveModal(false)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground">
                <AppIcon name="XMarkIcon" size={18} />
              </button>
            </div>
            {formError && (
              <p className="text-xs px-3 py-2 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>{formError}</p>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Product *</label>
                <select
                  className="input w-full text-sm"
                  value={receiveForm.productId}
                  onChange={(e) => setReceiveForm((f) => ({ ...f, productId: e.target.value }))}
                >
                  <option value="">Select product...</option>
                  {uniqueProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Warehouse</label>
                <select
                  className="input w-full text-sm"
                  value={receiveForm.warehouse}
                  onChange={(e) => setReceiveForm((f) => ({ ...f, warehouse: e.target.value }))}
                >
                  <option>Tashkent Main</option>
                  <option>Samarkand</option>
                  <option>Namangan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  placeholder="0"
                  className="input w-full text-sm"
                  value={receiveForm.quantity}
                  onChange={(e) => setReceiveForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Reference (PO Number) *</label>
                <input
                  type="text"
                  placeholder="PO-2026-XXX"
                  className="input w-full text-sm"
                  value={receiveForm.reference}
                  onChange={(e) => setReceiveForm((f) => ({ ...f, reference: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Performed By</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={receiveForm.performedBy}
                  onChange={(e) => setReceiveForm((f) => ({ ...f, performedBy: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowReceiveModal(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
              <button onClick={handleReceive} disabled={submitting} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Confirm Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Stock Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowIssueModal(false)}>
          <div className="card w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Issue Stock</h2>
              <button onClick={() => setShowIssueModal(false)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground">
                <AppIcon name="XMarkIcon" size={18} />
              </button>
            </div>
            {formError && (
              <p className="text-xs px-3 py-2 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>{formError}</p>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Product *</label>
                <select
                  className="input w-full text-sm"
                  value={issueForm.productId}
                  onChange={(e) => setIssueForm((f) => ({ ...f, productId: e.target.value }))}
                >
                  <option value="">Select product...</option>
                  {uniqueProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">From Warehouse</label>
                <select
                  className="input w-full text-sm"
                  value={issueForm.warehouse}
                  onChange={(e) => setIssueForm((f) => ({ ...f, warehouse: e.target.value }))}
                >
                  <option>Tashkent Main</option>
                  <option>Samarkand</option>
                  <option>Namangan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  placeholder="0"
                  className="input w-full text-sm"
                  value={issueForm.quantity}
                  onChange={(e) => setIssueForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">To Location</label>
                <select
                  className="input w-full text-sm"
                  value={issueForm.toLocation}
                  onChange={(e) => setIssueForm((f) => ({ ...f, toLocation: e.target.value }))}
                >
                  <option>Customer</option>
                  <option>Service</option>
                  <option>Installation</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Reference (SO/SRV Number) *</label>
                <input
                  type="text"
                  placeholder="SO-2026-XXX"
                  className="input w-full text-sm"
                  value={issueForm.reference}
                  onChange={(e) => setIssueForm((f) => ({ ...f, reference: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Performed By</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  value={issueForm.performedBy}
                  onChange={(e) => setIssueForm((f) => ({ ...f, performedBy: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowIssueModal(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
              <button onClick={handleIssue} disabled={submitting} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Confirm Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
