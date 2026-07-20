'use client';

import React, { useState } from 'react';
import LoginForm from './components/LoginForm';
import LoginBrandPanel from './components/LoginBrandPanel';
import RegisterForm from './components/RegisterForm';
import ForgotPasswordForm from './components/ForgotPasswordForm';

export default function LoginPage() {
  const [view, setView] = useState<'login' | 'register' | 'forgot-password'>('login');

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--background)' }}
    >
      {/* Left brand panel */}
      <LoginBrandPanel />
      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        {view === 'login' && (
          <LoginForm
            onSwitchToRegister={() => setView('register')}
            onForgotPassword={() => setView('forgot-password')}
          />
        )}
        {view === 'register' && (
          <RegisterForm onSwitchToLogin={() => setView('login')} />
        )}
        {view === 'forgot-password' && (
          <ForgotPasswordForm onSwitchToLogin={() => setView('login')} />
        )}
      </div>
    </div>
  );
}