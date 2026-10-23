import { Check, Loader2 } from 'lucide-react';

const STEP_ORDER = ['symbols', 'data', 'render', 'finalize'];

const STEPS = [
  { id: 'symbols',  label: 'Loading symbols',    hint: 'Fetching market catalog' },
  { id: 'data',     label: 'Fetching candles',   hint: 'Downloading historical data' },
  { id: 'render',   label: 'Rendering chart',    hint: 'Building candlestick series' },
  { id: 'finalize', label: 'Finalizing',         hint: 'Warming up the canvas' },
];

const PROGRESS = {
  symbols: 18,
  data: 55,
  render: 88,
  finalize: 100,
};

const CSS = `
  .clo-overlay {
    position: fixed;
    inset: 0;
    z-index: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(4, 6, 9, 0.55);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    animation: cloFade .2s ease;
    pointer-events: all;
  }
  .clo-overlay.is-finalizing {
    animation: cloFadeOut .35s ease forwards;
    pointer-events: none;
  }

  .clo-card {
    width: 100%;
    max-width: 380px;
    padding: 34px 32px 28px;
    border-radius: 20px;
    background:
      radial-gradient(340px 200px at 50% 0%,
        color-mix(in srgb, var(--accent) 14%, transparent), transparent 72%),
      linear-gradient(180deg, #12161F, #0B0E14);
    border: 1px solid rgba(255,255,255,.10);
    box-shadow:
      0 40px 100px -30px rgba(0,0,0,.95),
      0 0 0 1px color-mix(in srgb, var(--accent) 12%, transparent),
      inset 0 1px 0 rgba(255,255,255,.04);
    color: #E7E9EE;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    position: relative;
    overflow: hidden;
    animation: cloPop .34s cubic-bezier(.2,.8,.25,1);
  }
  .clo-card::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: cloGrad 3.6s linear infinite;
    pointer-events: none;
  }

  .clo-candles {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 5px;
    height: 54px;
    margin: 0 auto 18px;
    width: fit-content;
  }
  .clo-candle {
    width: 9px;
    border-radius: 2px;
    background: var(--accent);
    box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 55%, transparent);
    transform-origin: bottom center;
    animation: cloCandle 1.4s cubic-bezier(.2,.8,.25,1) infinite;
  }
  .clo-candle:nth-child(1) { height: 22px; animation-delay: 0ms; }
  .clo-candle:nth-child(2) { height: 40px; animation-delay: 140ms; background: #35C4A1; box-shadow: 0 0 14px rgba(53,196,161,.55); }
  .clo-candle:nth-child(3) { height: 30px; animation-delay: 280ms; }
  .clo-candle:nth-child(4) { height: 46px; animation-delay: 420ms; background: #35C4A1; box-shadow: 0 0 14px rgba(53,196,161,.55); }
  .clo-candle:nth-child(5) { height: 36px; animation-delay: 560ms; }

  .clo-title {
    text-align: center;
    margin-bottom: 4px;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -.01em;
    color: #F5F6F8;
  }
  .clo-sub {
    text-align: center;
    margin: 0 0 24px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    color: #8892A3;
    letter-spacing: .02em;
  }
  .clo-sub b {
    color: var(--accent);
    font-weight: 700;
  }

  .clo-steps {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 14px 14px 12px;
    border-radius: 12px;
    background: rgba(255,255,255,.02);
    border: 1px solid rgba(255,255,255,.05);
    margin-bottom: 20px;
  }
  .clo-step {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 7px 4px;
    border-radius: 6px;
    transition: opacity .3s ease, color .3s ease;
    opacity: .45;
  }
  .clo-step.is-active { opacity: 1; }
  .clo-step.is-done   { opacity: .9; }

  .clo-step-icon {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,.16);
    color: #545E6E;
    background: rgba(0,0,0,.25);
    transition: all .3s cubic-bezier(.2,.8,.25,1);
  }
  .clo-step.is-active .clo-step-icon {
    border-color: var(--accent);
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    box-shadow: 0 0 14px -4px color-mix(in srgb, var(--accent) 60%, transparent);
  }
  .clo-step.is-done .clo-step-icon {
    border-color: #22c55e;
    color: #22c55e;
    background: rgba(34,197,94,.10);
  }

  .clo-spin { animation: cloSpin 0.9s linear infinite; }

  .clo-step-body {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    flex: 1;
  }
  .clo-step-label {
    font-size: 12.5px;
    font-weight: 600;
    color: #E7E9EE;
    letter-spacing: -.005em;
    transition: color .3s ease;
  }
  .clo-step.is-active .clo-step-label { color: #FFFFFF; }
  .clo-step.is-done   .clo-step-label { color: #B8BFC9; }

  .clo-step-hint {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    color: #545E6E;
    letter-spacing: .02em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .clo-step.is-active .clo-step-hint { color: #8892A3; }

  .clo-progress {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .clo-progress-track {
    flex: 1;
    height: 4px;
    border-radius: 99px;
    background: rgba(255,255,255,.06);
    overflow: hidden;
    position: relative;
  }
  .clo-progress-fill {
    height: 100%;
    border-radius: 99px;
    background: linear-gradient(90deg, var(--accent), var(--accent-2));
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 60%, transparent);
    transition: width .45s cubic-bezier(.2,.8,.25,1);
    position: relative;
    overflow: hidden;
  }
  .clo-progress-fill::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent);
    animation: cloShimmer 1.4s linear infinite;
  }
  .clo-progress-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 700;
    color: var(--accent);
    min-width: 42px;
    text-align: right;
    letter-spacing: .02em;
    font-variant-numeric: tabular-nums;
  }

  @keyframes cloFade       { from { opacity: 0; } to { opacity: 1; } }
  @keyframes cloFadeOut    { from { opacity: 1; } to { opacity: 0; } }
  @keyframes cloPop        { from { opacity: 0; transform: translateY(8px) scale(.97); } to { opacity: 1; transform: none; } }
  @keyframes cloGrad       { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
  @keyframes cloCandle {
    0%, 100% { transform: scaleY(1); opacity: .9; }
    50%      { transform: scaleY(.55); opacity: .45; }
  }
  @keyframes cloSpin       { to { transform: rotate(360deg); } }
  @keyframes cloShimmer    {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(200%); }
  }

  @media (prefers-reduced-motion: reduce) {
    .clo-card::before,
    .clo-candle,
    .clo-progress-fill::after { animation: none !important; }
    .clo-spin { animation-duration: 2s; }
    .clo-overlay, .clo-card { animation: none !important; }
  }
`;

