// apps/web/src/features/journal/analyse/AnalyseHeader.jsx
//
// Page header for /journal/analyse.
//
// Uses the shared `ph-*` recipe from page-header.css so the eyebrow/title/
// badge rhythm matches every other feature page in the app. The subtitle
// reflects live filter state:
//   - no trades on the account       → "No trades recorded…"
//   - filters narrowed the set       → "12 of 42 trades match your filters"
//   - no filters active              → "42 trades across this account"

import '@/shared/ui/page-header.css';

export default function AnalyseHeader({ account, totalCount, filteredCount }) {
  const badgeClass =
    account?.type === 'Demo'
      ? 'is-demo'
      : account?.type === 'Backtest'
        ? 'is-backtest'
        : 'is-live';

  const isFiltered = totalCount > 0 && filteredCount !== totalCount;

  let subText;
  if (totalCount === 0) {
    subText = 'No trades recorded for this account yet';
  } else if (isFiltered) {
    subText = `${filteredCount} of ${totalCount} trades match your filters`;
  } else {
    subText = `${totalCount} ${totalCount === 1 ? 'trade' : 'trades'} across this account`;
  }

  return (
    <div className="ph">
      <div className="ph-row">
        <div className="ph-left">
          <span className="ph-eyebrow">Journal</span>
          <div className="ph-title-row">
            <h1 className="ph-title">Analyse</h1>
            {account && (
              <span className={`ph-badge ${badgeClass}`}>{account.type}</span>
            )}
          </div>
          <p className="ph-sub">{subText}</p>
        </div>
      </div>
    </div>
  );
}