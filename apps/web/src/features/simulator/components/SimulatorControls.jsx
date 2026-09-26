// src/components/simulator/SimulatorControls.jsx
import { FaPlay, FaRedo, FaDownload, FaDice } from 'react-icons/fa';

const PRESETS = {
  quick:    { runs: 1000,  label: 'Quick' },
  standard: { runs: 10000, label: 'Standard' },
  deep:     { runs: 50000, label: 'Deep' },
  extreme:  { runs: 100000, label: 'Extreme' },
};

const BLOCK_SIZES = [3, 5, 10, 20, 30];

const METHODS = [
  { id: 'permutation', label: 'Permutation', hint: 'Sequence risk' },
  { id: 'bootstrap',   label: 'Bootstrap',   hint: 'Sample uncertainty' },
  { id: 'block',       label: 'Block',       hint: 'Preserves streaks' },
];

const CTRL_CSS = `
  .sim-ctrl {
    --accent: #F59E0B; --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE; --ink-2: #8892A3; --ink-3: #545E6E;
    position: relative;
    display: flex; flex-direction: column; gap: 12px;
    padding: 14px 18px 16px; border-radius: 16px;
    background: linear-gradient(180deg, rgba(15,18,25,.72), rgba(15,18,25,.55));
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    border: 1px solid var(--line);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.03);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    color: var(--ink-1); overflow: hidden;
  }
  .sim-ctrl::before {
    content: ''; position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: simCtrlGrad 4s linear infinite; pointer-events: none;
  }
  .sim-ctrl-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .sim-ctrl-group { display: inline-flex; align-items: center; gap: 8px; }
  .sim-ctrl-label {
    display: inline-flex; align-items: center; gap: 8px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; font-weight: 700;
    letter-spacing: .14em; text-transform: uppercase;
    color: var(--ink-3); white-space: nowrap;
  }
  .sim-ctrl-input, .sim-ctrl-select {
    padding: 7px 11px; background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1); border-radius: 9px;
    color: var(--ink-1); font-size: 12.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-weight: 600; outline: none; transition: all .2s;
    box-sizing: border-box;
  }
  .sim-ctrl-input:hover, .sim-ctrl-select:hover { border-color: rgba(255,255,255,.2); }
  .sim-ctrl-input:focus, .sim-ctrl-select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }
  .sim-ctrl-input.is-invalid {
    border-color: rgba(239,68,68,.7);
    box-shadow: 0 0 0 3px rgba(239,68,68,.10);
  }
  .sim-ctrl-input:disabled, .sim-ctrl-select:disabled { opacity: .55; cursor: not-allowed; }
  .sim-ctrl-input { width: 88px; text-align: center; }
  .sim-ctrl-input.is-wide { width: 100px; text-align: right; }
  .sim-ctrl-input.is-seed { width: 110px; text-align: left; }
  .sim-ctrl-select {
    appearance: none; -webkit-appearance: none;
    padding-right: 28px; cursor: pointer;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 20 20' fill='%23545E6E'><path d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'/></svg>");
    background-repeat: no-repeat; background-position: right 10px center;
  }
  .sim-ctrl-seg {
    display: inline-flex; gap: 3px; padding: 3px;
    background: rgba(0,0,0,.32);
    border: 1px solid var(--line-soft); border-radius: 10px;
  }
  .sim-ctrl-seg-btn {
    display: inline-flex; flex-direction: column; align-items: center;
    padding: 6px 14px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; font-weight: 700; letter-spacing: .02em;
    background: transparent; color: var(--ink-2);
    border: none; border-radius: 7px; cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1); white-space: nowrap;
  }
  .sim-ctrl-seg-btn .hint {
    font-size: 9px; font-weight: 500;
    letter-spacing: .08em; text-transform: uppercase;
    color: var(--ink-3); margin-top: 2px;
  }
  .sim-ctrl-seg-btn:hover:not(:disabled):not(.is-active) {
    color: var(--ink-1); background: rgba(255,255,255,.05);
  }
  .sim-ctrl-seg-btn.is-active {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    box-shadow: 0 6px 16px -8px rgba(245,158,11,.6), inset 0 1px 0 rgba(255,255,255,.4);
  }
  .sim-ctrl-seg-btn.is-active .hint { color: rgba(13,17,23,.65); }
  .sim-ctrl-seg-btn:disabled { opacity: .5; cursor: not-allowed; }
  .sim-ctrl-icon-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; padding: 0; border-radius: 9px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03); color: var(--ink-2);
    cursor: pointer; transition: all .22s cubic-bezier(.2,.8,.25,1);
  }
  .sim-ctrl-icon-btn:hover:not(:disabled) {
    color: var(--accent); background: rgba(245,158,11,.08);
    border-color: var(--accent-soft2); transform: translateY(-1px);
  }
  .sim-ctrl-icon-btn:active:not(:disabled) { transform: translateY(0) scale(.94); }
  .sim-ctrl-icon-btn:disabled { opacity: .4; cursor: not-allowed; }
  .sim-ctrl-spacer { flex: 1; min-width: 8px; }
  .sim-ctrl-btn {
    display: inline-flex; align-items: center; justify-content: center;
    gap: 7px; padding: 8px 14px; border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03); color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 600; letter-spacing: .02em;
    cursor: pointer; transition: all .22s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
  }
  .sim-ctrl-btn:hover:not(:disabled) {
    color: var(--ink-1); background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2); transform: translateY(-1px);
  }
  .sim-ctrl-btn:active:not(:disabled) { transform: translateY(0) scale(.98); }
  .sim-ctrl-btn:disabled { opacity: .4; cursor: not-allowed; }
  .sim-ctrl-btn-primary {
    position: relative; display: inline-flex; align-items: center; justify-content: center;
    gap: 7px; padding: 10px 20px; border-radius: 10px;
    border: none; overflow: hidden;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px; font-weight: 700; letter-spacing: .02em;
    cursor: pointer;
    box-shadow: 0 10px 30px -8px rgba(245,158,11,.55), inset 0 1px 0 rgba(255,255,255,.4);
    transition: transform .25s cubic-bezier(.175,.885,.32,1.275), box-shadow .3s;
    white-space: nowrap;
  }
  .sim-ctrl-btn-primary::after {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(105deg, transparent 32%, rgba(255,255,255,.3) 50%, transparent 68%);
    animation: simCtrlShine 4.2s ease-in-out infinite;
  }
  .sim-ctrl-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 16px 42px -10px rgba(245,158,11,.7), inset 0 1px 0 rgba(255,255,255,.5);
  }
  .sim-ctrl-btn-primary:active:not(:disabled) { transform: translateY(0) scale(.98); }
  .sim-ctrl-btn-primary:disabled {
    background: linear-gradient(135deg, rgba(245,158,11,.35), rgba(253,230,138,.3));
    color: rgba(10,13,19,.6); box-shadow: none; cursor: not-allowed;
  }
  .sim-ctrl-btn-primary:disabled::after { display: none; }

  .sim-ctrl-stale {
    color: var(--accent);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .04em;
  }

  @keyframes simCtrlGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @keyframes simCtrlShine {
    0%,100% { transform: translateX(-130%) skewX(-18deg); }
    55%     { transform: translateX(230%) skewX(-18deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    .sim-ctrl::before, .sim-ctrl-btn-primary::after { animation: none !important; }
    .sim-ctrl-btn, .sim-ctrl-btn-primary, .sim-ctrl-seg-btn, .sim-ctrl-icon-btn { transition: none !important; }
  }
`;

