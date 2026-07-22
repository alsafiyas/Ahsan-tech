
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
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

  const fetchUserRole = async (userId: string) => {
    setRoleLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      if (!error && data) {
        setUserRole(data.role);
      } else {
        setUserRole(null);
      }
    } catch {
      setUserRole(null);
    } finally {
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION on subscription with the current session
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setUserRole(null);
      } else if (session) {
        setSession(session);
        setUser(session.user);
        fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Email/Password Sign Up
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

    // Send email verification transactional email (Supabase also sends one, this is supplemental)
    if (data.user && !data.user.email_confirmed_at) {
      sendEmailVerificationEmail(
        email,
        `${window.location.origin}/auth/callback`
      ).catch(() => {});
    }

    // Fire-and-forget audit log
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

  // Email/Password Sign In
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;

      // Immediately update local state so navigation can proceed
      setSession(data.session);
      setUser(data.user);
      setLoading(false);
      if (data.user) {
        fetchUserRole(data.user.id);
      }

      // Fire-and-forget audit log — must not block navigation
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
      // Fire-and-forget — must not block error propagation
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

  // Sign Out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // Get Current User
  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  };

  // Check if Email is Verified
  const isEmailVerified = () => {
    return user?.email_confirmed_at !== null;
  };

  // Get User Profile from Database
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
