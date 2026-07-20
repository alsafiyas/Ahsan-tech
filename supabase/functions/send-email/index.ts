import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

serve(async (req) => {
  // ✅ CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const { type, to, data } = await req.json();
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    let subject = "";
    let html = "";

    const baseStyle = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
    `;
    const headerStyle = `
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      padding: 32px 40px;
      border-radius: 12px 12px 0 0;
    `;
    const bodyStyle = `
      padding: 32px 40px;
      background: #f8fafc;
      border-left: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
    `;
    const footerStyle = `
      padding: 20px 40px;
      background: #f1f5f9;
      border-radius: 0 0 12px 12px;
      border: 1px solid #e2e8f0;
      border-top: none;
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
    `;
    const btnStyle = `
      display: inline-block;
      background: #1e40af;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      margin-top: 8px;
    `;
    const alertBoxStyle = (color: string) => `
      background: ${color};
      border-radius: 8px;
      padding: 16px 20px;
      margin: 16px 0;
    `;

    const appName = "CCTV ERP Pro";
    const siteUrl = "https://cctverppro3211.builtwithrocket.new";

    switch (type) {
      case "password_reset":
        subject = `${appName} — Password Reset Request`;
        html = `
          <div style="${baseStyle}">
            <div style="${headerStyle}">
              <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">🔐 Password Reset</h1>
              <p style="color:#bfdbfe;margin:6px 0 0;font-size:14px;">${appName}</p>
            </div>
            <div style="${bodyStyle}">
              <p style="color:#1e293b;font-size:15px;margin:0 0 16px;">Hi there,</p>
              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
                We received a request to reset the password for your account associated with <strong>${data.email}</strong>.
                Click the button below to set a new password.
              </p>
              <div style="text-align:center;margin:28px 0;">
                <a href="${data.resetLink}" style="${btnStyle}">Reset My Password</a>
              </div>
              <p style="color:#94a3b8;font-size:12px;margin:20px 0 0;">
                This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.
              </p>
            </div>
            <div style="${footerStyle}">${appName} · <a href="${siteUrl}" style="color:#94a3b8;">${siteUrl}</a></div>
          </div>`;
        break;

      case "email_verification":
        subject = `${appName} — Verify Your Email Address`;
        html = `
          <div style="${baseStyle}">
            <div style="${headerStyle}">
              <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">✉️ Verify Your Email</h1>
              <p style="color:#bfdbfe;margin:6px 0 0;font-size:14px;">${appName}</p>
            </div>
            <div style="${bodyStyle}">
              <p style="color:#1e293b;font-size:15px;margin:0 0 16px;">Welcome to ${appName}!</p>
              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
                Thanks for registering. Please verify your email address to activate your account and get started.
              </p>
              <div style="text-align:center;margin:28px 0;">
                <a href="${data.verificationLink}" style="${btnStyle}">Verify Email Address</a>
              </div>
              <p style="color:#94a3b8;font-size:12px;margin:20px 0 0;">
                If you didn't create an account, please ignore this email.
              </p>
            </div>
            <div style="${footerStyle}">${appName} · <a href="${siteUrl}" style="color:#94a3b8;">${siteUrl}</a></div>
          </div>`;
        break;

      case "account_change":
        subject = `${appName} — Account Updated`;
        html = `
          <div style="${baseStyle}">
            <div style="${headerStyle}">
              <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">👤 Account Updated</h1>
              <p style="color:#bfdbfe;margin:6px 0 0;font-size:14px;">${appName}</p>
            </div>
            <div style="${bodyStyle}">
              <p style="color:#1e293b;font-size:15px;margin:0 0 16px;">Hi ${data.userName || "there"},</p>
              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px;">
                Your account details have been updated successfully.
              </p>
              <div style="${alertBoxStyle("#f0f9ff")}">
                <p style="color:#0369a1;font-size:13px;margin:0;"><strong>Change:</strong> ${data.changeDescription}</p>
                <p style="color:#0369a1;font-size:12px;margin:6px 0 0;">🕐 ${data.timestamp}</p>
              </div>
              <p style="color:#94a3b8;font-size:12px;margin:20px 0 0;">
                If you didn't make this change, please contact your administrator immediately.
              </p>
            </div>
            <div style="${footerStyle}">${appName} · <a href="${siteUrl}" style="color:#94a3b8;">${siteUrl}</a></div>
          </div>`;
        break;

      case "user_invitation":
        subject = `You're invited to ${appName}`;
        html = `
          <div style="${baseStyle}">
            <div style="${headerStyle}">
              <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">🎉 You're Invited!</h1>
              <p style="color:#bfdbfe;margin:6px 0 0;font-size:14px;">${appName}</p>
            </div>
            <div style="${bodyStyle}">
              <p style="color:#1e293b;font-size:15px;margin:0 0 16px;">Hi ${data.inviteeName || "there"},</p>
              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px;">
                <strong>${data.inviterName || "An administrator"}</strong> has invited you to join <strong>${appName}</strong>
                as a <strong>${data.role || "team member"}</strong>.
              </p>
              <div style="text-align:center;margin:28px 0;">
                <a href="${data.inviteLink}" style="${btnStyle}">Accept Invitation</a>
              </div>
              <p style="color:#94a3b8;font-size:12px;margin:20px 0 0;">
                This invitation expires in 48 hours. If you weren't expecting this, you can safely ignore it.
              </p>
            </div>
            <div style="${footerStyle}">${appName} · <a href="${siteUrl}" style="color:#94a3b8;">${siteUrl}</a></div>
          </div>`;
        break;

      case "audit_alert":
        subject = `🚨 ${appName} — Critical Security Alert: ${data.eventLabel}`;
        const severityColor = data.severity === "high" ? "#fef2f2" : "#fffbeb";
        const severityBorder = data.severity === "high" ? "#fca5a5" : "#fcd34d";
        const severityText = data.severity === "high" ? "#dc2626" : "#d97706";
        html = `
          <div style="${baseStyle}">
            <div style="background:linear-gradient(135deg,#7f1d1d 0%,#dc2626 100%);padding:32px 40px;border-radius:12px 12px 0 0;">
              <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">🚨 Critical Security Alert</h1>
              <p style="color:#fca5a5;margin:6px 0 0;font-size:14px;">${appName} — Admin Notification</p>
            </div>
            <div style="${bodyStyle}">
              <p style="color:#1e293b;font-size:15px;margin:0 0 16px;">Dear Administrator,</p>
              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px;">
                A critical security event has been detected and requires your attention.
              </p>
              <div style="background:${severityColor};border:1px solid ${severityBorder};border-radius:8px;padding:20px;margin:16px 0;">
                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:13px;width:140px;"><strong>Event Type</strong></td>
                    <td style="padding:6px 0;color:${severityText};font-size:13px;font-weight:700;">${data.eventLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:13px;"><strong>Actor</strong></td>
                    <td style="padding:6px 0;color:#1e293b;font-size:13px;">${data.actorEmail || "Unknown"}</td>
                  </tr>
                  ${data.targetEmail ? `<tr>
                    <td style="padding:6px 0;color:#64748b;font-size:13px;"><strong>Target User</strong></td>
                    <td style="padding:6px 0;color:#1e293b;font-size:13px;">${data.targetEmail}</td>
                  </tr>` : ""}
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:13px;"><strong>Timestamp</strong></td>
                    <td style="padding:6px 0;color:#1e293b;font-size:13px;">🕐 ${data.timestamp}</td>
                  </tr>
                  ${data.summary ? `<tr>
                    <td style="padding:6px 0;color:#64748b;font-size:13px;vertical-align:top;"><strong>Summary</strong></td>
                    <td style="padding:6px 0;color:#1e293b;font-size:13px;">${data.summary}</td>
                  </tr>` : ""}
                </table>
              </div>
              <div style="text-align:center;margin:24px 0;">
                <a href="${siteUrl}/audit" style="${btnStyle}">View Audit Logs</a>
              </div>
              <p style="color:#94a3b8;font-size:12px;margin:20px 0 0;">
                This is an automated security notification from ${appName}. Please review the audit logs for full details.
              </p>
            </div>
            <div style="${footerStyle}">${appName} · <a href="${siteUrl}" style="color:#94a3b8;">${siteUrl}</a></div>
          </div>`;
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    const recipients = Array.isArray(to) ? to : [to];

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: recipients,
        subject,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to send email via Resend");
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
