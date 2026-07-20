'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebarBadges } from '@/hooks/useSidebarBadges';

interface NavItem {
  key: string;
  labelKey: string;
  icon: string;
  href: string;
  group?: string;
}

const navItems: NavItem[] = [
  { key: 'nav-dashboard',      labelKey: 'nav_dashboard',       icon: 'ChartBarIcon',              href: '/dashboard',        group: 'main' },
  { key: 'nav-crm',            labelKey: 'nav_crm',             icon: 'UsersIcon',                 href: '/crm',              group: 'main' },
  { key: 'nav-sales',          labelKey: 'nav_sales',           icon: 'ShoppingCartIcon',          href: '/sales-management', group: 'main' },
  { key: 'nav-products',       labelKey: 'nav_products',        icon: 'CubeIcon',                  href: '/products',         group: 'main' },
  { key: 'nav-warehouse',      labelKey: 'nav_warehouse',       icon: 'BuildingStorefrontIcon',    href: '/warehouse',        group: 'operations' },
  { key: 'nav-purchasing',     labelKey: 'nav_purchasing',      icon: 'TruckIcon',                 href: '/purchasing',       group: 'operations' },
  { key: 'nav-service',        labelKey: 'nav_service',         icon: 'WrenchScrewdriverIcon',     href: '/service',          group: 'operations' },
  { key: 'nav-installation',   labelKey: 'nav_installation',    icon: 'MapPinIcon',                href: '/installation',     group: 'operations' },
  { key: 'nav-hr',             labelKey: 'nav_employees',       icon: 'UserGroupIcon',             href: '/employees',        group: 'hr' },
  { key: 'nav-attendance',     labelKey: 'nav_attendance',      icon: 'ClockIcon',                 href: '/attendance',       group: 'hr' },
  { key: 'nav-payroll',        labelKey: 'nav_payroll',         icon: 'BanknotesIcon',             href: '/payroll',          group: 'hr' },
  { key: 'nav-finance',        labelKey: 'nav_finance_module',  icon: 'CreditCardIcon',            href: '/finance',          group: 'finance' },
  { key: 'nav-reports',        labelKey: 'nav_reports',         icon: 'DocumentChartBarIcon',      href: '/reports',          group: 'finance' },
  { key: 'nav-notifications',  labelKey: 'nav_notifications',   icon: 'BellIcon',                  href: '/notifications',    group: 'finance' },
  { key: 'nav-alerts',         labelKey: 'nav_alerts',          icon: 'ExclamationTriangleIcon',   href: '/alerts',           group: 'finance' },
  { key: 'nav-calendar',       labelKey: 'nav_calendar',        icon: 'CalendarIcon',              href: '/calendar',         group: 'finance' },
  { key: 'nav-branches',       labelKey: 'nav_branches',        icon: 'BuildingOfficeIcon',        href: '/branches',         group: 'admin' },
  { key: 'nav-audit',          labelKey: 'nav_audit',           icon: 'ShieldCheckIcon',           href: '/audit',            group: 'admin' },
  { key: 'nav-audit-config',   labelKey: 'nav_audit_config',    icon: 'AdjustmentsHorizontalIcon', href: '/audit-config',     group: 'admin' },
  { key: 'nav-user-management',labelKey: 'nav_user_management', icon: 'UserGroupIcon',             href: '/user-management',  group: 'admin' },
  { key: 'nav-settings',       labelKey: 'nav_settings',        icon: 'Cog6ToothIcon',             href: '/settings',         group: 'admin' },
  { key: 'nav-roles',          labelKey: 'nav_roles',           icon: 'LockClosedIcon',            href: '/roles',            group: 'admin' },
];

