/**
 * useSidebarBadges — fetches live badge counts from Supabase
 * for the sidebar navigation items.
 *
 * Badge meaning:
 *   crm          → customers added in last 7 days (new leads)
 *   sales        → orders with status in ['confirmed', 'invoiced', 'partial', 'overdue']
 *   service      → open service tickets (pending / repairing / service / ready)
 *   notifications→ unread rows in the alerts table
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface SidebarBadges {
  crm: number;
  sales: number;
  service: number;
  notifications: number;
}

const EMPTY: SidebarBadges = { crm: 0, sales: 0, service: 0, notifications: 0 };

export function useSidebarBadges(): SidebarBadges {
  const supabase = createClient();
  const [badges, setBadges] = useState<SidebarBadges>(EMPTY);

  const fetchBadges = useCallback(async () => {
    try {
      const [crmRes, salesRes, serviceRes, notifRes] = await Promise.allSettled([
        // CRM: customers added in last 7 days
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),

        // Sales: active/pending orders
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .in('order_status', ['confirmed', 'invoiced', 'partial', 'overdue']),

        // Service: open tickets
        supabase
          .from('service_tickets')
          .select('id', { count: 'exact', head: true })
          .in('ticket_status', ['pending', 'repairing', 'service', 'ready']),

        // Notifications: unread alerts
        supabase
          .from('alerts')
          .select('id', { count: 'exact', head: true })
          .eq('is_read', false),
      ]);

      setBadges({
        crm:
          crmRes.status === 'fulfilled' ? (crmRes.value.count ?? 0) : 0,
        sales:
          salesRes.status === 'fulfilled' ? (salesRes.value.count ?? 0) : 0,
        service:
          serviceRes.status === 'fulfilled' ? (serviceRes.value.count ?? 0) : 0,
        notifications:
          notifRes.status === 'fulfilled' ? (notifRes.value.count ?? 0) : 0,
      });
    } catch {
      setBadges(EMPTY);
    }
  }, []);

  useEffect(() => {
    fetchBadges();

    // Realtime subscriptions — update badges when underlying tables change
    const channels = [
      supabase
        .channel('badge-orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchBadges)
        .subscribe(),

      supabase
        .channel('badge-service')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'service_tickets' }, fetchBadges)
        .subscribe(),

      supabase
        .channel('badge-crm')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_customers' }, fetchBadges)
        .subscribe(),

      supabase
        .channel('badge-alerts')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, fetchBadges)
        .subscribe(),
    ];

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [fetchBadges]);

  return badges;
}
