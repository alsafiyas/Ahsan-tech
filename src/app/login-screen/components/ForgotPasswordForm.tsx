'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import Icon from '@/components/ui/AppIcon';
import { createClient } from '@/lib/supabase/client';

interface ForgotPasswordFormData {
  email: string;
}

interface ForgotPasswordFormProps {
  onSwitchToLogin: () => void;
}

export default function ForgotPasswordForm({ onSwitchToLogin }: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ForgotPasswordFormData>({
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${siteUrl}/auth/reset-password`,
      });
      if (error) throw error;
      setSentEmail(data.email);
      setEmailSent(true);
      toast.success('Password reset email sent!');
    } catch (err: any) {
      const msg = err?.message || 'Failed to send reset email. Please try again.';
      setError('email', { message: msg });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="w-full max-w-md animate-fade-in text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(59,130,246,0.12)' }}
        >
          <Icon name="EnvelopeIcon" size={36} className="text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Check your inbox</h2>
        <p className="text-sm text-muted-foreground mb-2">
          We sent a password reset link to:
        </p>
        <p className="text-sm font-medium text-foreground mb-6">{sentEmail}</p>
        <p className="text-xs text-muted-foreground mb-6">
          Click the link in the email to set a new password. The link expires in 1 hour.
          If you don&apos;t see it, check your spam folder.
        </p>
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
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <Icon name="ArrowLeftIcon" size={14} />
          Back to Sign In
        </button>
        <h2 className="text-2xl font-semibold text-foreground mb-1.5">Reset your password</h2>
        <p className="text-sm text-muted-foreground">
          Enter your email address and we&apos;ll send you a secure link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Email Address
          </label>
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

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3 text-sm font-semibold"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Icon name="ArrowPathIcon" size={16} className="animate-spin" />
              Sending reset link...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Icon name="EnvelopeIcon" size={16} />
              Send Reset Link
            </span>
          )}
        </button>
      </form>
    </div>
  );
}
