
'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logAuditAction, logAuditActionWithAlert } from '@/lib/auditLogger';
import { sendEmailVerificationEmail } from '@/lib/emailService';

const AuthContext = createContext<any>({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const supabase = createClient();
  const roleFetchedRef = useRef<string | null>(null);

  const fetchUserRole = async (userId: string) => {
    if (roleFetchedRef.current === userId && userRole) return;
    setRoleLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      clearTimeout(timeout);
      if (!error && data?.role) {
        setUserRole(data.role);
        roleFetchedRef.current = userId;
      } else {
        setUserRole('Operator');
        roleFetchedRef.current = userId;
      }
    } catch {
      setUserRole('Operator');
      roleFetchedRef.current = userId;
    } finally {
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setUserRole(null);
        roleFetchedRef.current = null;
        setLoading(false);
        return;
      }
      if (session) {
        setSession(session);
        setUser(session.user);
        fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata: { fullName?: string; avatarUrl?: string } = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata?.fullName || '',
          avatar_url: metadata?.avatarUrl || ''
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;

    if (data.user && !data.user.email_confirmed_at) {
      sendEmailVerificationEmail(
        email,
        `${window.location.origin}/auth/callback`
      ).catch(() => {});
    }

    logAuditActionWithAlert(
      {
        action: 'user_created',
        actorId: data.user?.id,
        actorEmail: email,
        actorRole: 'Operator',
        targetUserId: data.user?.id,
        targetEmail: email,
        details: { full_name: metadata?.fullName || '' },
      },
      []
    ).catch(() => {});

    return data;
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;

      setSession(data.session);
      setUser(data.user);
      setLoading(false);
      if (data.user) {
        fetchUserRole(data.user.id);
      }

      logAuditAction({
        action: 'login_success',
        actorId: data.user?.id,
        actorEmail: email,
        actorRole: '',
        targetUserId: data.user?.id,
        targetEmail: email,
        details: {},
      }).catch(() => {});

      return data;
    } catch (err: any) {
      logAuditActionWithAlert(
        {
          action: 'login_failed',
          actorId: undefined,
          actorEmail: email,
          actorRole: '',
          targetEmail: email,
          details: { reason: err?.message || 'Invalid credentials' },
        },
        []
      ).catch(() => {});
      throw err;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  };

  const isEmailVerified = () => {
    return user?.email_confirmed_at !== null;
  };

  const getUserProfile = async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    return data;
  };

  const value = {
    user,
    session,
    loading,
    userRole,
    roleLoading,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    isEmailVerified,
    getUserProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
