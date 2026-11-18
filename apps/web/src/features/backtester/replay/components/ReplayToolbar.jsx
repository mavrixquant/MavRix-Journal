import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, StepBack, StepForward } from 'lucide-react';
import { BACKTEST_INTERVALS } from '@mavrix/shared';
import { tradeTimeToUtcSeconds } from '@/shared/trading/tradeTime';
import { SPEEDS } from '../hooks/useReplayEngine';
import { INTERVAL_SECONDS, dayKey, clockOf } from '../../lib/time';

function ProgressSlider({ idx, last, min, onCommit, disabled }) {
  const [val, setVal] = useState(idx);
  const [drag, setDrag] = useState(false);
  useEffect(() => { if (!drag) setVal(idx); }, [idx, drag]);

  const commit = () => {
    setDrag(false);
    onCommit(Math.max(min, Number(val)));
  };
  const pct = last > 0 ? (val / last) * 100 : 0;
  const minPct = last > 0 ? (min / last) * 100 : 0;

  return (
    <div className="rp-slider" style={{ '--p': `${pct}%`, '--m': `${minPct}%` }}>
      <input
        type="range"
        min={0}
        max={Math.max(0, last)}
        value={val}
        disabled={disabled || last <= 0}
        onChange={(e) => { setDrag(true); setVal(Number(e.target.value)); }}
        onMouseUp={commit}
        onTouchEnd={commit}
        onKeyUp={commit}
        aria-label="Replay position"
      />
      <span className="rp-slider-lock" aria-hidden />
    </div>
  );
}

export default function ReplayToolbar({
  engine, baseInterval, viewInterval, onViewInterval, tz, currentBar, onArm, tool, disabled, range,
}) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    if (!currentBar) return;
    setDate(dayKey(currentBar.utc * 1000, tz) || '');
    setTime(clockOf(currentBar.utc * 1000, tz) || '');
  }, [currentBar, tz]);

  const baseSec = INTERVAL_SECONDS[baseInterval];
  const views = baseInterval === '1d'
    ? ['1d']
    : BACKTEST_INTERVALS.filter((i) => i !== '1d' && INTERVAL_SECONDS[i] >= baseSec);

  const go = (e) => {
    e.preventDefault();
    if (!date) return;
    // Only dates that have data can be jumped to.
    const day = range ? (date < range.min ? range.min : date > range.max ? range.max : date) : date;
    if (day !== date) setDate(day);
    const utc = tradeTimeToUtcSeconds(day, time || '00:00', tz);
    if (utc != null) engine.jumpToTime(utc);
  };

  const noBars = engine.last < 0;
  const off = disabled || noBars;

  return (
    <div className="rp-bar" role="toolbar" aria-label="Replay controls">
      <div className="rp-group">
        <button type="button" className="rp-icon" onClick={engine.reset} disabled={off} title="Reset replay" aria-label="Reset replay"><RotateCcw size={15} /></button>
        <button type="button" className="rp-icon" onClick={() => engine.step(-1)} disabled={off || engine.idx <= engine.minIdx} title="Step back" aria-label="Step back"><StepBack size={15} /></button>
        <button
          type="button"
          className={`rp-play${engine.playing ? ' is-on' : ''}`}
          onClick={engine.toggle}
          disabled={off || engine.endReached || !engine.writable}
          aria-label={engine.playing ? 'Pause' : 'Play'}
          title="Play / pause (Space)"
        >
          {engine.playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button type="button" className="rp-icon" onClick={() => engine.step(1)} disabled={off || engine.endReached || !engine.writable} title="Step forward (→)" aria-label="Step forward"><StepForward size={15} /></button>
      </div>

      <div className="rp-seg" role="group" aria-label="Speed">
        {SPEEDS.map((s) => (
          <button key={s} type="button" className={engine.speed === s ? 'is-on' : ''} onClick={() => engine.setSpeed(s)}>{s}x</button>
        ))}
      </div>

      <ProgressSlider
        idx={Math.max(0, engine.idx)}
        last={engine.last}
        min={engine.minIdx}
        onCommit={(n) => engine.advanceTo(n)}
        disabled={off || !engine.writable}
      />

      <form className="rp-jump" onSubmit={go}>
        <input type="date" value={date} min={range?.min} max={range?.max} onChange={(e) => setDate(e.target.value)} aria-label="Jump to date" title={range ? `Available ${range.min} → ${range.max}` : undefined} />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Jump to time" />
        <button type="submit" className="rp-btn" disabled={off || !engine.writable}>Go</button>
      </form>

      <div className="rp-seg" role="group" aria-label="Timeframe">
        {views.map((v) => (
          <button key={v} type="button" className={viewInterval === v ? 'is-on' : ''} onClick={() => onViewInterval(v)}>{v.toUpperCase()}</button>
        ))}
      </div>

      <div className="rp-group rp-order-btns">
        <button type="button" className={`rp-buy${tool === 'rrLong' ? ' is-on' : ''}`} onClick={() => onArm(tool === 'rrLong' ? 'cursor' : 'rrLong')} disabled={off || !engine.writable} title="Click the chart to place a long position">Long</button>
        <button type="button" className={`rp-sell${tool === 'rrShort' ? ' is-on' : ''}`} onClick={() => onArm(tool === 'rrShort' ? 'cursor' : 'rrShort')} disabled={off || !engine.writable} title="Click the chart to place a short position">Short</button>
      </div>
    </div>
  );
}
