import React from 'react';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';

const features = [
  { key: 'feat-sales', icon: 'ShoppingCartIcon', title: 'Sales & POS', desc: 'Full order lifecycle from quotation to payment' },
  { key: 'feat-service', icon: 'WrenchScrewdriverIcon', title: 'Service Center', desc: 'Track repair tickets and warranty claims' },
  { key: 'feat-warehouse', icon: 'BuildingStorefrontIcon', title: 'Warehouse', desc: 'Multi-branch inventory with QR/barcode scanning' },
  { key: 'feat-hr', icon: 'UserGroupIcon', title: 'HR & Attendance', desc: 'GPS check-in, Face ID, and payroll management' },
];

const stats = [
  { key: 'stat-branches', value: '12+', label: 'Branches' },
  { key: 'stat-products', value: '2,400+', label: 'Products' },
  { key: 'stat-customers', value: '8,000+', label: 'Customers' },
];

export default function LoginBrandPanel() {
  return (
    <div
      className="hidden lg:flex flex-col w-[480px] xl:w-[560px] relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0a0f1e 0%, #0f1f3d 50%, #0a1628 100%)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Scan line animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-full h-32 opacity-30"
          style={{
            background: 'linear-gradient(to bottom, transparent, rgba(14, 165, 233, 0.08), transparent)',
            animation: 'scan 6s linear infinite',
          }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(var(--primary) 1px, transparent 1px), linear-gradient(90deg, var(--primary) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-10">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <AppLogo size={40} />
          <div>
            <span className="font-bold text-lg text-foreground tracking-tight">CCTVErpPro</span>
            <p className="text-xs text-muted-foreground">Security Systems ERP</p>
          </div>
        </div>

        {/* Headline */}
        <div className="mb-10">
          <h1 className="text-hero-xl text-foreground mb-3 leading-tight">
            Complete ERP for<br />
            <span style={{ color: 'var(--primary)' }}>CCTV Businesses</span>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Manage sales, installations, service tickets, warehouse, and HR — all from one unified platform built for the security industry.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-10">
          {features.map((f) => (
            <div key={f.key} className="flex items-start gap-3">
              <div
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(14, 165, 233, 0.12)', border: '1px solid rgba(14, 165, 233, 0.2)' }}
              >
                <Icon name={f.icon as any} size={15} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-auto">
          <div
            className="flex items-center gap-6 p-4 rounded-xl"
            style={{ background: 'rgba(14, 165, 233, 0.06)', border: '1px solid rgba(14, 165, 233, 0.12)' }}
          >
            {stats.map((s) => (
              <div key={s.key} className="text-center flex-1">
                <p className="text-xl font-bold text-primary font-tabular">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Trusted by CCTV businesses across Uzbekistan
          </p>
        </div>
      </div>
    </div>
  );
}