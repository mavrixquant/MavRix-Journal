// ============================================================================
// ChartLoadingOverlay — only shown when the chart is genuinely empty.
// If a fill is happening in the background, we show an inline progress bar
// instead of this blocking overlay.
// ============================================================================
import { Loader2, Check } from 'lucide-react';

const STEP_ORDER = ['symbols', 'data', 'trades', 'render', 'finalize'];
const STEPS = [
  { id: 'symbols',  label: 'Loading symbols', hint: 'Fetching market catalog' },
  { id: 'data',     label: 'Fetching candles', hint: 'Downloading historical data' },
  { id: 'trades',   label: 'Loading trades', hint: 'Fetching journal trades' },
  { id: 'render',   label: 'Rendering chart', hint: 'Building candlestick series' },
  { id: 'finalize', label: 'Finalizing', hint: 'Warming up the canvas' },
];
const PROGRESS = { symbols: 12, data: 38, trades: 65, render: 88, finalize: 100 };

const CSS = `
  .clo-overlay { position: fixed; inset: 0; z-index: 500; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(4, 6, 9, 0.55); backdrop-filter: blur(6px); animation: cloFade .2s ease; pointer-events: all; }
  .clo-overlay.is-finalizing { animation: cloFadeOut .35s ease forwards; pointer-events: none; }
  .clo-card { width: 100%; max-width: 380px; padding: 34px 32px 28px; border-radius: 20px; background: radial-gradient(340px 200px at 50% 0%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 72%), linear-gradient(180deg, #12161F, #0B0E14); border: 1px solid rgba(255,255,255,.10); box-shadow: 0 40px 100px -30px rgba(0,0,0,.95); color: #E7E9EE; position: relative; overflow: hidden; }
  .clo-candles { display: flex; align-items: flex-end; justify-content: center; gap: 5px; height: 54px; margin: 0 auto 18px; }
  .clo-candle { width: 9px; border-radius: 2px; background: var(--accent); animation: cloCandle 1.4s cubic-bezier(.2,.8,.25,1) infinite; }
  .clo-candle:nth-child(1) { height: 22px; animation-delay: 0ms; }
  .clo-candle:nth-child(2) { height: 40px; animation-delay: 140ms; background: #35C4A1; }
  .clo-candle:nth-child(3) { height: 30px; animation-delay: 280ms; }
  .clo-candle:nth-child(4) { height: 46px; animation-delay: 420ms; background: #35C4A1; }
  .clo-candle:nth-child(5) { height: 36px; animation-delay: 560ms; }
  .clo-title { text-align: center; margin-bottom: 4px; font-size: 15px; font-weight: 700; color: #F5F6F8; }
  .clo-sub { text-align: center; margin: 0 0 24px; font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; color: #8892A3; }
  .clo-steps { display: flex; flex-direction: column; gap: 2px; padding: 14px 14px 12px; border-radius: 12px; background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.05); margin-bottom: 20px; }
  .clo-step { display: flex; align-items: center; gap: 12px; padding: 7px 4px; opacity: .45; }
  .clo-step.is-active { opacity: 1; }
  .clo-step.is-done { opacity: .9; }
  .clo-step-icon { width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,.16); display: inline-flex; align-items: center; justify-content: center; color: #545E6E; }
  .clo-step.is-active .clo-step-icon { border-color: var(--accent); color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); }
  .clo-step.is-done .clo-step-icon { border-color: #22c55e; color: #22c55e; background: rgba(34,197,94,.10); }
  .clo-spin { animation: cloSpin 0.9s linear infinite; }
  .clo-step-label { font-size: 12.5px; font-weight: 600; color: #E7E9EE; }
  .clo-step-hint { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #545E6E; }
  .clo-progress { display: flex; align-items: center; gap: 12px; }
  .clo-progress-track { flex: 1; height: 4px; border-radius: 99px; background: rgba(255,255,255,.06); overflow: hidden; }
  .clo-progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-2)); transition: width .45s cubic-bezier(.2,.8,.25,1); }
  .clo-progress-label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 700; color: var(--accent); min-width: 42px; text-align: right; }
  @keyframes cloCandle { 0%, 100% { transform: scaleY(1); opacity: .9; } 50% { transform: scaleY(.55); opacity: .45; } }
  @keyframes cloSpin { to { transform: rotate(360deg); } }
`;

export default function ChartLoadingOverlay({ phase = 'symbols', symbol, interval }) {
  if (phase === 'done') return null;
  const currentIndex = STEP_ORDER.indexOf(phase);
  const progress = PROGRESS[phase] ?? 0;
  const isFinalizing = phase === 'finalize';

  return (
    <>
      <style>{CSS}</style>
      <div className={`clo-overlay${isFinalizing ? ' is-finalizing' : ''}`} role="status" aria-live="polite">
        <div className="clo-card">
          <div className="clo-candles" aria-hidden>
            <span className="clo-candle" /><span className="clo-candle" /><span className="clo-candle" /><span className="clo-candle" /><span className="clo-candle" />
          </div>
          <h2 className="clo-title">Preparing your chart</h2>
          <p className="clo-sub"><b>{symbol || '—'}</b> · {interval ? interval.toUpperCase() : '—'}</p>
          <div className="clo-steps">
            {STEPS.map((step, idx) => {
              const isDone = idx < currentIndex || phase === 'finalize';
              const isActive = idx === currentIndex && phase !== 'finalize';
              return (
                <div key={step.id} className={`clo-step${isDone ? ' is-done' : ''}${isActive ? ' is-active' : ''}`}>
                  <span className="clo-step-icon">
                    {isDone && <Check size={11} strokeWidth={3} />}
                    {isActive && <Loader2 size={11} className="clo-spin" />}
                  </span>
                  <span className="clo-step-body">
                    <span className="clo-step-label">{step.label}</span>
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