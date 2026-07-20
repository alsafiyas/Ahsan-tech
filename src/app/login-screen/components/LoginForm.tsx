'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginFormProps {
  onSwitchToRegister?: () => void;
  onForgotPassword?: () => void;
}

export default function LoginForm({ onSwitchToRegister, onForgotPassword }: LoginFormProps) {
  const router = useRouter();
  const { signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await signIn(data.email, data.password);
      toast.success('Welcome back! Signed in successfully.');
      router.push('/dashboard');
    } catch (err: any) {
      setLoginAttempts((p) => p + 1);
      const msg = err?.message || 'Invalid email or password. Please try again.';
      setError('password', { message: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-1.5">Sign in to CCTVErpPro</h2>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to access the ERP system
        </p>
      </div>

      {/* Security indicators */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span className="text-xs text-muted-foreground">SSL Secured</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span className="text-xs text-muted-foreground">GPS Verified</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span className="text-xs text-muted-foreground">Device Trusted</span>
        </div>
      </div>

      {/* Lock warning */}
      {loginAttempts >= 3 && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg mb-4 text-sm"
          style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: 'var(--danger)' }}
        >
          <Icon name="ShieldExclamationIcon" size={16} />
          <span>Multiple failed attempts detected. Please verify your credentials.</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Email / Username
          </label>
          <p className="text-xs text-muted-foreground mb-2">Use your company email address</p>
          <input
            type="email"
            className={`input-field ${errors.email ? 'border-danger' : ''}`}
            placeholder="you@cctverpro.uz"
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
            })}
          />
          {errors.email && (
            <p className="text-xs text-danger mt-1.5 flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size={12} />
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-foreground">Password</label>
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-xs text-primary hover:text-info transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className={`input-field ${errors.password ? 'border-danger' : ''}`}
              style={{ paddingRight: '2.75rem' }}
              placeholder="Enter your password"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
            >
              <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={18} />
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-danger mt-1.5 flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size={12} />
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="rememberMe"
            className="w-4 h-4 rounded"
            style={{ accentColor: 'var(--primary)' }}
            {...register('rememberMe')}
          />
          <label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer">
            Remember this device for 30 days
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3 text-sm font-semibold"
          style={{ minWidth: '100%' }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Icon name="ArrowPathIcon" size={16} className="animate-spin" />
              Signing in...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Icon name="LockClosedIcon" size={16} />
              Sign In
            </span>
          )}
        </button>
      </form>

      {/* Footer note */}
      <p className="text-sm text-muted-foreground text-center mt-6">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-primary hover:text-info font-medium transition-colors"
        >
          Create one
        </button>
      </p>
    </div>
  );
}