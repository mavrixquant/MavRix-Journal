// apps/web/src/shared/components/EmptyState.jsx
//
// Reusable "no data" empty state. Single visual language across the whole
// app — modelled on the Test Logs (`.jm-empty`) empty card.
//
// Usage — the happy path:
//
//   import EmptyState from '@/shared/components/EmptyState';
//   import { FaFolderOpen } from 'react-icons/fa';
//
//   <EmptyState
//     icon={FaFolderOpen}
//     title="No Backtest accounts"
//     description="Create a Backtest account first, then come back here."
//     actions={[
//       { label: 'Create account', icon: FaPlus, variant: 'primary', to: '/manage/accounts' },
//     ]}
//   />
//
// Variants:
//   variant="default"  — dashed card with gradient background (used when the
//                        empty state stands on its own, e.g. Test Logs)
//   variant="bare"     — no border/background (used when the empty state is
//                        ALREADY inside a card wrapper — accounts page,
//                        strategies page, admin cards, side panes, etc.)
//
// Sizes: 'sm' | 'md' (default) | 'lg'. Icon size, padding, and typography
// scale together.
//
// Actions:
//   Each entry supports one of:
//     { label, onClick, variant? }              — <button>
//     { label, to,      variant? }              — <Link>
//     { label, icon,    variant?, disabled? }   — icon prepended
//   variant ∈ { 'primary' | 'ghost' | 'danger' } — defaults to ghost.
//
// Everything is scoped under `.emptystate-*` so it never leaks.
// All colours resolve from the live accent vars written by SettingsProvider
// (--accent, --accent-2, --accent-soft, --accent-soft2).

import { Link } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/*  Scoped CSS                                                         */
/* ------------------------------------------------------------------ */

