// src/components/dashboard/DashboardFooter.jsx
import { useAppContext } from '../../context/AppContext';

const SESSIONS_TEXT =
  'Sessions (ET): Asia 18:00–02:00 · London 02:00–05:00 · NY Pre-Market 05:00–08:30 · NY AM 08:30–11:00 · NY Lunch 11:00–13:30 · NY PM 13:30–16:00 · After Hours 16:00–18:00.';

/**
 * Builds the rule sentence for the footer based on the account's SL config.
 * Extend the switch below as you add new slType values in accountsService.
 */
function buildSLRule(account) {
  if (!account) {
    return 'No account selected — pick an account to see its applied stop-loss rule set.';
  }

  const { slType = 'fixed', slValue, slUnit = 'pt' } = account;
  const v = slValue ?? '—';
  const u = slUnit;

  switch (slType) {
    case 'fixed':
      return (
        <>
          Fixed stop-loss = <b>{v}{u}</b>. SL counted as HIT only when MAE ≥ {v} (a real
          full-stop excursion). Win when MFE ≥ {v} × R, regardless of MAE — including MAE = 0,
          since that can mean price ran straight to TP with zero drawdown before falling back to
          the stop afterward. Otherwise (target not reached), scored as a loss. No breakeven /
          scratch bucket.
        </>
      );

    case 'percent':
      return (
        <>
          Percentage stop-loss = <b>{v}%</b> of entry. SL counted as HIT only when adverse
          excursion ≥ {v}%. Win when favorable excursion ≥ {v}% × R, regardless of drawdown
          before the run. Otherwise scored as a loss. No breakeven / scratch bucket.
        </>
      );

    case 'atr':
      return (
        <>
          ATR stop-loss = <b>{v} × ATR</b>. SL counted as HIT only when adverse excursion ≥{' '}
          {v} × ATR. Win when favorable excursion ≥ ({v} × ATR) × R, regardless of drawdown
          before the run. Otherwise scored as a loss. No breakeven / scratch bucket.
        </>
      );

    case 'structure':
      return (
        <>
          Structural stop-loss (<b>{v}{u}</b> buffer beyond swing). SL counted as HIT only when
          adverse excursion breaches the structural level + buffer. Win when favorable excursion
          ≥ risk × R. Otherwise scored as a loss. No breakeven / scratch bucket.
        </>
      );

    default:
      // Unknown slType — fail safe with a generic readout instead of the wrong rule.
      return (
        <>
          Stop-loss type: <b>{slType}</b> ({v} {u}). Rule text not yet defined for this type —
          add a case in <code>buildSLRule</code>.
        </>
      );
  }
}

export default function DashboardFooter() {
  const { state } = useAppContext();
  const account =
    state.accounts.find((a) => a.id === state.selectedAccountId) || null;

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
      <b>Rules applied{account ? ` — ${account.name}` : ''}:</b> {buildSLRule(account)}
      <br />
      {SESSIONS_TEXT}
    </footer>
  );
}