// apps/web/src/features/admin/pages/AdminBroadcastPage.jsx
//
// Compose + send a message to all users via SSE. Optional email blast.

import { useState } from 'react';
import { Send, Radio, Mail, AlertTriangle, Info, Siren } from 'lucide-react';
import { toast } from 'sonner';

import { useAdminBroadcast } from '../api';

const CSS = `
  .abp-root { display: flex; flex-direction: column; gap: 18px; }

  .abp-card {
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
  }
  .abp-card-head {
    padding: 14px 18px 12px;
    border-bottom: 1px solid rgba(255,255,255,.05);
    display: flex; align-items: center; gap: 10px;
  }
  .abp-card-title {
    font-size: 13px; font-weight: 700; color: #E7E9EE;
  }
  .abp-card-body { padding: 18px; display: flex; flex-direction: column; gap: 16px; }

  .abp-levels {
    display: flex; gap: 8px; flex-wrap: wrap;
  }
  .abp-level {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.025);
    color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 600;
    cursor: pointer;
    transition: all .18s;
  }
  .abp-level:hover:not(:disabled) {
    color: #E7E9EE;
    border-color: rgba(255,255,255,.22);
  }
  .abp-level:disabled { opacity: .5; cursor: not-allowed; }
  .abp-level.is-active { font-weight: 700; }
  .abp-level.is-active[data-level="info"] {
    color: #F59E0B;
    border-color: rgba(245,158,11,.4);
    background: rgba(245,158,11,.08);
  }
  .abp-level.is-active[data-level="warning"] {
    color: #F59E0B;
    border-color: rgba(245,158,11,.55);
    background: rgba(245,158,11,.12);
    box-shadow: 0 0 24px -8px rgba(245,158,11,.55);
  }
  .abp-level.is-active[data-level="critical"] {
    color: #f87171;
    border-color: rgba(239,68,68,.55);
    background: rgba(239,68,68,.10);
    box-shadow: 0 0 24px -8px rgba(239,68,68,.55);
  }

  .abp-textarea {
    width: 100%;
    min-height: 130px;
    padding: 12px 14px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: #E7E9EE;
    font-family: 'Inter', sans-serif;
    font-size: 13.5px;
    line-height: 1.6;
    outline: none;
    box-sizing: border-box;
    resize: vertical;
    transition: all .18s;
  }
  .abp-textarea:focus {
    border-color: #F59E0B;
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }
  .abp-textarea:disabled { opacity: .55; cursor: not-allowed; }
  .abp-charcount {
    display: flex; justify-content: flex-end;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: #545E6E;
  }

  .abp-email-toggle {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 16px;
    border-radius: 10px;
    background: rgba(255,255,255,.02);
    border: 1px solid rgba(255,255,255,.06);
  }
  .abp-email-toggle input[type="checkbox"] {
    width: 16px; height: 16px;
    accent-color: #F59E0B;
    cursor: pointer;
    flex-shrink: 0;
  }
  .abp-email-text {
    display: flex; flex-direction: column; gap: 2px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }
  .abp-email-label {
    font-size: 11.5px; font-weight: 700; color: #E7E9EE;
  }
  .abp-email-desc {
    font-size: 10.5px; color: #8892A3; line-height: 1.55;
  }

  .abp-warn {
    display: flex; gap: 10px;
    padding: 12px 14px;
    border-radius: 10px;
    background: rgba(239,68,68,.06);
    border: 1px solid rgba(239,68,68,.28);
    color: #fca5a5;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; line-height: 1.6;
  }
  .abp-warn-icon {
    flex-shrink: 0;
    margin-top: 1px;
    color: #f87171;
  }

  .abp-foot {
    display: flex; justify-content: flex-end; gap: 10px;
  }
  .abp-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 18px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 600;
    cursor: pointer;
    transition: all .18s;
  }
  .abp-btn:hover:not(:disabled) {
    color: #E7E9EE;
    border-color: rgba(255,255,255,.22);
    background: rgba(255,255,255,.06);
  }
  .abp-btn:disabled { opacity: .4; cursor: not-allowed; }
  .abp-btn-primary {
    background: linear-gradient(135deg, #F59E0B, #FDE68A);
    color: #0D1117; border: none; font-weight: 700;
    box-shadow: 0 10px 30px -8px rgba(245,158,11,.55);
  }
  .abp-btn-primary:hover:not(:disabled) { transform: translateY(-1px); }

  /* Preview card mimics what a user would see */
  .abp-preview {
    padding: 14px 16px;
    border-radius: 10px;
    border: 1px solid;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.55;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .abp-preview.info {
    background: rgba(245,158,11,.06);
    border-color: rgba(245,158,11,.3);
    color: #F59E0B;
  }
  .abp-preview.warning {
    background: rgba(245,158,11,.10);
    border-color: rgba(245,158,11,.45);
    color: #FDE68A;
  }
  .abp-preview.critical {
    background: rgba(239,68,68,.08);
    border-color: rgba(239,68,68,.42);
    color: #fca5a5;
  }
  .abp-preview-label {
    font-size: 9.5px; font-weight: 700;
    letter-spacing: .14em; text-transform: uppercase;
    color: #545E6E;
    margin-bottom: 8px;
  }
`;

