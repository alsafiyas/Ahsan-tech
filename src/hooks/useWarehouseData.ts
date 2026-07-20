'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface WarehouseStockItem {
  id: string;
  productId: string;
  product: string;
  sku: string;
  category: string;
  warehouse: string;
  quantity: number;
  minStock: number;
  unit: string;
  lastMovement: string;
  movementType: 'in' | 'out' | 'transfer';
}

export interface StockMovement {
  id: string;
  date: string;
  product: string;
  sku: string;
  type: 'in' | 'out' | 'transfer';
  quantity: number;
  from: string;
  to: string;
  reference: string;
  user: string;
}

export interface WarehouseStats {
  totalItems: number;
  lowStockCount: number;
  warehouseCount: number;
  todayMovements: number;
}

interface UseWarehouseDataReturn {
  stockItems: WarehouseStockItem[];
  movements: StockMovement[];
  stats: WarehouseStats;
  lowStockItems: WarehouseStockItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  receiveStock: (productId: string, warehouseName: string, quantity: number, reference: string, performedBy: string) => Promise<{ success: boolean; error?: string }>;
  issueStock: (productId: string, warehouseName: string, quantity: number, toLocation: string, reference: string, performedBy: string) => Promise<{ success: boolean; error?: string }>;
}

export function useWarehouseData(): UseWarehouseDataReturn {
  const [stockItems, setStockItems] = useState<WarehouseStockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      setError(null);

      // Fetch warehouse stock joined with products
      const { data: stockData, error: stockError } = await supabase
        .from('warehouse_stock')
        .select(`
          id,
          product_id,
          warehouse_name,
          quantity,
          min_stock,
          unit,
          last_movement_date,
          last_movement_type,
          products (
            id,
            name,
            sku,
            category
          )
        `)
        .order('last_movement_date', { ascending: false });

      if (stockError) {
        console.error('Warehouse stock fetch error:', stockError.message);
        setError(stockError.message);
        return;
      }

      // Fetch stock movements joined with products
      const { data: movementsData, error: movementsError } = await supabase
        .from('stock_movements')
        .select(`
          id,
          movement_type,
          quantity,
          from_location,
          to_location,
          reference,
          performed_by,
          movement_date,
          products (
            name,
            sku
          )
        `)
        .order('movement_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (movementsError) {
        console.error('Stock movements fetch error:', movementsError.message);
        setError(movementsError.message);
        return;
      }

      // Map stock data
      const mappedStock: WarehouseStockItem[] = (stockData || []).map((row: any) => ({
        id: row.id,
        productId: row.product_id,
        product: row.products?.name ?? 'Unknown',
        sku: row.products?.sku ?? '',
        category: row.products?.category ?? '',
        warehouse: row.warehouse_name,
        quantity: row.quantity,
        minStock: row.min_stock,
        unit: row.unit,
        lastMovement: row.last_movement_date,
        movementType: row.last_movement_type as 'in' | 'out' | 'transfer',
      }));

      // Map movements data
      const mappedMovements: StockMovement[] = (movementsData || []).map((row: any) => ({
        id: row.id,
        date: row.movement_date,
        product: row.products?.name ?? 'Unknown',
        sku: row.products?.sku ?? '',
        type: row.movement_type as 'in' | 'out' | 'transfer',
        quantity: row.quantity,
        from: row.from_location,
        to: row.to_location,
        reference: row.reference,
        user: row.performed_by,
      }));

      setStockItems(mappedStock);
      setMovements(mappedMovements);
    } catch (err: any) {
      console.error('useWarehouseData error:', err);
      setError(err?.message ?? 'Failed to load warehouse data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Receive stock (purchase order IN)
  const receiveStock = useCallback(async (
    productId: string,
    warehouseName: string,
    quantity: number,
    reference: string,
    performedBy: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Find existing warehouse_stock row
      const { data: existing, error: findError } = await supabase
        .from('warehouse_stock')
        .select('id, quantity')
        .eq('product_id', productId)
        .eq('warehouse_name', warehouseName)
        .maybeSingle();

      if (findError) return { success: false, error: findError.message };

      if (existing) {
        // Update existing stock
        const { error: updateError } = await supabase
          .from('warehouse_stock')
          .update({
            quantity: existing.quantity + quantity,
            last_movement_date: new Date().toISOString().split('T')[0],
            last_movement_type: 'in',
          })
          .eq('id', existing.id);

        if (updateError) return { success: false, error: updateError.message };
      } else {
        // Get product info for defaults
        const { data: product } = await supabase
          .from('products')
          .select('minimum_stock, unit')
          .eq('id', productId)
          .maybeSingle();

        const { error: insertError } = await supabase
          .from('warehouse_stock')
          .insert({
            product_id: productId,
            warehouse_name: warehouseName,
            quantity,
            min_stock: product?.minimum_stock ?? 5,
            unit: product?.unit ?? 'pcs',
            last_movement_date: new Date().toISOString().split('T')[0],
            last_movement_type: 'in',
          });

        if (insertError) return { success: false, error: insertError.message };
      }

      // Log movement
      const { error: movError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: productId,
          movement_type: 'in',
          quantity,
          from_location: 'Supplier',
          to_location: warehouseName,
          reference,
          performed_by: performedBy,
          movement_date: new Date().toISOString().split('T')[0],
        });

      if (movError) return { success: false, error: movError.message };

      await fetchData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ?? 'Unknown error' };
    }
  }, [fetchData]);

  // Issue stock (sales OUT)
  const issueStock = useCallback(async (
    productId: string,
    warehouseName: string,
    quantity: number,
    toLocation: string,
    reference: string,
    performedBy: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: existing, error: findError } = await supabase
        .from('warehouse_stock')
        .select('id, quantity')
        .eq('product_id', productId)
        .eq('warehouse_name', warehouseName)
        .maybeSingle();

      if (findError) return { success: false, error: findError.message };
      if (!existing) return { success: false, error: 'No stock found for this product/warehouse' };
      if (existing.quantity < quantity) return { success: false, error: 'Insufficient stock' };

      const { error: updateError } = await supabase
        .from('warehouse_stock')
        .update({
          quantity: existing.quantity - quantity,
          last_movement_date: new Date().toISOString().split('T')[0],
          last_movement_type: 'out',
        })
        .eq('id', existing.id);

      if (updateError) return { success: false, error: updateError.message };

      const { error: movError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: productId,
          movement_type: 'out',
          quantity,
          from_location: warehouseName,
          to_location: toLocation,
          reference,
          performed_by: performedBy,
          movement_date: new Date().toISOString().split('T')[0],
        });

      if (movError) return { success: false, error: movError.message };

      await fetchData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message ?? 'Unknown error' };
    }
  }, [fetchData]);

  useEffect(() => {
    fetchData();

    // Real-time subscription for warehouse_stock changes
    const stockChannel = supabase
      .channel('warehouse_stock_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warehouse_stock' }, () => {
        fetchData();
      })
      .subscribe();

    // Real-time subscription for stock_movements changes
    const movementsChannel = supabase
      .channel('stock_movements_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_movements' }, () => {
        fetchData();
      })
      .subscribe();

    // Real-time subscription for products (stock sync)
    const productsChannel = supabase
      .channel('products_stock_realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(stockChannel);
      supabase.removeChannel(movementsChannel);
      supabase.removeChannel(productsChannel);
    };
  }, [fetchData]);

  const lowStockItems = stockItems.filter((s) => s.quantity <= s.minStock);

  const uniqueWarehouses = new Set(stockItems.map((s) => s.warehouse)).size;

  const today = new Date().toISOString().split('T')[0];
  const todayMovements = movements.filter((m) => m.date === today).length;

  const stats: WarehouseStats = {
    totalItems: stockItems.length,
    lowStockCount: lowStockItems.length,
    warehouseCount: uniqueWarehouses,
    todayMovements,
  };

  return {
    stockItems,
    movements,
    stats,
    lowStockItems,
    loading,
    error,
    refetch: fetchData,
    receiveStock,
    issueStock,
  };
}
