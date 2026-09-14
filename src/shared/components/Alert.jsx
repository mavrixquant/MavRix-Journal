// src/components/common/Alert.jsx
import Portal from './Portal';
import { FaCheckCircle, FaExclamationTriangle, FaQuestionCircle, FaTimes } from 'react-icons/fa';

/* ------------------------------------------------------------------ */
/*  Scoped CSS — matches JournalMain / UploadModal / DashboardHeader   */
/*  Vars live on .alert-overlay so they cascade into the portaled tree */
/* ------------------------------------------------------------------ */
const ALERT_CSS = `
  .alert-overlay {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    --win: #22c55e;
    --win-2: #86efac;
    --win-soft: rgba(34,197,94,.10);
    --win-soft2: rgba(34,197,94,.28);
    --loss: #ef4444;
    --loss-2: #fca5a5;
    --loss-soft: rgba(239,68,68,.10);
    --loss-soft2: rgba(239,68,68,.28);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;

    position: fixed;
    inset: 0;
    background: rgba(4,6,9,.72);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 16px;
    animation: alertFade .18s ease;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  }

  .alert-modal {
    width: 100%;
    max-width: 420px;
    max-height: calc(100vh - 32px);
    margin: auto;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid var(--line);
    border-radius: 18px;
    box-shadow:
      0 40px 100px -30px rgba(0,0,0,.95),
      0 0 0 1px var(--alert-halo, var(--accent-soft));
    color: var(--ink-1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    animation: alertModalIn .28s cubic-bezier(.2,.8,.25,1);
  }

  /* Top gradient strip — same language as other modals */
  .alert-modal::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--alert-accent, var(--accent)), var(--alert-accent-2, var(--accent-2)), var(--alert-accent, var(--accent)), transparent);
    background-size: 200% 100%;
    animation: alertGrad 4s linear infinite;
    pointer-events: none;
  }

  /* Type variants */
  .alert-modal.is-confirm {
    --alert-accent: var(--accent);
    --alert-accent-2: var(--accent-2);
    --alert-halo: var(--accent-soft);
    --alert-tint: rgba(245,158,11,.10);
    --alert-tint-border: rgba(245,158,11,.30);
    --alert-tint-text: #F59E0B;
  }
  .alert-modal.is-success {
    --alert-accent: var(--win);
    --alert-accent-2: var(--win-2);
    --alert-halo: var(--win-soft);
    --alert-tint: rgba(34,197,94,.10);
    --alert-tint-border: rgba(34,197,94,.30);
    --alert-tint-text: #4ade80;
  }
  .alert-modal.is-error {
    --alert-accent: var(--loss);
    --alert-accent-2: var(--loss-2);
    --alert-halo: var(--loss-soft);
    --alert-tint: rgba(239,68,68,.10);
    --alert-tint-border: rgba(239,68,68,.30);
    --alert-tint-text: #f87171;
  }

  /* ---------- Head ---------- */
  .alert-head {
    padding: 20px 22px 8px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    flex-shrink: 0;
  }
  .alert-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    background: var(--alert-tint, rgba(245,158,11,.10));
    border: 1px solid var(--alert-tint-border, rgba(245,158,11,.30));
    color: var(--alert-tint-text, #F59E0B);
    box-shadow: 0 0 24px -10px var(--alert-halo, var(--accent-soft));
  }

  .alert-headtext {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-top: 2px;
  }
  .alert-title {
    margin: 0;
    font-size: 15.5px;
    font-weight: 700;
    letter-spacing: -.01em;
    color: var(--ink-1);
    line-height: 1.25;
  }
  .alert-eyebrow {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    letter-spacing: .14em;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--alert-tint-text, #F59E0B);
    opacity: .85;
  }

  .alert-close {
    flex-shrink: 0;
    background: none;
    border: none;
    color: var(--ink-2);
    font-size: 13px;
    cursor: pointer;
    padding: 6px;
    border-radius: 8px;
    transition: all .2s;
    margin-top: -2px;
  }
  .alert-close:hover {
    color: var(--alert-tint-text, var(--accent));
    background: var(--alert-tint, rgba(245,158,11,.08));
  }

  /* ---------- Body ---------- */
  .alert-body {
    padding: 4px 22px 22px;
    overflow-y: auto;
    flex: 1 1 auto;
    min-height: 0;
  }
  .alert-message {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.65;
    color: rgba(255,255,255,.72);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: .005em;
    word-break: break-word;
  }

  /* ---------- Foot ---------- */
  .alert-actions {
    padding: 14px 22px;
    border-top: 1px solid var(--line-soft);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    background: rgba(0,0,0,.15);
    flex-shrink: 0;
  }

  .alert-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 9px 18px;
    border-radius: 10px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
    border: 1px solid transparent;
    min-width: 84px;
  }

  .alert-btn-cancel {
    background: rgba(255,255,255,.03);
    border-color: rgba(255,255,255,.1);
    color: var(--ink-2);
  }
  .alert-btn-cancel:hover {
    color: var(--ink-1);
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
    transform: translateY(-1px);
  }
  .alert-btn-cancel:active { transform: translateY(0) scale(.98); }

  .alert-btn-confirm {
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, var(--alert-accent, #F59E0B), var(--alert-accent-2, #FDE68A));
    color: #0D1117;
    border: none;
    box-shadow:
      0 10px 30px -8px var(--alert-halo, rgba(245,158,11,.55)),
      inset 0 1px 0 rgba(255,255,255,.4);
    transition: transform .25s cubic-bezier(.175,.885,.32,1.275), box-shadow .3s;
  }
  .alert-btn-confirm::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(105deg, transparent 32%, rgba(255,255,255,.3) 50%, transparent 68%);
    animation: alertShine 4.2s ease-in-out infinite;
  }
  .alert-btn-confirm:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 42px -10px var(--alert-halo, rgba(245,158,11,.7)), inset 0 1px 0 rgba(255,255,255,.5);
  }
  .alert-btn-confirm:active { transform: translateY(0) scale(.98); }

  /* ---------- Animations ---------- */
  @keyframes alertFade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes alertModalIn {
    from { opacity: 0; transform: translateY(-12px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes alertGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @keyframes alertShine {
    0%,100% { transform: translateX(-130%) skewX(-18deg); }
    55%     { transform: translateX(230%) skewX(-18deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .alert-modal::before,
    .alert-btn-confirm::after { animation: none !important; }
    .alert-btn, .alert-btn-confirm, .alert-close { transition: none !important; }
  }
`;

