// src/components/dashboard/DashboardFooter.jsx
import { useAppContext } from '../../context/AppContext';

const SESSIONS_TEXT =
  'Sessions (ET): Asia 18:00–02:00 · London 02:00–05:00 · NY Pre-Market 05:00–08:30 · NY AM 08:30–11:00 · NY Lunch 11:00–13:30 · NY PM 13:30–16:00 · After Hours 16:00–18:00.';

const TICKS_PER_POINT = 4;

function buildBacktestRule(account) {
  const hasDefault = account?.slValue !== null && account?.slValue !== undefined && Number(account.slValue) > 0;
  const unit = account?.slUnit === 'ticks' ? 'ticks' : 'points';
  const defaultPts = hasDefault
    ? (account.slUnit === 'ticks' ? Number(account.slValue) / TICKS_PER_POINT : Number(account.slValue))
    : null;

  return (
    <>
      <b>R is computed per-trade.</b> Each trade uses its own stop-loss from the{' '}
      <b>SL</b> column in your log (in points).{' '}
      {hasDefault
        ? <>If a trade has no SL, the account default of <b>{Number(account.slValue)} {unit}</b> ({defaultPts} pts) is used.</>
        : <>No account default is set — every row must have an SL value.</>}{' '}
      SL counted as <b>HIT</b> when <b>MAE ≥ SL</b>. Win when <b>MFE ≥ SL × R</b>, regardless of MAE
      (a trade may run to target with zero drawdown and still hit the stop after). Otherwise scored as
      a loss. No breakeven / scratch bucket.
    </>
  );
}

function buildMoneyRule(account) {
  const mode = account?.commissionMode || 'none';
  const val = Number(account?.commissionValue) || 0;
  const currency = account?.currency || 'USD';

  let commText = 'No commission configured.';
  if (mode === 'flat' && val > 0) {
    commText = <>Flat commission of <b>{currency} {val.toFixed(2)}</b> per trade.</>;
  } else if (mode === 'per_contract' && val > 0) {
    commText = <>Commission of <b>{currency} {val.toFixed(2)} per contract</b> (multiplied by each trade's Contracts).</>;
  }

  return (
    <>
      <b>Dashboard reflects net P&amp;L.</b> Each trade's net = Gross P&amp;L − commission. Win when{' '}
      <b>net &gt; 0</b>, loss when <b>net &lt; 0</b>. {commText} No R-multiple is computed for this account type.
    </>
  );
}

export default function DashboardFooter() {
  const { state } = useAppContext();
  const account = state.accounts.find((a) => a.id === state.selectedAccountId) || null;
  const isBacktest = account?.type === 'Backtest';

  return (
    <footer
      style={{
        textAlign: 'center',
        color: 'var(--text-faint)',
        fontFamily: 'var(--mono)',
        fontSize: '10.5px',
        marginTop: '50px',
        padding: '0 28px',
        lineHeight: '1.7',
      }}
    >
      <b>Rules applied{account ? ` — ${account.name}` : ''}:</b>{' '}
      {account ? (isBacktest ? buildBacktestRule(account) : buildMoneyRule(account)) : 'No account selected.'}
      <br />
      {SESSIONS_TEXT}
    </footer>
  );
}