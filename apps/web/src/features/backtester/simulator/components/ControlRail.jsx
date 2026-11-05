import { Play, Square, Shuffle, Repeat, Layers, Dices, RotateCcw } from 'lucide-react';
import { Field, NumField, NumListField, Segmented, Chips } from './Fields';
import { fmtAxis, fmtBytes } from '../lib/format';
import { RUN_OPTIONS, runsAllowed, bytesFor } from '../lib/limits';

const METHODS = [
  {
    id: 'permutation',
    title: 'Permutation',
    desc: 'Same trades, shuffled order. Tests path risk.',
    Icon: Shuffle,
  },
  {
    id: 'bootstrap',
    title: 'Bootstrap',
    desc: 'Resample with replacement. Tests probability of profit.',
    Icon: Repeat,
  },
  {
    id: 'block',
    title: 'Block bootstrap',
    desc: 'Resample streaks of trades. Keeps clustering.',
    Icon: Layers,
  },
];

export default function ControlRail({ sim, isMoney, accountName, unitLabel }) {
  const {
    n, method, setMethod, runs, setRuns, blockSize, setBlockSize, seed, setSeed, randomizeSeed,
    initialCapital, setInitialCapital, dollarsPerR, derivedDollarsPerR, setDollarsPerRCustom,
    ddLimit, defaultDdLimit, setDdLimitCustom, targets, defaultTargets, setTargetsCustom,
    run, cancel, isRunning, progress, canRun, sizeOk, isStale, result,
  } = sim;

  const ddChips = isMoney
    ? initialCapital > 0
      ? [5, 10, 20, 30].map((p) => ({ label: `${p}%`, value: Math.round((initialCapital * p) / 100) }))
      : [500, 1000, 2000, 5000].map((v) => ({ label: fmtAxis(v, true), value: v }))
    : [5, 10, 15, 20].map((v) => ({ label: `${v}R`, value: v }));
  ddChips.push({ label: 'Off', value: 0 });

  const memory = bytesFor(runs, n);
  const targetFmt = (v) => (isMoney ? String(Math.round(v)) : String(v));
  const targetsCustomized = JSON.stringify(targets) !== JSON.stringify(defaultTargets);

  return (
    <div className="sx-rail-inner">
      <div className="sx-rail-head">
        <div>
          <div className="sx-eyebrow">Setup</div>
          <div className="sx-rail-title" title={accountName}>{accountName || 'Account'}</div>
        </div>
        <div className="sx-pill">{n} trades &middot; {unitLabel}</div>
      </div>

      <section className="sx-section">
        <div className="sx-section-title">Method</div>
        <div className="sx-methods" role="radiogroup" aria-label="Simulation method">
          {METHODS.map(({ id, title, desc, Icon }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={method === id}
              className={`sx-method ${method === id ? 'is-active' : ''}`}
              onClick={() => setMethod(id)}
            >
              <span className="sx-method-icon"><Icon size={16} /></span>
              <span className="sx-method-body">
                <span className="sx-method-title">{title}</span>
                <span className="sx-method-desc">{desc}</span>
              </span>
            </button>
          ))}
        </div>
        {method === 'block' && (
          <Field label="Block size" hint={`Trades kept together per block (1 to ${n}).`}>
            <NumField value={blockSize} min={1} max={n} onCommit={(v) => setBlockSize(Math.round(v))} label="Block size" suffix="trades" />
          </Field>
        )}
      </section>

      <section className="sx-section">
        <div className="sx-section-title">Simulation</div>
        <Field
          label="Runs"
          hint={memory > 1e8 ? `Uses about ${fmtBytes(memory)} of memory while running.` : null}
        >
          <Segmented
            label="Number of runs"
            value={runs}
            onChange={setRuns}
            options={RUN_OPTIONS.map((r) => ({
              value: r,
              label: r >= 1000 ? `${r / 1000}k` : r,
              disabled: !runsAllowed(r, n),
              title: runsAllowed(r, n) ? undefined : 'Too large for this many trades',
            }))}
          />
        </Field>
        <Field label="Seed" hint="Same seed + same settings = identical results.">
          <NumField
            value={seed}
            min={0}
            max={2147483647}
            label="Random seed"
            onCommit={(v) => setSeed(Math.round(v))}
            right={
              <button type="button" className="sx-icon-btn" onClick={randomizeSeed} title="New random seed" aria-label="New random seed">
                <Dices size={15} />
              </button>
            }
          />
        </Field>
      </section>

      <section className="sx-section">
        <div className="sx-section-title">Capital &amp; risk</div>
        <Field label="Starting capital" hint={!isMoney && !(initialCapital > 0) ? 'Optional. Lets drawdown show as % of capital.' : null}>
          <NumField value={initialCapital} prefix="$" label="Starting capital" onCommit={(v) => setInitialCapital(v)} />
        </Field>

        {!isMoney && (
          <Field
            label="1R equals"
            hint={dollarsPerR > 0 ? null : 'Set a dollar value to see drawdown as % of capital.'}
            action={
              dollarsPerR !== derivedDollarsPerR && (
                <button type="button" className="sx-link" onClick={() => setDollarsPerRCustom(null)}>
                  <RotateCcw size={11} /> reset
                </button>
              )
            }
          >
            <NumField value={dollarsPerR || ''} prefix="$" label="Dollars per R" onCommit={(v) => setDollarsPerRCustom(v)} />
          </Field>
        )}

        <Field
          label="Drawdown limit"
          hint={ddLimit > 0 ? 'A run "breaches" when it falls this far below its peak.' : 'Off: breach odds are not computed.'}
          action={
            ddLimit !== defaultDdLimit && (
              <button type="button" className="sx-link" onClick={() => setDdLimitCustom(null)}>
                <RotateCcw size={11} /> reset
              </button>
            )
          }
        >
          <NumField
            value={ddLimit > 0 ? ddLimit : ''}
            placeholder="Off"
            prefix={isMoney ? '$' : undefined}
            suffix={isMoney ? undefined : 'R'}
            label="Drawdown limit"
            onCommit={(v) => setDdLimitCustom(v)}
          />
          <Chips options={ddChips} activeValue={ddLimit} onPick={setDdLimitCustom} />
        </Field>

        <Field
          label={`Profit targets (${isMoney ? '$' : 'R'})`}
          hint="Separate with spaces, e.g. 500 1000 2500. Up to 8."
          action={
            targetsCustomized && (
              <button type="button" className="sx-link" onClick={() => setTargetsCustom(null)}>
                <RotateCcw size={11} /> reset
              </button>
            )
          }
        >
          <NumListField value={targets} format={targetFmt} label="Profit targets" onCommit={setTargetsCustom} />
        </Field>
      </section>

      <div className="sx-run">
        {isRunning ? (
          <button type="button" className="sx-btn sx-btn-danger" onClick={cancel}>
            <Square size={14} /> Cancel &middot; {Math.round(progress)}%
          </button>
        ) : (
          <button type="button" className={`sx-btn sx-btn-primary ${isStale ? 'is-pulse' : ''}`} disabled={!canRun} onClick={run}>
            <Play size={14} /> {result ? (isStale ? 'Re-run with new settings' : 'Run again') : 'Run simulation'}
          </button>
        )}
        <div className="sx-progress" data-active={isRunning} aria-hidden="true">
          <span style={{ width: `${isRunning ? progress : 0}%` }} />
        </div>
        <div className="sx-kbd-hint">
          <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to run
          {!sizeOk && <span className="sx-warn-text"> &middot; too many runs for this data</span>}
        </div>
      </div>
    </div>
  );
}