const LEVELS = [
  { id: 'info',     label: 'Info',     icon: Info },
  { id: 'warning',  label: 'Warning',  icon: AlertTriangle },
  { id: 'critical', label: 'Critical', icon: Siren },
];

const MAX_CHARS = 2000;

export default function AdminBroadcastPage() {
  const [message, setMessage] = useState('');
  const [level, setLevel] = useState('info');
  const [sendEmail, setSendEmail] = useState(false);

  const broadcast = useAdminBroadcast();

  const trimmed = message.trim();
  const canSend = trimmed.length > 0 && !broadcast.isPending;

  const handleSend = async () => {
    if (!canSend) return;
    const confirmMsg = sendEmail
      ? `Send "${level}" broadcast via SSE AND email every verified user?`
      : `Send "${level}" broadcast to all connected clients?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const r = await broadcast.mutateAsync({
        message: trimmed,
        level,
        sendEmail,
      });
      const parts = [`SSE: ${r.sseSent}`];
      if (sendEmail) parts.push(`Emails: ${r.emailsSent} sent, ${r.emailsFailed} failed`);
      toast.success(parts.join(' · '));
      setMessage('');
    } catch (err) {
      toast.error(err?.message || 'Broadcast failed');
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="abp-root">
        <div className="admin-ph">
          <div className="admin-ph-left">
            <span className="admin-ph-eyebrow">Operations</span>
            <h1 className="admin-ph-title">Broadcast</h1>
            <p className="admin-ph-sub">
              Push a message to every connected client · optional email blast
            </p>
          </div>
        </div>

        <div className="abp-card">
          <div className="abp-card-head">
            <Radio size={14} style={{ color: '#F59E0B' }} />
            <span className="abp-card-title">Compose</span>
          </div>
          <div className="abp-card-body">
            {/* ---------- Level ---------- */}
            <div>
              <div className="abp-preview-label">Severity</div>
              <div className="abp-levels">
                {LEVELS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    data-level={id}
                    className={`abp-level${level === id ? ' is-active' : ''}`}
                    onClick={() => setLevel(id)}
                    disabled={broadcast.isPending}
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ---------- Message ---------- */}
            <div>
              <div className="abp-preview-label" style={{ marginBottom: 8 }}>Message</div>
              <textarea
                className="abp-textarea"
                placeholder="e.g. Scheduled maintenance in 15 minutes. Expect brief downtime."
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
                disabled={broadcast.isPending}
                maxLength={MAX_CHARS}
              />
              <div className="abp-charcount">
                {message.length} / {MAX_CHARS}
              </div>
            </div>

            {/* ---------- Email toggle ---------- */}
            <div className="abp-email-toggle">
              <input
                type="checkbox"
                id="abp-email"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                disabled={broadcast.isPending}
              />
              <label htmlFor="abp-email" className="abp-email-text" style={{ cursor: 'pointer' }}>
                <span className="abp-email-label">
                  <Mail size={11} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Also send as email
                </span>
                <span className="abp-email-desc">
                  Sends the message to every verified, non-banned user via
                  Brevo. Slower — this can take a few seconds per user.
                </span>
              </label>
            </div>

            {/* ---------- Preview ---------- */}
            {trimmed && (
              <div>
                <div className="abp-preview-label">User preview</div>
                <div className={`abp-preview ${level}`}>
                  {trimmed}
                </div>
              </div>
            )}

            {/* ---------- Warning ---------- */}
            {sendEmail && trimmed && (
              <div className="abp-warn">
                <AlertTriangle size={14} className="abp-warn-icon" />
                <span>
                  Email will be sent to <strong>every verified user</strong>.
                  This cannot be undone. Double-check the message before sending.
                </span>
              </div>
            )}

            <div className="abp-foot">
              <button
                type="button"
                className="abp-btn"
                onClick={() => { setMessage(''); setSendEmail(false); setLevel('info'); }}
                disabled={broadcast.isPending || (!trimmed && !sendEmail)}
              >
                Clear
              </button>
              <button
                type="button"
                className="abp-btn abp-btn-primary"
                onClick={handleSend}
                disabled={!canSend}
              >
                <Send size={12} />
                {broadcast.isPending ? 'Sending…' : 'Send broadcast'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}