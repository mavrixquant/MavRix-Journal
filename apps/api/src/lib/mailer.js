// apps/api/src/lib/mailer.js
// Transactional email via Brevo.
//
// Behaviour:
//   - If BREVO_API_KEY is unset → logs a full block to the API console
//     and returns { ok: true, logged: true }. No throw. Local dev works
//     without a Brevo account.
//   - Otherwise → sends via Brevo's transactional email API.
//
// Env vars:
//   BREVO_API_KEY    — API key from Brevo (starts with xkeysib-)
//   MAIL_FROM        — verified sender email in Brevo
//   MAIL_FROM_NAME   — display name (default: "Mavrix Journal")
//   CLIENT_ORIGIN    — used to build verification / reset links

import { BrevoClient } from '@getbrevo/brevo';

const MAIL_FROM      = process.env.MAIL_FROM      || 'onboarding@brevo.dev';
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'Mavrix Journal';
const CLIENT_ORIGIN  = process.env.CLIENT_ORIGIN  || 'http://localhost:5173';

let _client = null;
function getClient() {
  if (!_client) {
    _client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
  }
  return _client;
}

/* ------------------------------------------------------------------ */
/*  Branded HTML template                                              */
/* ------------------------------------------------------------------ */

function renderEmail({ preheader, title, body, ctaText, ctaUrl, footerNote }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#07090D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader || ''}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07090D;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:linear-gradient(180deg,#12161F,#0C1017);border:1px solid rgba(255,255,255,.09);border-radius:18px;overflow:hidden;">

          <tr>
            <td style="height:2px;background:linear-gradient(90deg,transparent,#F59E0B,#FDE68A,#F59E0B,transparent);"></td>
          </tr>

          <tr>
            <td style="padding:32px 36px 8px;text-align:center;">
              <div style="font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#F59E0B;">
                ${MAIL_FROM_NAME}
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 36px 0;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#E7E9EE;letter-spacing:-.01em;line-height:1.3;">
                ${title}
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 36px 8px;color:#8892A3;font-size:14px;line-height:1.7;">
              ${body}
            </td>
          </tr>

          ${ctaText && ctaUrl ? `
          <tr>
            <td align="center" style="padding:24px 36px 8px;">
              <a href="${ctaUrl}"
                 style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#F59E0B,#FDE68A);color:#0D1117;font-weight:700;font-size:14px;text-decoration:none;border-radius:11px;letter-spacing:.01em;">
                ${ctaText}
              </a>
            </td>
          </tr>
          ` : ''}

          <tr>
            <td style="padding:28px 36px 32px;text-align:center;font-size:11.5px;color:#545E6E;line-height:1.6;font-family:'IBM Plex Mono',ui-monospace,monospace;">
              ${footerNote || ''}
            </td>
          </tr>

        </table>

        <div style="margin-top:20px;font-size:11px;color:#545E6E;font-family:'IBM Plex Mono',ui-monospace,monospace;letter-spacing:.02em;">
          Sent by ${MAIL_FROM_NAME}
        </div>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  Core send                                                          */
/* ------------------------------------------------------------------ */

async function send({ to, subject, html, text }) {
  if (!process.env.BREVO_API_KEY) {
    console.log('\n======================== [mailer:console-fallback] ========================');
    console.log(`To:      ${to}`);
    console.log(`From:    ${MAIL_FROM_NAME} <${MAIL_FROM}>`);
    console.log(`Subject: ${subject}`);
    console.log('--------------------------------------------------------------------------');
    console.log(text || html);
    console.log('==========================================================================\n');
    return { ok: true, logged: true };
  }

  const client = getClient();

  const result = await client.transactionalEmails.sendTransacEmail({
    subject,
    htmlContent: html,
    textContent: text,
    sender: { name: MAIL_FROM_NAME, email: MAIL_FROM },
    to: [{ email: to }],
  });

  return { ok: true, id: result?.messageId };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export async function sendVerificationEmail({ to, token }) {
  const verifyUrl = `${CLIENT_ORIGIN}/verify-email?token=${encodeURIComponent(token)}`;

  const subject = `Verify your ${MAIL_FROM_NAME} email`;

  const body = `
    <p style="margin:0 0 14px;">Thanks for signing up. Confirm your email address to unlock the dashboard.</p>
    <p style="margin:0 0 14px;">This link expires in <strong style="color:#E7E9EE;">24 hours</strong>.</p>
    <p style="margin:0;font-size:12.5px;">If the button doesn't work, paste this token into the verification page:</p>
    <p style="margin:8px 0 0;padding:10px 14px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.28);border-radius:8px;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12px;color:#F59E0B;word-break:break-all;">${token}</p>
  `;

  const text = [
    `Verify your ${MAIL_FROM_NAME} email`,
    '',
    `Open this link to verify: ${verifyUrl}`,
    '',
    `Or paste this token into the verification page:`,
    token,
    '',
    'This link expires in 24 hours.',
  ].join('\n');

  return send({
    to,
    subject,
    html: renderEmail({
      preheader: 'Confirm your email to get started',
      title: 'Verify your email',
      body,
      ctaText: 'Verify Email',
      ctaUrl: verifyUrl,
      footerNote: 'If you didn\'t sign up, you can ignore this email.',
    }),
    text,
  });
}

export async function sendPasswordResetEmail({ to, token }) {
  const resetUrl = `${CLIENT_ORIGIN}/reset-password?token=${encodeURIComponent(token)}`;

  const subject = `Reset your ${MAIL_FROM_NAME} password`;

  const body = `
    <p style="margin:0 0 14px;">We received a request to reset your password.</p>
    <p style="margin:0 0 14px;">This link expires in <strong style="color:#E7E9EE;">1 hour</strong>. It can only be used once.</p>
    <p style="margin:0;font-size:12.5px;">If the button doesn't work, paste this token into the reset page:</p>
    <p style="margin:8px 0 0;padding:10px 14px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.28);border-radius:8px;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12px;color:#F59E0B;word-break:break-all;">${token}</p>
  `;

  const text = [
    `Reset your ${MAIL_FROM_NAME} password`,
    '',
    `Open this link to reset: ${resetUrl}`,
    '',
    `Or paste this token into the reset page:`,
    token,
    '',
    'This link expires in 1 hour and can only be used once.',
  ].join('\n');

  return send({
    to,
    subject,
    html: renderEmail({
      preheader: 'Reset your password',
      title: 'Reset your password',
      body,
      ctaText: 'Reset Password',
      ctaUrl: resetUrl,
      footerNote: 'If you didn\'t request this, you can ignore this email — your password won\'t change.',
    }),
    text,
  });
}

/* ------------------------------------------------------------------ */
/*  Admin broadcast                                                    */
/* ------------------------------------------------------------------ */

const LEVEL_META = {
  info:     { label: 'Notice',   accent: '#F59E0B', ring: 'rgba(245,158,11,.28)' },
  warning:  { label: 'Warning',  accent: '#F59E0B', ring: 'rgba(245,158,11,.28)' },
  critical: { label: 'Important',accent: '#ef4444', ring: 'rgba(239,68,68,.30)' },
};

export async function sendBroadcastEmail({ to, message, level = 'info' }) {
  const meta = LEVEL_META[level] || LEVEL_META.info;
  const subject = `${MAIL_FROM_NAME} — ${meta.label}`;

  const body = `
    <p style="margin:0 0 14px;font-size:14.5px;">${String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
  `;

  const text = [subject, '', message].join('\n');

  return send({
    to,
    subject,
    html: renderEmail({
      preheader: meta.label,
      title: meta.label,
      body,
      ctaText: 'Open Dashboard',
      ctaUrl: `${CLIENT_ORIGIN}/journal`,
      footerNote: 'You received this because you have an account on Mavrix Journal.',
    }),
    text,
  });
}