export default function ChartLoadingOverlay({ phase = 'symbols', symbol, interval }) {
  if (phase === 'done') return null;

  const currentIndex = STEP_ORDER.indexOf(phase);
  const progress = PROGRESS[phase] ?? 0;
  const isFinalizing = phase === 'finalize';

  const symbolLabel = symbol || '—';
  const intervalLabel = interval ? interval.toUpperCase() : '—';
  const dataStepLabel =
    phase === 'data' || phase === 'render' || phase === 'finalize'
      ? `Fetching ${symbolLabel} candles`
      : 'Fetching candles';

  return (
    <>
      <style>{CSS}</style>
      <div className={`clo-overlay${isFinalizing ? ' is-finalizing' : ''}`} role="status" aria-live="polite">
        <div className="clo-card">
          <div className="clo-candles" aria-hidden>
            <span className="clo-candle" />
            <span className="clo-candle" />
            <span className="clo-candle" />
            <span className="clo-candle" />
            <span className="clo-candle" />
          </div>

          <h2 className="clo-title">Preparing your chart</h2>
          <p className="clo-sub">
            <b>{symbolLabel}</b> · {intervalLabel}
          </p>

          <div className="clo-steps">
            {STEPS.map((step, idx) => {
              const isDone = idx < currentIndex || phase === 'finalize';
              const isActive = idx === currentIndex && phase !== 'finalize';
              const label = step.id === 'data' ? dataStepLabel : step.label;

              return (
                <div
                  key={step.id}
                  className={`clo-step${isDone ? ' is-done' : ''}${isActive ? ' is-active' : ''}`}
                >
                  <span className="clo-step-icon">
                    {isDone && <Check size={11} strokeWidth={3} />}
                    {isActive && <Loader2 size={11} className="clo-spin" />}
                    {!isDone && !isActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', opacity: .45 }} />}
                  </span>
                  <span className="clo-step-body">
                    <span className="clo-step-label">{label}</span>
                    <span className="clo-step-hint">{step.hint}</span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="clo-progress">
            <div className="clo-progress-track">
              <div className="clo-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="clo-progress-label">{progress}%</span>
          </div>
        </div>
      </div>
    </>
  );
}
