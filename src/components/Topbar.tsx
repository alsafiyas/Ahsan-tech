'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

const branches = [
  { key: 'branch-tashkent', label: 'Tashkent HQ' },
  { key: 'branch-samarkand', label: 'Samarkand' },
  { key: 'branch-namangan', label: 'Namangan' },
  { key: 'branch-andijan', label: 'Andijan' },
];

const notifications = [
  { key: 'notif-1', type: 'warning', message: 'Hikvision DS-2CD2T47 stock critically low (2 units)', time: '5 min ago' },
  { key: 'notif-2', type: 'info', message: 'Service ticket #SRV-0091 marked Ready for pickup', time: '18 min ago' },
  { key: 'notif-3', type: 'danger', message: 'Invoice #INV-0234 overdue by 7 days — Mirzo Ulugbek LLC', time: '1 hr ago' },
  { key: 'notif-4', type: 'success', message: 'Installation job #JOB-0055 completed by Jasur Xolmatov', time: '2 hr ago' },
  { key: 'notif-5', type: 'warning', message: 'Davomat: 3 employees have not checked in today', time: '3 hr ago' },
];

export default function Topbar() {
  const { language, setLanguage, t, supportedLanguages } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, userRole } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState('branch-tashkent');
  const [showNotifs, setShowNotifs] = useState(false);
  const [showBranch, setShowBranch] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifTypeColor: Record<string, string> = {
    warning: 'text-warning',
    info: 'text-info',
    danger: 'text-danger',
    success: 'text-success',
  };

  const notifTypeBg: Record<string, string> = {
    warning: 'bg-warning/10',
    info: 'bg-info/10',
    danger: 'bg-danger/10',
    success: 'bg-success/10',
  };

  const currentBranch = branches.find((b) => b.key === selectedBranch);
  const currentLang = supportedLanguages.find((l) => l.code === language);

  const closeAll = () => {
    setShowNotifs(false);
    setShowBranch(false);
    setShowLangMenu(false);
    setShowUserMenu(false);
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header
      className="flex items-center justify-between px-5 py-0 border-b relative z-30"
      style={{ height: '64px', background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      {/* Left: live badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-medium text-success">{t.topbar_live}</span>
        </div>
        <span className="text-muted-foreground text-xs">|</span>
        <span className="text-xs text-muted-foreground">{t.topbar_last_sync}</span>
      </div>

      {/* Right: language, branch, search, notifications, user */}
      <div className="flex items-center gap-3">

        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => { setShowLangMenu(!showLangMenu); setShowNotifs(false); setShowBranch(false); setShowUserMenu(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 hover:bg-secondary"
            style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
            title={t.topbar_language}
          >
            <span className="text-base leading-none">{currentLang?.flag}</span>
            <span className="hidden sm:inline text-xs">{currentLang?.label}</span>
            <Icon name="ChevronDownIcon" size={12} className="text-muted-foreground" />
          </button>
          {showLangMenu && (
            <div
              className="absolute right-0 top-full mt-1 w-40 rounded-xl py-1 z-50 shadow-xl"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.topbar_language}</p>
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => { setLanguage(lang.code); setShowLangMenu(false); }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition-colors duration-100 ${
                    lang.code === language ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span>{lang.label}</span>
                  {lang.code === language && (
                    <Icon name="CheckIcon" size={12} className="ml-auto text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150"
          style={{ border: '1px solid var(--border)' }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Icon name="SunIcon" size={16} />
          ) : (
            <Icon name="MoonIcon" size={16} />
          )}
        </button>

        {/* Branch selector */}
        <div className="relative">
          <button
            onClick={() => { setShowBranch(!showBranch); setShowNotifs(false); setShowLangMenu(false); setShowUserMenu(false); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 hover:bg-secondary"
            style={{ border: '1px solid var(--border)', color: 'var(--foreground)' }}
          >
            <Icon name="BuildingOfficeIcon" size={14} className="text-muted-foreground" />
            <span>{currentBranch?.label}</span>
            <Icon name="ChevronDownIcon" size={12} className="text-muted-foreground" />
          </button>
          {showBranch && (
            <div
              className="absolute right-0 top-full mt-1 w-44 rounded-xl py-1 z-50 shadow-xl"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              {branches.map((b) => (
                <button
                  key={b.key}
                  onClick={() => { setSelectedBranch(b.key); setShowBranch(false); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors duration-100 ${
                    b.key === selectedBranch ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative hidden md:block">
          <Icon name="MagnifyingGlassIcon" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t.topbar_search_placeholder}
            className="input-field pl-9 py-1.5 text-sm w-52"
          />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifs(!showNotifs); setShowBranch(false); setShowLangMenu(false); setShowUserMenu(false); }}
            className="relative p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150"
          >
            <Icon name="BellIcon" size={18} />
            <span
              className="absolute top-1 right-1 w-4 h-4 rounded-full text-xs font-bold flex items-center justify-center"
              style={{ background: 'var(--danger)', color: '#fff', fontSize: '9px' }}
            >
              {notifications.length}
            </span>
          </button>
          {showNotifs && (
            <div
              className="absolute right-0 top-full mt-1 w-80 rounded-xl py-2 z-50 shadow-xl"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm font-semibold text-foreground">{t.topbar_notifications}</span>
                <span className="text-xs text-muted-foreground">{notifications.length} {t.topbar_notifications_new}</span>
              </div>
              {notifications.map((n) => (
                <div
                  key={n.key}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-secondary transition-colors duration-100 cursor-pointer"
                >
                  <span className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${notifTypeBg[n.type]}`}>
                    <Icon
                      name={n.type === 'warning' ? 'ExclamationTriangleIcon' : n.type === 'danger' ? 'XCircleIcon' : n.type === 'success' ? 'CheckCircleIcon' : 'InformationCircleIcon'}
                      size={12}
                      className={notifTypeColor[n.type]}
                    />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-relaxed">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
              <div className="px-4 py-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <Link
                  href="/notifications"
                  onClick={closeAll}
                  className="text-xs text-primary hover:text-info transition-colors"
                >
                  {t.topbar_view_all}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User avatar — clickable dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifs(false); setShowBranch(false); setShowLangMenu(false); }}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-secondary transition-all duration-150"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              {initials}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-medium text-foreground leading-tight">{displayName}</p>
              <p className="text-xs text-muted-foreground leading-tight">{userRole || 'User'}</p>
            </div>
            <Icon name="ChevronDownIcon" size={12} className="hidden lg:block text-muted-foreground" />
          </button>

          {showUserMenu && (
            <div
              className="absolute right-0 top-full mt-1 w-48 rounded-xl py-1.5 z-50 shadow-xl"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Link
                href="/account"
                onClick={closeAll}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <Icon name="UserCircleIcon" size={15} className="text-muted-foreground" />
                My Account
              </Link>
              {userRole === 'Admin' && (
                <>
                  <Link
                    href="/roles"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                  >
                    <Icon name="UsersIcon" size={15} className="text-muted-foreground" />
                    User Management
                  </Link>
                  <Link
                    href="/settings"
                    onClick={closeAll}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                  >
                    <Icon name="Cog6ToothIcon" size={15} className="text-muted-foreground" />
                    System Settings
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}