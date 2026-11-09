import { Lock } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { BootLoader } from '@/shared/ui/boot-loader';

const CSS = `
  .plan-lock-root {
    min-height: calc(100vh - 200px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 16px;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  }
  .plan-lock-card {
    position: relative;
    max-width: 520px;
    width: 100%;
    padding: 56px 40px 48px;
    border-radius: 26px;
    background:
      radial-gradient(400px 220px at 50% 0%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%),
      linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.012));
    border: 1px solid rgba(255,255,255,.1);
    box-shadow: 0 40px 90px -50px color-mix(in srgb, var(--accent) 50%, transparent);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    overflow: hidden;
  }
  .plan-lock-card::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: planLockGrad 4s linear infinite;
  }
  .plan-lock-icon {
    width: 72px;
    height: 72px;
    border-radius: 20px;
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, transparent), color-mix(in srgb, var(--accent) 5%, transparent));
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 22px;
    box-shadow: 0 0 40px -8px color-mix(in srgb, var(--accent) 50%, transparent);
  }
  .plan-lock-eyebrow {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 10px;
    opacity: .9;
  }
  .plan-lock-title {
    margin: 0 0 10px;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -.02em;
    color: #E7E9EE;
    line-height: 1.2;
  }
  .plan-lock-desc {
    margin: 0 0 6px;
    font-size: 13.5px;
    line-height: 1.7;
    color: rgba(255,255,255,.62);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    max-width: 380px;
  }
  .plan-lock-cta {
    margin-top: 22px;
    padding: 10px 22px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: .02em;
  }
  @keyframes planLockGrad {
    0% { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .plan-lock-card::before { animation: none !important; }
  }
`;

export function isProUser(user) {
  if (!user) return false;
  return (
    user.plan === 'pro' ||
    user.role === 'admin' ||
    user.role === 'superadmin'
  );
}

export default function PlanGate({ children, feature = 'This feature' }) {
  const { user, loading } = useAuth();

  if (loading) return <BootLoader label="Checking access" />;

  if (isProUser(user)) return children;

  return (
    <>
      <style>{CSS}</style>
      <div className="plan-lock-root">
        <div className="plan-lock-card">
          <div className="plan-lock-icon">
            <Lock size={32} />
          </div>
          <span className="plan-lock-eyebrow">PRO feature</span>
          <h2 className="plan-lock-title">{feature} requires PRO</h2>
          <p className="plan-lock-desc">
            This feature is only available on the PRO plan.
            Upgrade to unlock full access.
          </p>
          <div className="plan-lock-cta">Contact Admin For PRO access</div>
        </div>
      </div>
    </>
  );
}