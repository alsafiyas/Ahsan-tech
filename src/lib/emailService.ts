import { createClient } from '@/lib/supabase/client';

const EDGE_FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`;

interface EmailPayload {
  type: 'password_reset' | 'email_verification' | 'account_change' | 'user_invitation' | 'audit_alert';
  to: string | string[];
  data: Record<string, unknown>;
}

async function callEmailFunction(payload: EmailPayload): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[EmailService] Failed to send email:', err);
    }
  } catch (err) {
    // Email sending must never break the main flow
    console.error('[EmailService] Error calling edge function:', err);
  }
}

/** Send password reset email */
export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
  await callEmailFunction({
    type: 'password_reset',
    to: email,
    data: { email, resetLink },
  });
}

/** Send email verification email */
export async function sendEmailVerificationEmail(email: string, verificationLink: string): Promise<void> {
  await callEmailFunction({
    type: 'email_verification',
    to: email,
    data: { email, verificationLink },
  });
}

/** Send account change notification to the user */
export async function sendAccountChangeEmail(
  email: string,
  userName: string,
  changeDescription: string
): Promise<void> {
  await callEmailFunction({
    type: 'account_change',
    to: email,
    data: {
      email,
      userName,
      changeDescription,
      timestamp: new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    },
  });
}

/** Send user invitation email */
export async function sendUserInvitationEmail(
  inviteeEmail: string,
  inviteeName: string,
  inviterName: string,
  role: string,
  inviteLink: string
): Promise<void> {
  await callEmailFunction({
    type: 'user_invitation',
    to: inviteeEmail,
    data: { inviteeName, inviterName, role, inviteLink },
  });
}

/** Send critical audit alert to admin emails */
export async function sendAuditAlertEmail(
  adminEmails: string[],
  eventLabel: string,
  actorEmail: string,
  targetEmail: string | null,
  summary: string,
  severity: 'high' | 'medium' = 'high'
): Promise<void> {
  if (!adminEmails.length) return;
  await callEmailFunction({
    type: 'audit_alert',
    to: adminEmails,
    data: {
      eventLabel,
      actorEmail,
      targetEmail,
      summary,
      severity,
      timestamp: new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    },
  });
}

/** Fetch all admin emails from user_profiles */
export async function getAdminEmails(): Promise<string[]> {
  try {
    const supabase = createClient();
    // Query user_profiles that store email alongside role
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, role, email')
      .eq('role', 'Admin');

    if (error || !data?.length) return [];

    // Return emails stored directly in user_profiles (if available)
    const emails = data
      .map((p: any) => p.email as string | null)
      .filter((e): e is string => !!e && e.includes('@'));

    return emails;
  } catch {
    return [];
  }
}
