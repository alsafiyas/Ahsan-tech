'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';

interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const router = useRouter();
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<RegisterFormData>({
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const passwordValue = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await signUp(data.email, data.password, { fullName: data.fullName });
      setRegistered(true);
      setRegisteredEmail(data.email);
      toast.success('Account created! Please check your email to confirm your account.');
    } catch (err: any) {
      const msg = err?.message || 'Registration failed. Please try again.';
      setError('email', { message: msg });
    } finally {
      setIsLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="w-full max-w-md animate-fade-in text-center">
        {/* Status badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
          style={{ background: 'rgba(234,179,8,0.12)', color: 'var(--warning, #ca8a04)', border: '1px solid rgba(234,179,8,0.3)' }}
        >
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          Awaiting Email Verification
        </div>

        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(59,130,246,0.12)' }}
        >
          <Icon name="EnvelopeOpenIcon" size={36} className="text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Verify your email</h2>
        <p className="text-sm text-muted-foreground mb-2">
          Your account is pending verification. We sent a confirmation link to:
        </p>
        <p className="text-sm font-medium text-foreground mb-4">{registeredEmail}</p>
        <p className="text-xs text-muted-foreground mb-6">
          Click the link in the email to activate your account. You won&apos;t be able to sign in
          until your email is confirmed. Check your spam folder if you don&apos;t see it.
        </p>

        {/* Info box */}
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-lg text-left mb-6"
          style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
        >
          <Icon name="InformationCircleIcon" size={16} className="text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            After clicking the confirmation link, return here and sign in with your credentials.
          </p>
        </div>

        <button
          type="button"
          onClick={onSwitchToLogin}
          className="btn-primary w-full py-3 text-sm font-semibold"
        >
          <span className="flex items-center justify-center gap-2">
            <Icon name="ArrowLeftIcon" size={16} />
            Back to Sign In
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-1.5">Create your account</h2>
        <p className="text-sm text-muted-foreground">
          Register to access CCTVErpPro
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Full Name
          </label>
          <input
            type="text"
            className={`input-field ${errors.fullName ? 'border-danger' : ''}`}
            placeholder="John Smith"
            {...register('fullName', {
              required: 'Full name is required',
              minLength: { value: 2, message: 'Name must be at least 2 characters' },
            })}
          />
          {errors.fullName && (
            <p className="text-xs text-danger mt-1.5 flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size={12} />
              {errors.fullName.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            className={`input-field ${errors.email ? 'border-danger' : ''}`}
            placeholder="you@company.com"
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
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className={`input-field pr-10 ${errors.password ? 'border-danger' : ''}`}
              placeholder="Min. 8 characters"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-danger mt-1.5 flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size={12} />
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              className={`input-field pr-10 ${errors.confirmPassword ? 'border-danger' : ''}`}
              placeholder="Re-enter your password"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (val) => val === passwordValue || 'Passwords do not match',
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name={showConfirm ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-danger mt-1.5 flex items-center gap-1">
              <Icon name="ExclamationCircleIcon" size={12} />
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3 text-sm font-semibold"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Icon name="ArrowPathIcon" size={16} className="animate-spin" />
              Creating account...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Icon name="UserPlusIcon" size={16} />
              Create Account
            </span>
          )}
        </button>
      </form>

      {/* Switch to login */}
      <p className="text-sm text-muted-foreground text-center mt-6">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-primary hover:text-info font-medium transition-colors"
        >
          Sign in
        </button>
      </p>
    </div>
  );
}
