// apps/web/src/features/auth/components/AuthLayout.jsx
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AuthBackground from '@/shared/components/AuthBackground';
import navLogo from '@/assets/navLOGO.png';

/* ------------------------------------------------------------------ */
/*  Shared auth page chrome                                           */
/* ------------------------------------------------------------------ */

const S = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '32px 16px',
    position: 'relative', 
    overflowY: 'auto', 
    color: '#E7E9EE',
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
    WebkitFontSmoothing: 'antialiased',
    background:
      'radial-gradient(900px 520px at 15% -5%, rgba(245,158,11,.10), transparent 60%),' +
      'radial-gradient(800px 500px at 88% 8%, rgba(34,211,238,.06), transparent 60%),' +
      'linear-gradient(180deg, #07090D 0%, #0A0D14 45%, #07090D 100%)',
  },
  gridOverlay: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    backgroundImage:
      'linear-gradient(rgba(255,255,255,.028) 1px, transparent 1px),' +
      'linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px)',
    backgroundSize: '72px 72px',
    WebkitMaskImage:
      'radial-gradient(ellipse 80% 55% at 50% 0%, black 30%, transparent 78%)',
    maskImage:
      'radial-gradient(ellipse 80% 55% at 50% 0%, black 30%, transparent 78%)',
  },
  backLink: {
    position: 'absolute',
    top: 24,
    left: 24,
    zIndex: 20,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,.085)',
    background: 'rgba(15,18,25,.7)',
    backdropFilter: 'blur(10px)',
    color: '#8892A3',
    textDecoration: 'none',
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
    fontSize: 11.5,
    fontWeight: 600,
    letterSpacing: '.02em',
    transition: 'all .22s',
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: 440,
    background:
      'linear-gradient(180deg, rgba(18,21,28,.82), rgba(12,16,23,.72))',
    backdropFilter: 'blur(20px) saturate(140%)',
    WebkitBackdropFilter: 'blur(20px) saturate(140%)',
    border: '1px solid rgba(255,255,255,.085)',
    borderRadius: 20,
    padding: '40px 32px 32px',
    boxShadow:
      '0 40px 100px -40px rgba(0,0,0,.9),' +
      '0 0 0 1px rgba(245,158,11,.10),' +
      'inset 0 1px 0 rgba(255,255,255,.03)',
    zIndex: 10,
    animation: 'authIn .55s cubic-bezier(.2,.8,.25,1)',
    overflow: 'hidden',
  },
  cardStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    background:
      'linear-gradient(90deg, transparent, #F59E0B, #FDE68A, #F59E0B, transparent)',
    backgroundSize: '200% 100%',
    animation: 'authGrad 4s linear infinite',
  },
  head: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 26,
  },
  logoLink: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    lineHeight: 0,
  },
  logo: { height: 42, width: 'auto', display: 'block' },
  eyebrow: {
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '.18em',
    textTransform: 'uppercase',
    color: '#F59E0B',
    marginBottom: 8,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  },
  eyebrowRule: { width: 12, height: 1, background: 'rgba(245,158,11,.28)' },
  title: {
    fontSize: '1.65rem',
    fontWeight: 700,
    margin: '0 0 8px',
    letterSpacing: '-.02em',
    color: '#E7E9EE',
    lineHeight: 1.15,
  },
  sub: {
    color: '#8892A3',
    fontSize: 13,
    margin: 0,
    lineHeight: 1.6,
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
    letterSpacing: '.01em',
  },
  footer: {
    textAlign: 'center',
    marginTop: 22,
    fontSize: 13,
    color: '#8892A3',
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
  },
  footerLink: {
    color: '#F59E0B',
    textDecoration: 'none',
    fontWeight: 700,
    marginLeft: 4,
  },
};

const CSS = `
  @keyframes authIn {
    from { opacity: 0; transform: translateY(20px) scale(.98); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes authGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }

  /* ──────────────────────────────────────────────────────────────
     AuthBackground canvas — MUST be absolutely positioned.
     Without this, the canvas sizes itself to 100% of its parent,
     the parent grows to fit the canvas, and the loop repeats
     forever → infinite page height / infinite scroll.
     ────────────────────────────────────────────────────────────── */
  .auth-particles {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    opacity: .7;
  }

  .auth-form-input {
    width: 100%;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    padding: 13px 16px;
    color: #E7E9EE;
    font-size: 14px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    line-height: 20px;
    outline: none;
    box-sizing: border-box;
    transition: all .2s ease;
  }
  .auth-form-input.has-icon { padding-left: 44px; }
  .auth-form-input.has-trail { padding-right: 44px; }
  .auth-form-input::placeholder { color: #545E6E; }
  .auth-form-input:hover { border-color: rgba(255,255,255,.2); }
  .auth-form-input:focus {
    border-color: #F59E0B;
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
    background: rgba(10,13,19,.9);
  }
  .auth-form-input[data-invalid="true"] {
    border-color: rgba(239,68,68,.6);
    box-shadow: 0 0 0 3px rgba(239,68,68,.10);
  }

  /* Chrome autofill fix — kills the yellow flash */
  .auth-form-input:-webkit-autofill,
  .auth-form-input:-webkit-autofill:hover,
  .auth-form-input:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 1000px rgba(10,13,19,.95) inset;
    -webkit-text-fill-color: #E7E9EE;
    caret-color: #E7E9EE;
    transition: background-color 9999s ease-out 0s;
  }
`;

export default function AuthLayout({
  eyebrow = 'Welcome',
  title,
  subtitle,
  children,
  footer,
  footerLinkText,
  footerLinkTo,
  cardMaxWidth = 440,
  showBackLink = true,
  backTo = '/',
  backLabel = 'Back to home',
}) {
  return (
    <div style={S.wrapper}>
      <style>{CSS}</style>
      <div style={S.gridOverlay} aria-hidden />
      <AuthBackground accent="#F59E0B" />

      {showBackLink && (
        <Link
          to={backTo}
          style={S.backLink}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#F59E0B';
            e.currentTarget.style.borderColor = 'rgba(245,158,11,.28)';
            e.currentTarget.style.background = 'rgba(245,158,11,.06)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#8892A3';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,.085)';
            e.currentTarget.style.background = 'rgba(15,18,25,.7)';
          }}
        >
          <ArrowLeft size={14} />
          {backLabel}
        </Link>
      )}

      <div style={{ ...S.card, maxWidth: cardMaxWidth }}>
        <div style={S.cardStripe} aria-hidden />

        <div style={S.head}>
          <Link to="/" style={S.logoLink}>
            <img src={navLogo} alt="Mavrix" style={S.logo} />
          </Link>

          <div style={S.eyebrow}>
            <span style={S.eyebrowRule} />
            {eyebrow}
            <span style={S.eyebrowRule} />
          </div>

          <h1 style={S.title}>{title}</h1>
          {subtitle && <p style={S.sub}>{subtitle}</p>}
        </div>

        {children}

        {footer && (
          <div style={S.footer}>
            {footer}
            {footerLinkTo && (
              <Link
                to={footerLinkTo}
                style={S.footerLink}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#FDE68A')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#F59E0B')}
              >
                {footerLinkText}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}