const CSS = `
  .emptystate {
    --line: rgba(255,255,255,.10);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    color: var(--ink-1);
    -webkit-font-smoothing: antialiased;
    width: 100%;
    box-sizing: border-box;
  }

  /* ---------- Sizes ---------- */
  .emptystate--sm { padding: 32px 20px; }
  .emptystate--md { padding: 60px 24px; }
  .emptystate--lg { padding: 80px 32px; }

  /* ---------- Variants ---------- */
  .emptystate--default {
    border: 1px dashed var(--line);
    border-radius: 14px;
    background:
      linear-gradient(180deg, rgba(255,255,255,.022), rgba(255,255,255,.006));
  }
  .emptystate--bare {
    /* Nothing — parent card already provides chrome. */
  }

  /* ---------- Icon tile ---------- */
  .emptystate-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 14%, transparent),
      color-mix(in srgb, var(--accent) 4%, transparent)
    );
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    box-shadow: 0 0 30px -10px color-mix(in srgb, var(--accent) 55%, transparent);
  }
  .emptystate--sm .emptystate-icon {
    width: 44px; height: 44px; border-radius: 13px; margin-bottom: 12px;
  }
  .emptystate--md .emptystate-icon {
    width: 56px; height: 56px; border-radius: 16px; margin-bottom: 16px;
  }
  .emptystate--lg .emptystate-icon {
    width: 72px; height: 72px; border-radius: 20px; margin-bottom: 20px;
  }

  /* ---------- Eyebrow ---------- */
  .emptystate-eyebrow {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: var(--accent);
    opacity: .85;
    margin-bottom: 8px;
  }

  /* ---------- Title ---------- */
  .emptystate-title {
    margin: 0 0 6px;
    font-weight: 700;
    color: var(--ink-1);
    letter-spacing: -.01em;
    line-height: 1.25;
  }
  .emptystate--sm .emptystate-title { font-size: 14px; }
  .emptystate--md .emptystate-title { font-size: 16px; }
  .emptystate--lg .emptystate-title { font-size: 18px; }

  /* ---------- Description ---------- */
  .emptystate-desc {
    margin: 0 auto;
    max-width: 420px;
    color: var(--ink-2);
    line-height: 1.65;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: .01em;
  }
  .emptystate--sm .emptystate-desc { font-size: 11.5px; max-width: 340px; }
  .emptystate--md .emptystate-desc { font-size: 12.5px; }
  .emptystate--lg .emptystate-desc { font-size: 13.5px; max-width: 480px; }

  /* ---------- Actions ---------- */
  .emptystate-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
    margin-top: 22px;
  }
  .emptystate--sm .emptystate-actions {
    margin-top: 14px;
    gap: 8px;
  }

  .emptystate-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 9px 18px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    text-decoration: none;
    white-space: nowrap;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
  }
  .emptystate--sm .emptystate-btn {
    padding: 7px 14px;
    font-size: 11px;
  }

  .emptystate-btn:hover:not(:disabled) {
    color: var(--ink-1);
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
    transform: translateY(-1px);
  }
  .emptystate-btn:active:not(:disabled) {
    transform: translateY(0) scale(.98);
  }
  .emptystate-btn:disabled {
    opacity: .5;
    cursor: not-allowed;
    transform: none;
  }
  .emptystate-btn svg { flex-shrink: 0; }

  .emptystate-btn--primary {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    border-color: transparent;
    color: #0D1117;
    font-weight: 700;
    box-shadow:
      0 10px 30px -8px color-mix(in srgb, var(--accent) 55%, transparent),
      inset 0 1px 0 rgba(255,255,255,.4);
  }
  .emptystate-btn--primary:hover:not(:disabled) {
    color: #0D1117;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    border-color: transparent;
    box-shadow:
      0 16px 42px -10px color-mix(in srgb, var(--accent) 70%, transparent),
      inset 0 1px 0 rgba(255,255,255,.5);
  }

  .emptystate-btn--ghost {
    background: transparent;
    border-color: rgba(255,255,255,.1);
  }

  .emptystate-btn--danger {
    color: #f87171;
    border-color: rgba(239,68,68,.3);
    background: rgba(239,68,68,.05);
  }
  .emptystate-btn--danger:hover:not(:disabled) {
    color: #fca5a5;
    background: rgba(239,68,68,.12);
    border-color: rgba(239,68,68,.55);
  }

  @media (prefers-reduced-motion: reduce) {
    .emptystate-btn { transition: none !important; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ICON_SIZE = { sm: 18, md: 22, lg: 28 };

export function EmptyState({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions = [],
  size = 'md',
  variant = 'default',
  className = '',
  ...rest
}) {
  const classes = [
    'emptystate',
    `emptystate--${size}`,
    `emptystate--${variant}`,
    className,
  ].filter(Boolean).join(' ');

  const iconSize = ICON_SIZE[size] || ICON_SIZE.md;

  return (
    <>
      <style>{CSS}</style>
      <div
        className={classes}
        role="status"
        data-testid="empty-state"
        {...rest}
      >
        {Icon && (
          <span className="emptystate-icon" aria-hidden>
            <Icon size={iconSize} />
          </span>
        )}

        {eyebrow && (
          <span className="emptystate-eyebrow">{eyebrow}</span>
        )}

        {title && (
          <h3 className="emptystate-title">{title}</h3>
        )}

        {description && (
          <p className="emptystate-desc">{description}</p>
        )}

        {actions.length > 0 && (
          <div className="emptystate-actions">
            {actions.map((action, i) => {
              const variantCls = action.variant
                ? ` emptystate-btn--${action.variant}`
                : '';
              const cls = `emptystate-btn${variantCls}`;

              const inner = (
                <>
                  {action.icon && <action.icon size={12} />}
                  <span>{action.label}</span>
                </>
              );

              if (action.to) {
                return (
                  <Link key={i} to={action.to} className={cls}>
                    {inner}
                  </Link>
                );
              }

              return (
                <button
                  key={i}
                  type="button"
                  className={cls}
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {inner}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default EmptyState;