export default function SimulatorControls({
  method, setMethod,
  runs, setRuns,
  initialCapital, setInitialCapital,
  seed, setSeed, randomizeSeed,
  blockSize, setBlockSize,
  ruinThreshold, setRuinThreshold,
  setThresholdCustomized,
  isMoney,
  isRunning,
  onRun,
  onExport,
  onExportRaw,
  hasResult,
  isStale,
}) {
  const selectedPreset = Object.keys(PRESETS).find(k => PRESETS[k].runs === runs) || '';
  const runsValid =
    Number.isInteger(runs) &&
    runs >= 100 &&
    runs <= 200000;

  const seedValid =
    Number.isInteger(seed) &&
    seed >= 0;

  const capitalValid =
    Number.isFinite(initialCapital) &&
    initialCapital >= 0;

  const thresholdValid =
    Number.isFinite(ruinThreshold) &&
    ruinThreshold < 0;

  const blockSizeValid =
    method !== 'block' ||
    (Number.isInteger(blockSize) && blockSize >= 1);

  const controlsValid =
    runsValid &&
    seedValid &&
    capitalValid &&
    thresholdValid &&
    blockSizeValid;

  return (
    <div className="sim-ctrl">
      <style>{CTRL_CSS}</style>

      <div className="sim-ctrl-row">
        <div className="sim-ctrl-group">
          <span className="sim-ctrl-label">Method</span>
          <div className="sim-ctrl-seg">
            {METHODS.map(m => (
              <button
                key={m.id} type="button"
                className={`sim-ctrl-seg-btn ${method === m.id ? 'is-active' : ''}`}
                onClick={() => setMethod(m.id)}
                disabled={isRunning}
                title={m.hint}
              >
                {m.label}
                <span className="hint">{m.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {method === 'block' && (
          <label className="sim-ctrl-label">
            Block Size
            <select
              value={blockSize}
              onChange={(e) => setBlockSize(Number(e.target.value))}
              disabled={isRunning}
              className="sim-ctrl-select"
              title="Number of consecutive trades per block"
            >
              {BLOCK_SIZES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
        )}

        <div className="sim-ctrl-spacer" />

        <label className="sim-ctrl-label">
          Preset
          <select
            value={selectedPreset}
            onChange={(e) => { const p = PRESETS[e.target.value]; if (p) setRuns(p.runs); }}
            disabled={isRunning}
            className="sim-ctrl-select"
          >
            <option value="">Custom</option>
            {Object.entries(PRESETS).map(([k, p]) => (
              <option key={k} value={k}>{p.label} · {p.runs.toLocaleString()}</option>
            ))}
          </select>
        </label>

        <label className="sim-ctrl-label">
          Runs
          <input
            type="number"
            value={runs}
            min={100}
            max={200000}
            step={100}
            onChange={(e) => {
              const value = Number(e.target.value);
              setRuns(Number.isFinite(value) ? Math.floor(value) : 0);
            }}
            disabled={isRunning}
            className={`sim-ctrl-input ${!runsValid ? 'is-invalid' : ''}`}
            title="Runs must be an integer from 100 to 200,000"
          />
        </label>
      </div>

      <div className="sim-ctrl-row">
        <label className="sim-ctrl-label">
          Seed
          <input
            type="number" value={seed}
            onChange={(e) => {
              const value = Number(e.target.value);
              setSeed(Number.isFinite(value) ? Math.floor(value) : -1);
            }}
            disabled={isRunning}
            className={`sim-ctrl-input is-seed ${!seedValid ? 'is-invalid' : ''}`}
            title="Same seed + same options = same result"
          />
        </label>
        <button type="button" className="sim-ctrl-icon-btn"
          onClick={randomizeSeed} disabled={isRunning}
          title="Randomize seed" aria-label="Randomize seed">
          <FaDice size={14} />
        </button>
        <label className="sim-ctrl-label">
          Starting Capital
          <input
            type="number"
            value={initialCapital}
            min={0}
            step="0.01"
            onChange={(e) => {
              const value = Number(e.target.value);
              setInitialCapital(Number.isFinite(value) ? value : -1);
            }}
            disabled={isRunning}
            className={`sim-ctrl-input is-wide ${!capitalValid ? 'is-invalid' : ''}`}
            title="Starting capital used for this Monte Carlo simulation"
          />
        </label>

        <label className="sim-ctrl-label">
          DD Threshold
          <input
            type="number"
            value={ruinThreshold}
            max={-0.000001}
            onChange={(e) => {
              const value = Number(e.target.value);
              setRuinThreshold(value);
              setThresholdCustomized(true);
            }}
            disabled={isRunning}
            className={`sim-ctrl-input is-wide ${!thresholdValid ? 'is-invalid' : ''}`}
            title={
              isMoney && initialCapital > 0
                ? `Maximum drawdown depth that counts as a threshold breach (default: 20% of starting capital)`
                : 'Maximum drawdown depth in R that counts as a threshold breach'
            }
          />
        </label>

        <div className="sim-ctrl-spacer" />
        {!controlsValid && (
          <span className="sim-ctrl-stale">
            Fix invalid simulation settings before running.
          </span>
        )}
        <button
          type="button"
          className="sim-ctrl-btn"
          onClick={onExport}
          disabled={!hasResult || isStale}
          title={
            isStale
              ? 'Run the simulation again before exporting'
              : 'Export summary report'
          }
        >
          <FaDownload size={11} /> Summary CSV
        </button>

        <button
          type="button"
          className="sim-ctrl-btn"
          onClick={onExportRaw}
          disabled={!hasResult || isStale}
          title={
            isStale
              ? 'Run the simulation again before exporting'
              : 'Export one row for every Monte Carlo run'
          }
        >
          <FaDownload size={11} /> Run Data CSV
        </button>

        <button
          type="button"
          className="sim-ctrl-btn-primary"
          onClick={onRun}
          disabled={isRunning || !controlsValid}
        >
          {isRunning
            ? <FaPlay size={11} />
            : isStale
              ? <FaRedo size={11} />
              : hasResult
                ? <FaRedo size={11} />
                : <FaPlay size={11} />
          }

          {isRunning
            ? 'Simulating…'
            : isStale
              ? 'Update Simulation'
              : hasResult
                ? 'Re-run'
                : 'Run Simulation'
          }
        </button>
      </div>
    </div>
  );
}