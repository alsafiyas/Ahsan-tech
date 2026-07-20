'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

type UserRole = 'Admin' | 'Manager' | 'Operator';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

function Forbidden403() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      {/* Icon */}
      <div
        className="flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
        style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{ color: '#ef4444' }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      </div>

      {/* Error code */}
      <div
        className="text-7xl font-bold mb-3 tabular-nums"
        style={{ color: 'var(--foreground)', opacity: 0.15 }}
      >
        403
      </div>

      {/* Title */}
      <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
        Access Denied
      </h1>

      {/* Description */}
      <p className="text-sm max-w-sm mb-8" style={{ color: 'var(--muted-foreground)' }}>
        You don&apos;t have permission to view this page. Please contact your administrator if you
        believe this is a mistake.
      </p>

      {/* Go back button */}
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
        style={{
          background: 'var(--primary)',
          color: 'var(--primary-foreground)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Go Back
      </button>
    </div>
  );
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { userRole, roleLoading } = useAuth();

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="animate-spin w-7 h-7"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            style={{ color: 'var(--primary)' }}
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Checking permissions...
          </p>
        </div>
      </div>
    );
  }

  if (!userRole || !allowedRoles.includes(userRole as UserRole)) {
    return <Forbidden403 />;
  }

  return <>{children}</>;
}
