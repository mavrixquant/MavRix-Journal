// apps/web/src/shared/ui/boot-loader.jsx
//
// Full-viewport splash rendered during the AuthProvider's initial session
// refresh. Replaces the previous `null` returns in guards.jsx and
// routes.jsx, which caused a blank-white frame on every cold boot.
//
// Visual language: same dark canvas + accent glow as the rest of the app,
// so the loader → content transition is a single fade, not a white flash.

import navLogo from '@/assets/navLOGO.png';

const CSS = `
  .boot-loader {
    position: fixed;
    inset: 0;
    z-index: 5000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 22px;
    background:
      radial-gradient(900px 520px at 15% -5%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 60%),
      linear-gradient(180deg, #07090D 0%, #0A0D14 55%, #07090D 100%);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    color: #E7E9EE;
    -webkit-font-smoothing: antialiased;
  }

  .boot-loader::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
    background-size: 72px 72px;
    -webkit-mask-image: radial-gradient(ellipse 70% 55% at 50% 50%, black 20%, transparent 75%);
    mask-image: radial-gradient(ellipse 70% 55% at 50% 50%, black 20%, transparent 75%);
  }

  .boot-logo {
    position: relative;
    height: 42px;
    width: auto;
    display: block;
    filter: drop-shadow(0 4px 20px color-mix(in srgb, var(--accent) 40%, transparent));
    animation: bootIn .55s cubic-bezier(.2,.8,.25,1);
  }

  .boot-bar {
    position: relative;
    width: 120px;
    height: 2px;
    border-radius: 99px;
    overflow: hidden;
    background: rgba(255,255,255,.06);
  }
  .boot-bar::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background-image: linear-gradient(90deg,
      transparent,
      var(--accent),
      var(--accent-2),
      var(--accent),
      transparent);
    background-size: 200% 100%;
    background-position: 0% 50%;
    animation: bootSlide 1.4s linear infinite;
  }

  .boot-label {
    position: relative;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .22em;
    text-transform: uppercase;
    color: #8892A3;
  }

  @keyframes bootIn {
    from { opacity: 0; transform: translateY(8px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes bootSlide {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }

  @media (prefers-reduced-motion: reduce) {
    .boot-logo { animation: none; }
    .boot-bar::after { animation-duration: 3s; }
  }
`;

export function BootLoader({ label = 'Loading' }) {
  return (
    <div className="boot-loader" role="status" aria-live="polite">
      <style>{CSS}</style>
      <img src={navLogo} alt="" className="boot-logo" />
      <div className="boot-bar" aria-hidden />
      <span className="boot-label">{label}</span>
    </div>
  );
}

export default BootLoader;