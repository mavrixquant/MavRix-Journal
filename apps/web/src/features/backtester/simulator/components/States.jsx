import { Wallet, BarChart3, Sparkles } from 'lucide-react';
import { MIN_TRADES } from '../lib/limits';

export function EmptyAccounts() {
  return (
    <div className="sx sx-center page-fade-in">
      <div className="sx-empty">
        <div className="sx-empty-icon"><Wallet size={26} /></div>
        <h3>No accounts yet</h3>
        <p>Create or sync a trading account in the <b>Accounts</b> tab to run Monte Carlo scenarios on its trades.</p>
      </div>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="sx sx-center page-fade-in">
      <div className="sx-loading">
        <div className="sx-spinner" />
        <span>Loading trade history...</span>
      </div>
    </div>
  );
}

export function InsufficientData({ accountName, count }) {
  return (
    <div className="sx sx-center page-fade-in">
      <div className="sx-empty">
        <div className="sx-empty-icon"><BarChart3 size={26} /></div>
        <h3>Not enough trades for {accountName || 'this account'}</h3>
        <p>
          The simulator needs at least <b>{MIN_TRADES}</b> trades to build a distribution. This account has <b>{count}</b>.
        </p>
        <div className="sx-bar sx-empty-bar"><span style={{ width: `${Math.min(100, (count / MIN_TRADES) * 100)}%` }} /></div>
      </div>
    </div>
  );
}

export function PreRun({ onRun, disabled }) {
  return (
    <div className="sx-card sx-prerun">
      <div className="sx-empty-icon"><Sparkles size={24} /></div>
      <h3>Ready when you are</h3>
      <p>Pick a method on the left and run the simulation to see thousands of alternate versions of your trading history.</p>
      <button type="button" className="sx-btn sx-btn-primary" onClick={onRun} disabled={disabled}>Run simulation</button>
    </div>
  );
}

export function RunningSkeleton({ runs, method, progress }) {
  return (
    <div className="sx-card sx-running">
      <div className="sx-spinner" />
      <div>
        <div className="sx-running-title">Simulating {runs.toLocaleString('en-US')} {method} runs</div>
        <div className="sx-running-sub">{Math.round(progress)}% complete. You can cancel at any time.</div>
      </div>
    </div>
  );
}