export default function Alert({
  isOpen,
  title,
  message,
  type = 'confirm', // 'confirm', 'success', 'error'
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  showCancel = true,
}) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  // Map type → icon, eyebrow label, modal modifier class
  const TYPE = {
    confirm: { icon: <FaQuestionCircle />, label: 'Confirm', cls: 'is-confirm' },
    success: { icon: <FaCheckCircle />,    label: 'Success', cls: 'is-success' },
    error:   { icon: <FaExclamationTriangle />, label: 'Error', cls: 'is-error' },
  };
  const t = TYPE[type] || TYPE.confirm;

  return (
    <Portal>
      <style>{ALERT_CSS}</style>
      <div
        className="alert-overlay"
        onClick={(e) => {
          // Backdrop click only cancels non-confirm alerts
          if (e.target === e.currentTarget && type !== 'confirm') {
            if (onCancel) onCancel();
          }
        }}
      >
        <div className={`alert-modal ${t.cls}`} role="alertdialog" aria-modal="true">
          <div className="alert-head">
            <div className="alert-icon">{t.icon}</div>
            <div className="alert-headtext">
              <span className="alert-eyebrow">{t.label}</span>
              {title && <h3 className="alert-title">{title}</h3>}
            </div>
            {(showCancel || type !== 'confirm') && onCancel && (
              <button
                type="button"
                className="alert-close"
                onClick={handleCancel}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            )}
          </div>

          <div className="alert-body">
            <p className="alert-message">{message}</p>
          </div>

          <div className="alert-actions">
            {showCancel && (
              <button type="button" className="alert-btn alert-btn-cancel" onClick={handleCancel}>
                {cancelText}
              </button>
            )}
            <button type="button" className="alert-btn alert-btn-confirm" onClick={handleConfirm}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}