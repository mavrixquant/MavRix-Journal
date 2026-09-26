// apps/api/src/lib/mailer.js
// Real email delivery via Resend.
// Falls back to console logging when RESEND_API_KEY is not set
// (useful for local development without a Resend account).

import { Resend } from 'resend';

const CLIENT = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const FROM_EMAIL = process.env.MAIL_FROM || 'onboarding@resend.dev';
const FROM_NAME = process.env.MAIL_FROM_NAME || 'Mavrix Journal';

let resend = null;
function getResend() {
  if (resend) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  resend = new Resend(key);
  return resend;
}

async function send({ to, subject, html, text }) {
  const client = getResend();
  if (!client) {
    console.log('\n[mailer] ────────── (no RESEND_API_KEY — logging only) ──────────');
    console.log(`[mailer] To:      ${to}`);
    console.log(`[mailer] Subject: ${subject}`);
    console.log(`[mailer] Text:    ${text}`);
    console.log('[mailer] ────────────────────────────────────────────────────────\n');
    return { ok: true, logged: true };
  }

  const { data, error } = await client.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to,
    subject,
    html,
    text,
  });

  if (error) {
    console.error('[mailer] Resend error:', error);
    throw new Error(`Email delivery failed: ${error.message || 'unknown'}`);
  }
  console.log(`[mailer] Sent to ${to} (id: ${data?.id})`);
  return { ok: true, id: data?.id };
}

// ---------- Verification ----------

export async function sendVerificationEmail({ to, token }) {
  const link = `${CLIENT}/verify-email?token=${token}`;
  await send({
    to,
    subject: 'Verify your Mavrix Journal email',
    text: `Verify your email by pasting this token into the app: ${token}\n\nOr open: ${link}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0A0D13;color:#E7E9EE;border-radius:16px">
        <h2 style="color:#F59E0B;margin:0 0 16px">Verify your email</h2>
        <p style="line-height:1.6">Welcome to Mavrix Journal. Paste the token below into the verification page to activate your account.</p>
        <div style="background:#12161F;border:1px solid #2A3241;border-radius:12px;padding:16px;margin:20px 0;font-family:monospace;font-size:14px;word-break:break-all;color:#FDE68A">
          ${token}
        </div>
        <p style="line-height:1.6;color:#8892A3;font-size:13px">Or open this link: <a href="${link}" style="color:#F59E0B">${link}</a></p>
        <p style="line-height:1.6;color:#8892A3;font-size:13px;margin-top:24px">This token expires in 24 hours.</p>
      </div>
    `,
  });
}

// ---------- Password reset ----------

export async function sendPasswordResetEmail({ to, token }) {
  const link = `${CLIENT}/reset-password?token=${token}`;
  await send({
    to,
    subject: 'Reset your Mavrix Journal password',
    text: `Reset your password by opening: ${link}\n\nOr paste this token into the app: ${token}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0A0D13;color:#E7E9EE;border-radius:16px">
        <h2 style="color:#F59E0B;margin:0 0 16px">Reset your password</h2>
        <p style="line-height:1.6">We received a request to reset your Mavrix Journal password. Click the button below to choose a new one.</p>
        <p style="margin:28px 0;text-align:center">
          <a href="${link}" style="display:inline-block;background:#F59E0B;color:#0A0D13;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700">Reset Password</a>
        </p>
        <p style="line-height:1.6;color:#8892A3;font-size:13px">Or paste this token into the app:</p>
        <div style="background:#12161F;border:1px solid #2A3241;border-radius:12px;padding:16px;margin:12px 0;font-family:monospace;font-size:14px;word-break:break-all;color:#FDE68A">
          ${token}
        </div>
        <p style="line-height:1.6;color:#8892A3;font-size:13px;margin-top:24px">This link expires in 1 hour. If you did not request a reset, ignore this email.</p>
      </div>
    `,
  });
}