const groups: { key: string; labelKey: string }[] = [
  { key: 'main',       labelKey: 'nav_main' },
  { key: 'operations', labelKey: 'nav_operations' },
  { key: 'hr',         labelKey: 'nav_hr_payroll' },
  { key: 'finance',    labelKey: 'nav_finance' },
  { key: 'admin',      labelKey: 'nav_administration' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const { user, userRole, signOut } = useAuth();
  const badges = useSidebarBadges();
  const [signingOut, setSigningOut] = useState(false);

  // Derive display name: prefer full_name from metadata, then email prefix
  const displayName: string =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (user?.email ? user.email.split('@')[0] : 'User');

  const displayEmail: string = user?.email || '';
  const displayRole: string = userRole || 'User';
  const initials: string = getInitials(displayName);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      router.push('/login-screen');
    } catch {
      router.push('/login-screen');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <aside
      className="flex flex-col h-full transition-all duration-300 ease-in-out overflow-hidden"
      style={{
        width: collapsed ? '64px' : '240px',
        background: 'var(--card)',
        borderRight: '1px solid var(--border)',
        minWidth: collapsed ? '64px' : '240px',
      }}
    >
      {/* ── Logo ── */}
      <div
        className="flex items-center gap-3 px-4 py-4 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)', minHeight: '64px' }}
      >
        <div className="flex-shrink-0">
          <AppLogo size={32} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <span className="font-bold text-sm text-foreground whitespace-nowrap tracking-tight">
              CCTVErpPro
            </span>
            <p className="text-xs text-muted-foreground whitespace-nowrap">Security ERP</p>
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
        {groups.map((group) => {
          const items = navItems.filter((n) => n.group === group.key);
          return (
            <div key={`group-${group.key}`} className="mb-1">
              {/* Group label */}
              {!collapsed && (
                <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--muted-foreground)', letterSpacing: '0.08em' }}>
                  {t[group.labelKey as keyof typeof t] as string}
                </p>
              )}
              {collapsed && (
                <div className="mx-3 my-2 border-t" style={{ borderColor: 'var(--border)' }} />
              )}

              {/* Nav items */}
              {items.map((item) => {
                const label = t[item.labelKey as keyof typeof t] as string;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="relative flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group"
                    style={active
                      ? {
                      background: 'rgba(14,165,233, 0.12)',
                          color: 'var(--primary)',
                          borderLeft: '3px solid var(--primary)',
                          paddingLeft: '9px',  /* 12px - 3px border */
                        }
                      : {
                          color: 'var(--muted-foreground)',
                          borderLeft: '3px solid transparent',
                          paddingLeft: '9px',
                        }
                    }
                    title={collapsed ? label : undefined}
                    onMouseEnter={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = 'var(--secondary)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--foreground)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = '';
                        (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)';
                      }
                    }}
                  >
                    {/* Icon */}
                    <span className="flex-shrink-0">
                      <Icon
                        name={item.icon as any}
                        size={18}
                        style={{ color: active ? 'var(--primary)' : undefined }}
                      />
                    </span>

                    {/* Label */}
                    {!collapsed && (
                      <span className="flex-1 truncate">{label}</span>
                    )}

                    {/* Badge (expanded) */}
                    {!collapsed && (() => {
                      const count =
                        item.href === '/crm'              ? badges.crm
                        : item.href === '/sales-management' ? badges.sales
                        : item.href === '/service'          ? badges.service
                        : item.href === '/notifications'    ? badges.notifications
                        : 0;
                      return count > 0 ? (
                        <span
                          className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-xs font-bold"
                          style={{
                            background: active ? 'var(--primary)' : 'rgba(14,165,233,0.15)',
                            color: active ? 'var(--primary-foreground)' : 'var(--primary)',
                          }}
                        >
                          {count}
                        </span>
                      ) : null;
                    })()}

                    {/* Badge dot (collapsed) */}
                    {collapsed && (() => {
                      const count =
                        item.href === '/crm'              ? badges.crm
                        : item.href === '/sales-management' ? badges.sales
                        : item.href === '/service'          ? badges.service
                        : item.href === '/notifications'    ? badges.notifications
                        : 0;
                      return count > 0 ? (
                        <span
                          className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border border-card"
                          style={{ background: 'var(--primary)' }}
                        />
                      ) : null;
                    })()}

                    {/* Tooltip (collapsed) */}
                    {collapsed && (
                      <div
                        className="absolute left-full ml-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 shadow-lg"
                        style={{
                          background: 'var(--card)',
                          color: 'var(--foreground)',
                          border: '1px solid var(--border)',
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                      >
                        {label}
                        {(() => {
                          const count =
                            item.href === '/crm'               ? badges.crm
                            : item.href === '/sales-management' ? badges.sales
                            : item.href === '/service'          ? badges.service
                            : item.href === '/notifications'    ? badges.notifications
                            : 0;
                          return count > 0 ? (
                            <span className="ml-1.5 px-1 py-0.5 rounded-full text-xs font-bold"
                              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}>
                              {count}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* ── Bottom: collapse toggle + user ── */}
      <div className="flex-shrink-0 border-t p-2 space-y-1" style={{ borderColor: 'var(--border)' }}>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150"
          style={{ color: 'var(--muted-foreground)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--secondary)';
            (e.currentTarget as HTMLElement).style.color = 'var(--foreground)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = '';
            (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)';
          }}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <Icon name={collapsed ? 'ChevronRightIcon' : 'ChevronLeftIcon'} size={16} />
          {!collapsed && <span className="text-xs">{t.nav_collapse}</span>}
        </button>

        {/* User row */}
        <div
          className="flex items-center gap-2.5 px-2 py-2 rounded-lg"
          style={{ background: 'rgba(14,165,233,0.06)' }}
        >
          {/* Avatar */}
          <div
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            {initials}
          </div>

          {/* Name + role */}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate leading-tight">
                {displayName}
              </p>
              <p className="text-xs truncate leading-tight" style={{ color: 'var(--primary)', fontWeight: 500 }}>
                {displayRole}
              </p>
            </div>
          )}

          {/* Logout button — visible always */}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex-shrink-0 p-1.5 rounded-lg transition-all duration-150 disabled:opacity-50"
            style={{ color: 'var(--muted-foreground)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)';
              (e.currentTarget as HTMLElement).style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '';
              (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)';
            }}
            title="Chiqish (Logout)"
          >
            {signingOut
              ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin block" />
              : <Icon name="ArrowRightOnRectangleIcon" size={16} />
            }
          </button>
        </div>
      </div>
    </aside>
  );
}