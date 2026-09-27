// apps/web/src/features/auth/components/AuthButton.jsx
const S = {
  base: {
    position: 'relative',
    width: '100%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 11,
    border: 'none',
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
    fontSize: 13.5,
    fontWeight: 700,
    letterSpacing: '.02em',
    cursor: 'pointer',
    overflow: 'hidden',
    transition:
      'transform .25s cubic-bezier(.175,.885,.32,1.275), box-shadow .3s',
  },
  primary: {
    background: 'linear-gradient(135deg, #F59E0B, #FDE68A)',
    color: '#0D1117',
    boxShadow:
      '0 10px 30px -8px rgba(245,158,11,.55), inset 0 1px 0 rgba(255,255,255,.4)',
  },
  ghost: {
    background: 'rgba(255,255,255,.035)',
    border: '1px solid rgba(255,255,255,.12)',
    color: '#E7E9EE',
    backdropFilter: 'blur(8px)',
  },
  danger: {
    background: 'transparent',
    border: '1px solid transparent',
    color: '#545E6E',
    fontSize: 11.5,
    padding: 10,
  },
  spinner: {
    width: 16,
    height: 16,
    border: '2px solid rgba(10,13,19,.25)',
    borderTopColor: '#0A0D13',
    borderRadius: '50%',
    animation: 'authSpin .8s linear infinite',
  },
  spinnerGhost: {
    width: 16,
    height: 16,
    border: '2px solid rgba(255,255,255,.2)',
    borderTopColor: '#E7E9EE',
    borderRadius: '50%',
    animation: 'authSpin .8s linear infinite',
  },
};

const CSS = `
  @keyframes authSpin { to { transform: rotate(360deg); } }
  @keyframes authShine {
    0%,100% { transform: translateX(-130%) skewX(-18deg); }
    55%     { transform: translateX(230%) skewX(-18deg); }
  }
  .auth-btn-primary::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(105deg, transparent 32%, rgba(255,255,255,.3) 50%, transparent 68%);
    animation: authShine 4.2s ease-in-out infinite;
  }
  .auth-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 16px 42px -10px rgba(245,158,11,.7), inset 0 1px 0 rgba(255,255,255,.5);
  }
  .auth-btn-primary:disabled { opacity: .65; cursor: not-allowed; }
  .auth-btn-primary:disabled::after { display: none; }

  .auth-btn-ghost:hover:not(:disabled) {
    background: rgba(255,255,255,.07);
    border-color: rgba(255,255,255,.24);
    transform: translateY(-1px);
  }
  .auth-btn-ghost:disabled { opacity: .55; cursor: not-allowed; }

  .auth-btn-danger:hover:not(:disabled) {
    color: #f87171;
    background: rgba(239,68,68,.06);
    border-color: rgba(239,68,68,.28);
  }
`;

export default function AuthButton({
  variant = 'primary',
  loading = false,
  children,
  className = '',
  ...rest
}) {
  const variantStyle =
    variant === 'ghost' ? S.ghost : variant === 'danger' ? S.danger : S.primary;

  return (
    <>
      <style>{CSS}</style>
      <button
        {...rest}
        disabled={loading || rest.disabled}
        style={{ ...S.base, ...variantStyle }}
        className={`auth-btn auth-btn-${variant} ${className}`}
      >
        {loading ? (
          <span style={variant === 'ghost' ? S.spinnerGhost : S.spinner} />
        ) : (
          children
        )}
      </button>
    </>
  );
}