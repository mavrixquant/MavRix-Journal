// src/components/simulator/SimulatorControls.jsx
import { FaPlay, FaRedo, FaDownload } from 'react-icons/fa';

const COLORS = {
  amber: '#FFB020',
  text: '#8892A3',
  textMuted: '#545E6E',
  textLight: '#E7E9EE',
  panel: '#11151F',
  border: '#212836',
};

const PRESETS = {
  quick:    { runs: 200,  label: 'Quick' },
  standard: { runs: 1000, label: 'Standard' },
  deep:     { runs: 2000, label: 'Deep' },
};

export default function SimulatorControls({
  method, setMethod,
  runs, setRuns,
  ruinThreshold, setRuinThreshold,
  isRunning, onRun, onExport, hasResult,
}) {
  const selectedPreset = Object.keys(PRESETS).find(k => PRESETS[k].runs === runs) || '';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
      background: COLORS.panel, border: `1px solid ${COLORS.border}`,
      borderRadius: '12px', padding: '14px 18px',
    }}>
      {/* Preset */}
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: COLORS.text }}>
        <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Preset</span>
        <select
          value={selectedPreset}
          onChange={(e) => { const p = PRESETS[e.target.value]; if (p) setRuns(p.runs); }}
          disabled={isRunning}
          style={{
            background: '#0D1117', border: `1px solid ${COLORS.border}`,
            borderRadius: '6px', color: COLORS.textLight,
            fontSize: '12px', fontFamily: "'IBM Plex Mono', monospace",
            padding: '6px 9px', outline: 'none',
            cursor: isRunning ? 'not-allowed' : 'pointer',
          }}
        >
          <option value="">Custom</option>
          {Object.entries(PRESETS).map(([k, p]) => (
            <option key={k} value={k}>{p.label} · {p.runs}</option>
          ))}
        </select>
      </label>

      {/* Runs */}
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: COLORS.text }}>
        <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Runs</span>
        <input
          type="number" value={runs} min={50} max={5000} step={50}
          onChange={(e) => setRuns(Math.max(50, Math.min(5000, Number(e.target.value) || 1000)))}
          disabled={isRunning}
          style={{
            width: '80px', background: '#0D1117', border: `1px solid ${COLORS.border}`,
            borderRadius: '6px', color: COLORS.textLight,
            fontSize: '12px', fontFamily: "'IBM Plex Mono', monospace",
            padding: '6px 9px', outline: 'none', textAlign: 'center',
          }}
        />
      </label>

      {/* Method */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: COLORS.text }}>Method</span>
        <div style={{ display: 'flex', background: '#0D1117', border: `1px solid ${COLORS.border}`, borderRadius: '6px', padding: '2px' }}>
          {['permutation', 'bootstrap'].map(m => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              disabled={isRunning}
              style={{
                padding: '5px 14px', fontSize: '11.5px', fontWeight: 600,
                background: method === m ? COLORS.amber : 'transparent',
                color: method === m ? '#0D1117' : COLORS.text,
                border: 'none', borderRadius: '4px',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                textTransform: 'capitalize',
              }}
            >{m}</button>
          ))}
        </div>
      </div>

      {/* Ruin */}
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: COLORS.text }}>
        <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ruin Threshold</span>
        <input
          type="number" value={ruinThreshold}
          onChange={(e) => setRuinThreshold(Number(e.target.value))}
          disabled={isRunning}
          style={{
            width: '90px', background: '#0D1117', border: `1px solid ${COLORS.border}`,
            borderRadius: '6px', color: COLORS.textLight,
            fontSize: '12px', fontFamily: "'IBM Plex Mono', monospace",
            padding: '6px 9px', outline: 'none', textAlign: 'right',
          }}
        />
      </label>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Export */}
      <button
        onClick={onExport}
        disabled={!hasResult}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '7px 14px', background: 'transparent',
          border: `1px solid ${COLORS.border}`, borderRadius: '8px',
          color: hasResult ? COLORS.textLight : COLORS.textMuted,
          fontSize: '12px', fontWeight: 600,
          cursor: hasResult ? 'pointer' : 'not-allowed',
        }}
      ><FaDownload size={11} /> Export CSV</button>

      {/* Run / Re-run */}
      <button
        onClick={onRun}
        disabled={isRunning}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          padding: '9px 18px',
          background: isRunning ? 'rgba(255,176,32,0.35)' : COLORS.amber,
          color: '#0D1117', border: 'none', borderRadius: '8px',
          fontSize: '13px', fontWeight: 700,
          cursor: isRunning ? 'not-allowed' : 'pointer',
          boxShadow: '0 4px 14px rgba(255, 176, 32, 0.25)',
          transition: 'transform 0.15s ease',
        }}
        onMouseEnter={(e) => { if (!isRunning) e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        {hasResult ? <FaRedo size={11} /> : <FaPlay size={11} />}
        {isRunning ? 'Simulating…' : hasResult ? 'Re-run' : 'Run Simulation'}
      </button>
    </div>
  );
}