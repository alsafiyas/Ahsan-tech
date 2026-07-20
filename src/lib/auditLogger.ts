import { createClient } from '@/lib/supabase/client';
import { sendAuditAlertEmail } from '@/lib/emailService';

export type AuditAction =
  | 'user_created' | 'role_changed' | 'password_reset' | 'login_success' | 'login_failed';

interface AuditLogPayload {
  action: AuditAction;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  targetUserId?: string;
  targetEmail?: string;
  details?: Record<string, unknown>;
}

/** Actions that trigger admin email alerts */
const CRITICAL_ACTIONS: AuditAction[] = ['login_failed', 'role_changed', 'user_created'];

const ACTION_LABELS: Record<AuditAction, string> = {
  user_created: 'New User Created',
  role_changed: 'User Role Changed',
  password_reset: 'Password Reset',
  login_success: 'Login Success',
  login_failed: 'Failed Login Attempt',
};

const ACTION_SEVERITY: Record<AuditAction, 'high' | 'medium'> = {
  login_failed: 'high',
  role_changed: 'high',
  user_created: 'medium',
  password_reset: 'medium',
  login_success: 'medium',
};

function buildSummary(payload: AuditLogPayload): string {
  switch (payload.action) {
    case 'login_failed':
      return `Failed login attempt for account "${payload.actorEmail || payload.targetEmail}". Reason: ${payload.details?.reason || 'Invalid credentials'}.`;
    case 'role_changed':
      return `Role changed for user "${payload.targetEmail}" from "${payload.details?.old_role || 'N/A'}" to "${payload.details?.new_role || 'N/A'}" by ${payload.actorEmail}.`;
    case 'user_created':
      return `New user account created for "${payload.targetEmail}" by ${payload.actorEmail || 'system'}. Name: ${payload.details?.full_name || 'N/A'}.`;
    default:
      return `Audit event: ${ACTION_LABELS[payload.action]} by ${payload.actorEmail || 'unknown'}.`;
  }
}

async function getAdminEmailsDirect(): Promise<string[]> {
  try {
    const supabase = createClient();
    // Get admin user IDs from user_profiles
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'Admin');

    if (error || !profiles?.length) return [];

    // Use the current session user's email if they are an admin (fallback)
    // Since client-side can't call admin.getUserById, we fetch emails via a join approach
    // We'll query auth.users indirectly via a view or use stored email in details
    // Best approach: store admin emails in a separate lookup or use the actor email
    // For now, return empty and rely on the edge function receiving admin emails from the caller
    return [];
  } catch {
    return [];
  }
}

export async function logAuditAction(payload: AuditLogPayload): Promise<void> {
  try {
    const supabase = createClient();

    await supabase.from('admin_audit_logs').insert({
      action: payload.action,
      actor_id: payload.actorId ?? null,
      actor_email: payload.actorEmail ?? '',
      actor_role: payload.actorRole ?? '',
      target_user_id: payload.targetUserId ?? null,
      target_email: payload.targetEmail ?? null,
      details: payload.details ?? {},
    });
  } catch {
    // Audit logging must never break the main flow
  }
}

/**
 * Log an audit action AND send admin email alert if it's a critical event.
 * adminEmails must be passed in since client-side cannot call admin APIs.
 */
export async function logAuditActionWithAlert(
  payload: AuditLogPayload,
  adminEmails: string[] = []
): Promise<void> {
  // Always log to DB
  await logAuditAction(payload);

  // Send email alert for critical actions
  if (CRITICAL_ACTIONS.includes(payload.action) && adminEmails.length > 0) {
    const summary = buildSummary(payload);
    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    // Fire-and-forget — never block main flow
    sendAuditAlertEmail(
      adminEmails,
      ACTION_LABELS[payload.action],
      payload.actorEmail || payload.targetEmail || 'Unknown',
      payload.targetEmail || null,
      summary,
      ACTION_SEVERITY[payload.action]
    ).catch(() => {});
  }
}
