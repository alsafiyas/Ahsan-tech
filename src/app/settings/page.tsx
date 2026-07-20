'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import AppIcon from '@/components/ui/AppIcon';
import { useLanguage } from '@/context/LanguageContext';

export default function SettingsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('company');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { key: 'company', label: 'Company', icon: 'BuildingOfficeIcon' },
    { key: 'tax', label: 'Tax & Currency', icon: 'BanknotesIcon' },
    { key: 'notifications', label: 'Notifications', icon: 'BellIcon' },
    { key: 'backup', label: 'Backup', icon: 'CloudArrowUpIcon' },
    { key: 'api', label: 'API Keys', icon: 'KeyIcon' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t.settings_title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t.settings_subtitle}</p>
          </div>
          <button onClick={handleSave} className={`btn-primary flex items-center gap-2 text-sm transition-all ${saved ? 'bg-success' : ''}`}>
            <AppIcon name={saved ? 'CheckIcon' : 'CloudArrowUpIcon'} size={16} />
            {saved ? t.action_save + '!' : t.settings_save}
          </button>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Tabs */}
          <div className="w-48 flex-shrink-0">
            <div className="card p-2 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${activeTab === tab.key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                >
                  <AppIcon name={tab.icon as any} size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Company Settings */}
            {activeTab === 'company' && (
              <div className="card p-6 space-y-5">
                <h3 className="font-semibold text-foreground">Company Information</h3>
                <div className="flex items-center gap-5 pb-5 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="w-20 h-20 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary)' }}>
                    <span className="text-2xl font-bold text-white">CC</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Kompaniya nomi kiritilmagan</p>
                    <p className="text-sm text-muted-foreground">Company info to'ldirilishi kerak</p>
                    <button className="btn-secondary text-xs mt-2">Change Logo</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Company Name', value: '', type: 'text' },
                    { label: 'Legal Name', value: '', type: 'text' },
                    { label: 'INN (Tax ID)', value: '', type: 'text' },
                    { label: 'Phone', value: '', type: 'text' },
                    { label: 'Email', value: '', type: 'email' },
                    { label: 'Website', value: '', type: 'text' },
                    { label: 'Address', value: '', type: 'text' },
                    { label: 'City', value: '', type: 'text' },
                  ].map((f) => (
                    <div key={f.label} className={f.label === 'Legal Name' || f.label === 'Address' ? 'col-span-2' : ''}>
                      <label className="block text-xs text-muted-foreground mb-1">{f.label}</label>
                      <input type={f.type} defaultValue={f.value} className="input w-full text-sm" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tax & Currency */}
            {activeTab === 'tax' && (
              <div className="card p-6 space-y-5">
                <h3 className="font-semibold text-foreground">Tax & Currency Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Default Currency</label>
                    <select className="input w-full text-sm">
                      <option value="UZS">UZS — Uzbek Som</option>
                      <option value="USD">USD — US Dollar</option>
                      <option value="EUR">EUR — Euro</option>
                      <option value="RUB">RUB — Russian Ruble</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">USD Exchange Rate</label>
                    <input type="number" defaultValue="12650" className="input w-full text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">VAT Rate (%)</label>
                    <input type="number" defaultValue="15" className="input w-full text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Income Tax Rate (%)</label>
                    <input type="number" defaultValue="6" className="input w-full text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Fiscal Year Start</label>
                    <select className="input w-full text-sm">
                      <option>January</option>
                      <option>April</option>
                      <option>July</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Date Format</label>
                    <select className="input w-full text-sm">
                      <option>YYYY-MM-DD</option>
                      <option>DD/MM/YYYY</option>
                      <option>MM/DD/YYYY</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <div className="card p-6 space-y-5">
                <h3 className="font-semibold text-foreground">Notification Settings</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Telegram Bot', desc: 'Send notifications via Telegram bot', field: 'Bot Token', placeholder: 'bot123456:ABC-DEF...' },
                    { label: 'SMS Gateway', desc: 'Send SMS via Eskiz.uz or Play Mobile', field: 'API Key', placeholder: 'Your SMS API key' },
                    { label: 'Email (SMTP)', desc: 'Send email notifications', field: 'SMTP Host', placeholder: 'smtp.gmail.com' },
                  ].map((ch) => (
                    <div key={ch.label} className="p-4 rounded-lg space-y-3" style={{ background: 'var(--secondary)' }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground text-sm">{ch.label}</p>
                          <p className="text-xs text-muted-foreground">{ch.desc}</p>
                        </div>
                        <div className="w-10 h-5 rounded-full bg-success relative cursor-pointer">
                          <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">{ch.field}</label>
                        <input type="text" placeholder={ch.placeholder} className="input w-full text-sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Backup */}
            {activeTab === 'backup' && (
              <div className="card p-6 space-y-5">
                <h3 className="font-semibold text-foreground">Backup & Recovery</h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg" style={{ background: 'var(--secondary)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-foreground text-sm">Automatic Backup</p>
                        <p className="text-xs text-muted-foreground">Daily backup at 02:00 AM</p>
                      </div>
                      <div className="w-10 h-5 rounded-full bg-success relative cursor-pointer">
                        <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-xs text-muted-foreground mb-1">Frequency</label><select className="input w-full text-sm"><option>Daily</option><option>Weekly</option><option>Monthly</option></select></div>
                      <div><label className="block text-xs text-muted-foreground mb-1">Retention (days)</label><input type="number" defaultValue="30" className="input w-full text-sm" /></div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: 'var(--secondary)' }}>
                    <p className="font-medium text-foreground text-sm mb-2">Last Backup</p>
                    <p className="text-xs text-muted-foreground">Hali zaxira nusxa olinmagan</p>
                    <button className="btn-primary text-xs mt-3 flex items-center gap-1.5">
                      <AppIcon name="CloudArrowUpIcon" size={14} />
                      Backup Now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* API Keys */}
            {activeTab === 'api' && (
              <div className="card p-6 space-y-5">
                <h3 className="font-semibold text-foreground">API Keys & Integrations</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Google Maps API Key', placeholder: 'AIzaSy...' },
                    { label: 'Telegram Bot Token', placeholder: 'bot123456:ABC-DEF...' },
                    { label: 'SMS API Key (Eskiz.uz)', placeholder: 'Your Eskiz API key' },
                    { label: 'Payment Gateway Key', placeholder: 'Payme / Click API key' },
                  ].map((api) => (
                    <div key={api.label}>
                      <label className="block text-xs text-muted-foreground mb-1">{api.label}</label>
                      <div className="flex gap-2">
                        <input type="password" placeholder={api.placeholder} className="input flex-1 text-sm" />
                        <button className="btn-secondary text-xs px-3">Show</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
