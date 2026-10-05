// apps/web/src/features/admin/components/BanUserModal.jsx
import { useState, useEffect } from 'react';
import Portal from '@/shared/components/Portal';

export default function BanUserModal({ isOpen, user, onConfirm, onCancel, busy }) {
  const [reason, setReason] = useState('');

  useEffect(() => { if (isOpen) setReason(''); }, [isOpen, user?.id]);

  if (!isOpen || !user) return null;

  return (
    <Portal>
      <style>{CSS}</style>
      <div
        className="bum-overlay"
        onClick={(e) => { if (e.target === e.currentTarget && !busy) onCancel?.(); }}
      >
        <div className="bum-modal" role="alertdialog" aria-modal="true">
          <div className="bum-body">
            <h3 className="bum-title">Ban this user?</h3>
            <p className="bum-desc">
              <strong>{user.email}</strong> will be signed out immediately and blocked
              from logging in until unbanned.
            </p>

            <label className="bum-label">Reason (optional, shown to them)</label>
            <textarea
              className="bum-textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. violation of terms, abuse, spam…"
              rows={3}
              maxLength={500}
              disabled={busy}
            />
          </div>

          <div className="bum-foot">
            <button type="button" className="bum-btn bum-cancel" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              className="bum-btn bum-confirm"
              onClick={() => onConfirm(reason)}
              disabled={busy}
            >
              {busy ? 'Banning…' : 'Ban user'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

const CSS = `
  .bum-overlay {
    position: fixed; inset: 0;
    background: rgba(4,6,9,.78);
    backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    z-index: 3000; padding: 16px;
    animation: bumFade .16s ease;
  }
  .bum-modal {
    width: 100%; max-width: 480px;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid rgba(239,68,68,.35);
    border-radius: 16px;
    color: #E7E9EE;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    overflow: hidden;
    position: relative;
    animation: bumIn .24s cubic-bezier(.2,.8,.25,1);
    box-shadow: 0 40px 100px -30px rgba(0,0,0,.95), 0 0 0 1px rgba(239,68,68,.1);
  }
  .bum-modal::before {
    content: '';
    position: absolute; left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, #ef4444, #fca5a5, #ef4444, transparent);
    background-size: 200% 100%;
    animation: bumGrad 4s linear infinite;
  }
  .bum-body { padding: 24px 24px 16px; }
  .bum-title {
    margin: 0 0 8px;
    font-size: 17px; font-weight: 700;
    color: #FFFFFF;
    letter-spacing: -.01em;
  }
  .bum-desc {
    margin: 0 0 18px;
    font-size: 13px; line-height: 1.6;
    color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }
  .bum-desc strong { color: #fca5a5; font-weight: 700; }
  .bum-label {
    display: block; margin-bottom: 6px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700;
    letter-spacing: .14em; text-transform: uppercase;
    color: #545E6E;
  }
  .bum-textarea {
    width: 100%; padding: 10px 12px;
    background: rgba(10,13,19,.7);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
    resize: vertical;
    min-height: 70px;
    transition: all .18s;
  }
  .bum-textarea:focus {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239,68,68,.15);
  }
  .bum-foot {
    display: flex; justify-content: flex-end; gap: 10px;
    padding: 14px 24px;
    border-top: 1px solid rgba(255,255,255,.05);
    background: rgba(0,0,0,.15);
  }
  .bum-btn {
    padding: 9px 18px;
    border-radius: 10px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 700;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all .18s;
  }
  .bum-cancel {
    background: rgba(255,255,255,.03);
    border-color: rgba(255,255,255,.1);
    color: #8892A3;
  }
  .bum-cancel:hover:not(:disabled) { color: #E7E9EE; background: rgba(255,255,255,.06); }
  .bum-confirm {
    background: linear-gradient(135deg, #ef4444, #fca5a5);
    color: #1A0606;
    box-shadow: 0 10px 30px -8px rgba(239,68,68,.55);
  }
  .bum-confirm:hover:not(:disabled) { transform: translateY(-1px); }
  .bum-btn:disabled { opacity: .4; cursor: not-allowed; }

  @keyframes bumFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes bumIn {
    from { opacity: 0; transform: translateY(-10px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes bumGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
`;