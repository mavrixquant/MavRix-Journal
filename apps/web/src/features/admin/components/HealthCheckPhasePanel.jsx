
import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import HealthCheckTestRow from './HealthCheckTestRow';

const CSS = `
  .hcp-panel {
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
    transition: border-color .22s ease;
  }
  .hcp-panel:hover { border-color: rgba(255,255,255,.14); }
  .hcp-panel.is-running {
    border-color: color-mix(in srgb, var(--accent) 42%, transparent);
    box-shadow:
      0 20px 50px -30px rgba(0,0,0,.9),
      0 0 30px -16px color-mix(in srgb, var(--accent) 60%, transparent);
  }

  .hcp-head {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 14px 18px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    outline: none;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    transition: background-color .15s ease;
  }
  .hcp-head:hover { background: rgba(255,255,255,.02); }
  .hcp-head:focus-visible { background: color-mix(in srgb, var(--accent) 5%, transparent); }

  .hcp-chevron {
    flex-shrink: 0;
    color: #545E6E;
    transition: transform .25s cubic-bezier(.2,.8,.25,1), color .2s ease;
  }
  .hcp-panel.is-expanded .hcp-chevron {
    transform: rotate(180deg);
    color: var(--accent);
  }

  .hcp-title {
    font-size: 13.5px;
    font-weight: 700;
    color: #E7E9EE;
    letter-spacing: -.005em;
  }
  .hcp-desc {
    flex: 1;
    min-width: 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    color: #8892A3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .hcp-badges {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .hcp-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 20px;
    padding: 0 8px;
    border-radius: 10px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .02em;
    border: 1px solid;
  }
  .hcp-badge.pass {
    color: #4ade80;
    background: rgba(34,197,94,.08);
    border-color: rgba(34,197,94,.28);
  }
  .hcp-badge.fail {
    color: #f87171;
    background: rgba(239,68,68,.08);
    border-color: rgba(239,68,68,.28);
  }
  .hcp-badge.skip {
    color: #8892A3;
    background: rgba(255,255,255,.03);
    border-color: rgba(255,255,255,.10);
  }
  .hcp-badge.running {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    border-color: color-mix(in srgb, var(--accent) 30%, transparent);
    animation: hcpPulse 1.4s ease-in-out infinite;
  }
  @keyframes hcpPulse {
    0%, 100% { opacity: 1; }
    50%      { opacity: .55; }
  }

  .hcp-total {
    flex-shrink: 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: #545E6E;
    letter-spacing: .02em;
    padding-left: 8px;
    border-left: 1px solid rgba(255,255,255,.06);
    margin-left: 2px;
    font-variant-numeric: tabular-nums;
  }

  .hcp-body {
    border-top: 1px solid rgba(255,255,255,.05);
    background: rgba(0,0,0,.14);
    animation: hcpFadeIn .22s ease;
  }
  @keyframes hcpFadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .hcp-chevron, .hcp-head { transition: none !important; }
    .hcp-body { animation: none !important; }
    .hcp-badge.running { animation: none !important; }
  }

  @media (max-width: 700px) {
    .hcp-desc { display: none; }
    .hcp-total { display: none; }
  }
`;

export default function HealthCheckPhasePanel({
  meta,
  tests,
  status = 'pending',
  defaultExpanded = false,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    if (defaultExpanded) setExpanded(true);
  }, [defaultExpanded]);

  const pass = tests.filter((t) => t.status === 'pass').length;
  const fail = tests.filter((t) => t.status === 'fail').length;
  const skip = tests.filter((t) => t.status === 'skip').length;
  const total = tests.length;

  const cls = [
    'hcp-panel',
    expanded ? 'is-expanded' : '',
    status === 'running' ? 'is-running' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <style>{CSS}</style>
      <div className={cls}>
        <button
          type="button"
          className="hcp-head"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${meta.label} phase`}
        >
          <ChevronDown size={13} className="hcp-chevron" />
          <span className="hcp-title">{meta.label}</span>
          <span className="hcp-desc">{meta.description}</span>

          <span className="hcp-badges">
            {status === 'running' && (
              <span className="hcp-badge running">LIVE</span>
            )}
            {pass > 0 && <span className="hcp-badge pass">{pass}</span>}
            {fail > 0 && <span className="hcp-badge fail">{fail}</span>}
            {skip > 0 && <span className="hcp-badge skip">{skip}</span>}
          </span>

          <span className="hcp-total">
            {total} {total === 1 ? 'test' : 'tests'}
          </span>
        </button>

        {expanded && (
          <div className="hcp-body">
            {tests.length === 0 && status === 'running' && (
              <div
                style={{
                  padding: '12px 16px',
                  color: '#8892A3',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                }}
              >
                Waiting for first test…
              </div>
            )}
            {tests.map((t) => (
              <HealthCheckTestRow key={t.id || t.name} test={t} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}