'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Icon from '@/components/ui/AppIcon';
import { createClient } from '@/lib/supabase/client';
import { logAuditAction } from '@/lib/auditLogger';
import { sendAccountChangeEmail } from '@/lib/emailService';
import LoginBrandPanel from '@/app/login-screen/components/LoginBrandPanel';

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<ResetPasswordFormData>({
    defaultValues: { password: '', confirmPassword: '' },
  });

  const passwordValue = watch('password');

  useEffect(() => {
    // Supabase sets the session from the URL hash automatically via onAuthStateChange
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: data.password });
      if (error) throw error;
      // Log password reset via email link
      const { data: { user } } = await supabase.auth.getUser();
      await logAuditAction({
        action: 'password_reset',
        actorId: user?.id,
        actorEmail: user?.email || '',
        actorRole: '',
        targetUserId: user?.id,
        targetEmail: user?.email || '',
        details: { initiated_by: 'email_reset_link' },
      });
      // Send account change confirmation email
      if (user?.email) {
        sendAccountChangeEmail(
          user.email,
          user.user_metadata?.full_name || 'User',
          'Your password was reset via the password reset link.'
        ).catch(() => {});
      }
      setDone(true);
      toast.success('Password updated successfully!');
      setTimeout(() => router.push('/login-screen'), 2500);
    } catch (err: any) {
      const msg = err?.message || 'Failed to update password. Please try again.';
      setError('password', { message: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--background)' }}>
      <LoginBrandPanel />
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        {done ? (
          <div className="w-full max-w-md animate-fade-in text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(34,197,94,0.12)' }}
            >
              <Icon name="CheckCircleIcon" size={36} className="text-success" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Password updated!</h2>
            <p className="text-sm text-muted-foreground">
              Your password has been changed. Redirecting you to sign in…
            </p>
          </div>
        ) : !isReady ? (
          <div className="w-full max-w-md animate-fade-in text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(239,68,68,0.1)' }}
            >
              <Icon name="ExclamationTriangleIcon" size={36} className="text-danger" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Invalid or expired link</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <button
              type="button"
              onClick={() => router.push('/login-screen')}
              className="btn-primary w-full py-3 text-sm font-semibold"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <div className="w-full max-w-md animate-fade-in">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-1.5">Set new password</h2>
              <p className="text-sm text-muted-foreground">
                Choose a strong password for your account.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  New Password
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
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className={`input-field pr-10 ${errors.confirmPassword ? 'border-danger' : ''}`}
                    placeholder="Re-enter your new password"
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

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3 text-sm font-semibold"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Icon name="ArrowPathIcon" size={16} className="animate-spin" />
                    Updating password...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Icon name="LockClosedIcon" size={16} />
                    Update Password
                  </span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
