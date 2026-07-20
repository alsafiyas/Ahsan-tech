'use client';

import React from 'react';
import { Customer } from '../../data/customers';

interface ContactInfoTabProps {
  customer: Customer;
}

function InfoRow({ icon, label, value, link }: { icon: React.ReactNode; label: string; value: string; link?: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <div
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: 'var(--secondary)' }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
}

export default function ContactInfoTab({ customer }: ContactInfoTabProps) {
  return (
    <div className="p-5 space-y-6">
      {/* Contact details */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Contact Information</h3>
        <div
          className="rounded-xl px-4"
          style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}
        >
          <InfoRow
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>}
            label="Phone"
            value={customer.phone}
            link={`tel:${customer.phone}`}
          />
          {customer.telegram && (
            <InfoRow
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#2AABEE' }}><path d="M21.198 2.433a2.242 2.242 0 00-1.022.215l-16.5 7.5a2.25 2.25 0 00.126 4.073l3.9 1.205 2.306 6.54a.75.75 0 001.364.12l2.21-4.42 4.562 3.65a2.25 2.25 0 003.522-1.31l3.5-17.5a2.25 2.25 0 00-2.968-2.073z" /></svg>}
              label="Telegram"
              value={customer.telegram}
              link={`https://t.me/${customer.telegram.replace('@', '')}`}
            />
          )}
          {customer.email && (
            <InfoRow
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>}
              label="Email"
              value={customer.email}
              link={`mailto:${customer.email}`}
            />
          )}
        </div>
      </div>

      {/* Address */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Address & Location</h3>
        <div
          className="rounded-xl px-4"
          style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}
        >
          <InfoRow
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>}
            label="Address"
            value={customer.address}
          />
          <InfoRow
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>}
            label="District / City"
            value={`${customer.district ?? ''}, ${customer.city}`}
          />
        </div>

        {/* Google Maps embed placeholder */}
        <div
          className="mt-3 rounded-xl overflow-hidden flex items-center justify-center"
          style={{ height: '180px', background: 'var(--secondary)', border: '1px solid var(--border)' }}
        >
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(customer.address + ', ' + customer.city)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
            <span className="text-sm font-medium">Open in Google Maps</span>
            <span className="text-xs">{customer.address}</span>
          </a>
        </div>
      </div>

      {/* Notes */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Notes</h3>
        <div
          className="rounded-xl p-4 min-h-[80px]"
          style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm text-muted-foreground italic">No notes added yet. Click to add a note...</p>
        </div>
      </div>
    </div>
  );
}
