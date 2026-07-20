'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import StatusBadge from '@/components/ui/StatusBadge';
import { useLanguage } from '@/context/LanguageContext';
import { createClient } from '@/lib/supabase/client';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
  price_uzs: number;
  created_at: string;
  updated_at: string;
}

interface ProductFormData {
  name: string;
  sku: string;
  category: string;
  current_stock: string;
  minimum_stock: string;
  unit: string;
  price_uzs: string;
}

const CATEGORIES = ['IP Camera', 'NVR', 'HDD', 'Video Doorbell', 'PoE Switch', 'PTZ Camera', 'Cable', 'Other'];

const formatUZS = (n: number) => new Intl.NumberFormat('uz-UZ').format(n) + ' UZS';

const emptyForm = (): ProductFormData => ({
  name: '', sku: '', category: CATEGORIES[0], current_stock: '0',
  minimum_stock: '0', unit: 'pcs', price_uzs: '0',
});

export default function ProductsPage() {
  const { t } = useLanguage();
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setProducts((data as Product[]) || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    const channel = supabase
      .channel('products_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchProducts]);

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const stats = {
    total: products.length,
    active: products.filter((p) => p.current_stock > p.minimum_stock).length,
    lowStock: products.filter((p) => p.current_stock > 0 && p.current_stock <= p.minimum_stock).length,
    outOfStock: products.filter((p) => p.current_stock === 0).length,
  };

  const getStatus = (p: Product) => {
    if (p.current_stock === 0) return 'inactive';
    if (p.current_stock <= p.minimum_stock) return 'pending';
    return 'active';
  };

  const getStatusLabel = (p: Product) => {
    if (p.current_stock === 0) return t.status_out_of_stock || 'Out of Stock';
    if (p.current_stock <= p.minimum_stock) return t.status_low_stock || 'Low Stock';
    return t.status_active || 'Active';
  };

  const openCreate = () => {
    setEditingProduct(null);
    setFormData(emptyForm());
    setFormError(null);
    setShowAddModal(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      sku: product.sku || '',
      category: product.category || CATEGORIES[0],
      current_stock: String(product.current_stock ?? 0),
      minimum_stock: String(product.minimum_stock ?? 0),
      unit: product.unit || 'pcs',
      price_uzs: String(product.price_uzs ?? 0),
    });
    setFormError(null);
    setShowAddModal(true);
    setSelectedProduct(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setFormError('Product name is required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        category: formData.category,
        current_stock: parseInt(formData.current_stock, 10) || 0,
        minimum_stock: parseInt(formData.minimum_stock, 10) || 0,
        unit: formData.unit || 'pcs',
        price_uzs: parseInt(formData.price_uzs, 10) || 0,
        updated_at: new Date().toISOString(),
      };
      if (editingProduct) {
        const { error: err } = await supabase.from('products').update(payload).eq('id', editingProduct.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('products').insert(payload);
        if (err) throw err;
      }
      setShowAddModal(false);
      fetchProducts();
    } catch (e: any) {
      setFormError(e?.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      const { error: err } = await supabase.from('products').delete().eq('id', id);
      if (err) throw err;
      setSelectedProduct(null);
      fetchProducts();
    } catch (e: any) {
      setError(e?.message || 'Delete failed');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t.products_title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t.products_subtitle}</p>
          </div>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
            <AppIcon name="PlusIcon" size={16} />
            {t.products_add}
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg text-sm flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>
            <AppIcon name="ExclamationCircleIcon" size={16} />
            {error}
            <button onClick={() => setError(null)} className="ml-auto"><AppIcon name="XMarkIcon" size={14} /></button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t.products_total, value: stats.total, icon: 'CubeIcon', color: 'var(--primary)' },
            { label: t.products_active, value: stats.active, icon: 'CheckCircleIcon', color: 'var(--success)' },
            { label: t.products_low_stock, value: stats.lowStock, icon: 'ExclamationTriangleIcon', color: 'var(--warning)' },
            { label: t.products_out_of_stock, value: stats.outOfStock, icon: 'XCircleIcon', color: 'var(--danger)' },
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
          ))}
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <AppIcon name="MagnifyingGlassIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={`${t.action_search}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 w-full text-sm"
              />
            </div>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="input text-sm min-w-[140px]">
              {categories.map((c) => <option key={c} value={c}>{c === 'All' ? t.field_all : c}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="card p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">Loading products...</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                    {[t.field_name, t.field_category, 'SKU', t.products_sale_price, t.products_stock, 'Min Stock', t.field_status, ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b transition-colors hover:bg-secondary/30 cursor-pointer"
                      style={{ borderColor: 'var(--border)' }}
                      onClick={() => setSelectedProduct(p)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--secondary)' }}>
                            <AppIcon name="CubeIcon" size={16} className="text-muted-foreground" />
                          </div>
                          <p className="font-medium text-foreground text-xs">{p.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.category}</td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{p.sku || '—'}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-foreground">{formatUZS(p.price_uzs)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold ${p.current_stock === 0 ? 'text-danger' : p.current_stock <= p.minimum_stock ? 'text-warning' : 'text-success'}`}>
                          {p.current_stock} {p.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.minimum_stock} {p.unit}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={getStatus(p)} label={getStatusLabel(p)} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <AppIcon name="PencilSquareIcon" size={14} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteProduct(p.id); }}
                            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-danger transition-colors"
                          >
                            <AppIcon name="TrashIcon" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        No products found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t flex items-center" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs text-muted-foreground">{filtered.length} / {products.length} products</p>
            </div>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedProduct(null)}>
          <div className="card w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{t.action_details}</h2>
              <button onClick={() => setSelectedProduct(null)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground">
                <AppIcon name="XMarkIcon" size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                [t.field_name, selectedProduct.name],
                [t.field_category, selectedProduct.category],
                ['SKU', selectedProduct.sku || '—'],
                ['Unit', selectedProduct.unit],
                [t.products_sale_price, formatUZS(selectedProduct.price_uzs)],
                [t.products_stock, `${selectedProduct.current_stock} ${selectedProduct.unit}`],
                ['Min Stock', `${selectedProduct.minimum_stock} ${selectedProduct.unit}`],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-medium text-foreground">{value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => openEdit(selectedProduct)} className="btn-secondary flex-1 text-sm flex items-center justify-center gap-1.5">
                <AppIcon name="PencilIcon" size={14} />
                Edit
              </button>
              <button
                onClick={() => deleteProduct(selectedProduct.id)}
                className="flex-1 text-sm px-3 py-2 rounded-lg flex items-center justify-center gap-1.5"
                style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.08)' }}
              >
                <AppIcon name="TrashIcon" size={14} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{editingProduct ? 'Edit Product' : t.products_add}</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground">
                <AppIcon name="XMarkIcon" size={18} />
              </button>
            </div>
            {formError && (
              <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}>{formError}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">{t.field_name} *</label>
                <input type="text" placeholder="e.g. Hikvision DS-2CD2143G2-I" value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} className="input w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">SKU</label>
                <input type="text" placeholder="SKU code" value={formData.sku}
                  onChange={(e) => setFormData((p) => ({ ...p, sku: e.target.value }))} className="input w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t.field_category}</label>
                <select value={formData.category} onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))} className="input w-full text-sm">
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t.products_sale_price} (UZS)</label>
                <input type="number" placeholder="0" value={formData.price_uzs}
                  onChange={(e) => setFormData((p) => ({ ...p, price_uzs: e.target.value }))} className="input w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Unit</label>
                <input type="text" placeholder="pcs" value={formData.unit}
                  onChange={(e) => setFormData((p) => ({ ...p, unit: e.target.value }))} className="input w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t.products_stock}</label>
                <input type="number" placeholder="0" value={formData.current_stock}
                  onChange={(e) => setFormData((p) => ({ ...p, current_stock: e.target.value }))} className="input w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Min Stock</label>
                <input type="number" placeholder="0" value={formData.minimum_stock}
                  onChange={(e) => setFormData((p) => ({ ...p, minimum_stock: e.target.value }))} className="input w-full text-sm" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary flex-1 text-sm">{t.action_cancel}</button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editingProduct ? 'Save Changes' : t.products_add}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
