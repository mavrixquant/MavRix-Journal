import { useAppContext } from '@/app/providers/AppProvider';
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';

const SESSIONS_TEXT =
  'Sessions (ET): Asia 18:00-02:00 · London 02:00-05:00 · NY Pre-Market 05:00-08:30 · NY AM 08:30-11:00 · NY Lunch 11:00-13:30 · NY PM 13:30-16:00 · After Hours 16:00-18:00.';

function buildBacktestRule() {
  return (
    <>
      <b>R is computed per-trade.</b> Each trade uses its own stop-loss from the{' '}
      <b>SL</b> column in your log (in points). SL counted as <b>HIT</b> when{' '}
      <b>MAE &gt;= SL</b>. Win when <b>MFE &gt;= SL × R</b>, regardless of MAE
      (a trade may run to target with zero drawdown and still hit the stop
      after). Otherwise scored as a loss. No breakeven / scratch bucket.
    </>
  );
}

function buildMoneyRule() {
  return (
    <>
      <b>Dashboard reflects net P&amp;L.</b> Each trade&apos;s net = Gross
      P&amp;L − its own commission (set per trade). Win when{' '}
      <b>net &gt; 0</b>, loss when <b>net &lt; 0</b>. No R-multiple is
      computed for this account type.
    </>
  );
}

export default function DashboardFooter() {
  const { state } = useAppContext();
  const { accountId } = useDashboardAccount();

  const account = state.accounts.find((a) => a.id === accountId) || null;
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
      {account ? (isBacktest ? buildBacktestRule() : buildMoneyRule()) : 'No account selected.'}
      <br />
      {SESSIONS_TEXT}
    </footer>
  );
}