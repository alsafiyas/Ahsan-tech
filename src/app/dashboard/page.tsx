'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAuth } from '@/contexts/AuthContext';
import AdminDashboard from './components/AdminDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import OperatorDashboard from './components/OperatorDashboard';

export default function DashboardPage() {
  const { userRole } = useAuth();
  const dashboard = useDashboardData(userRole);

  const renderDashboard = () => {
    switch (userRole) {
      case 'Admin':
        return <AdminDashboard dashboard={dashboard} />;
      case 'Manager':
        return <ManagerDashboard dashboard={dashboard} />;
      case 'Operator': case'Technician':
        return <OperatorDashboard dashboard={dashboard} />;
      default:
        // Fallback: show manager view for unknown roles
        return <ManagerDashboard dashboard={dashboard} />;
    }
  };

  return (
    <AppLayout>
      {renderDashboard()}
    </AppLayout>
  );
}