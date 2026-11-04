import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus } from 'lucide-react';

import { useAuth } from '@/app/providers/AuthProvider';
import { useAppContext } from '@/app/providers/AppProvider';
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import { useAccounts } from '@/shared/api/accounts';

import { useEnrichedTrades } from '@/features/dashboard/hooks/useEnrichedTrades';
import { useUserLayouts } from '@/features/dashboard/hooks/useUserLayouts';
import { useResponsiveGridMetrics } from '@/features/dashboard/hooks/useResponsiveGridMetrics';
import { useDashboardEditor } from '@/features/dashboard/hooks/useDashboardEditor';
import { reconcileLayouts } from '@/features/dashboard/layout/dashboardLayout';
import DashboardGrid from '@/features/dashboard/components/DashboardGrid';
import DashboardContextBar from '@/features/dashboard/components/DashboardContextBar';

import '@/features/dashboard/dashboardShell.css';

const SKELETON_CSS = `
  .dsk { display:grid; gap:16px; grid-template-columns: repeat(12, minmax(0,1fr)); }
  .dsk > i { display:block; border-radius:16px; background: linear-gradient(100deg, rgba(255,255,255,.03) 30%, rgba(255,255,255,.07) 50%, rgba(255,255,255,.03) 70%) #0F131C; background-size: 200% 100%; animation: dsk 1.4s linear infinite; border:1px solid rgba(255,255,255,.06); }
  @keyframes dsk { to { background-position: -200% 0; } }
  .dsk .a { grid-column: span 12; height: 96px; } .dsk .b { grid-column: span 8; height: 340px; } .dsk .c { grid-column: span 4; height: 340px; }
  .dsk .d { grid-column: span 4; height: 220px; }
  @media (max-width: 900px) { .dsk .b, .dsk .c, .dsk .d { grid-column: span 12; } }
  .dfab { position: fixed; right: 22px; bottom: 22px; z-index: 40; display: flex; gap: 10px; }
  .dfab button { display:inline-flex; align-items:center; gap:8px; height:42px; padding:0 18px; border-radius:999px; font: 700 12px 'IBM Plex Mono', monospace; cursor:pointer; box-shadow: 0 14px 30px -10px rgba(0,0,0,.8); transition: transform .15s, filter .15s; }
  .dfab button:hover { transform: translateY(-1px); filter: brightness(1.08); }
  .dfab .ghost { background: rgba(15,19,28,.92); border:1px solid rgba(255,255,255,.14); color:#E7E9EE; backdrop-filter: blur(10px); }
  .dfab .solid { background: var(--accent); border:1px solid var(--accent); color:#0A0D14; }
  @media (max-width: 640px) { .dfab { right: 14px; bottom: 14px; } .dfab span { display: none; } .dfab button { padding: 0 14px; } }
`;

function Skeleton() {
  return (
    <div className="dash-root">
      <style>{SKELETON_CSS}</style>
      <div className="dsk">
        <i className="a" /><i className="b" /><i className="c" />
        <i className="d" /><i className="d" /><i className="d" />
      </div>
    </div>
  );
}

/**
 * Shared page body for /journal and /backtester.
 * kind: 'journal' (Live/Demo accounts) | 'backtest' (Backtest accounts)
 * `header` is optional extra UI rendered above the grid (Backtester toolbar).
 */
export default function DashboardView({ kind, header = null }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state } = useAppContext();
  const { accountId } = useDashboardAccount();
  const { isLoading: accountsLoading } = useAccounts();
  const isBacktest = kind === 'backtest';

  const compatibleAccounts = useMemo(
    () =>
      (state.accounts || []).filter((a) =>
        isBacktest ? a.type === 'Backtest' : a.type !== 'Backtest'
      ),
    [state.accounts, isBacktest]
  );
  const account = compatibleAccounts.find((a) => a.id === accountId) || null;
  const accountIdValid = !!account;

  const enriched = useEnrichedTrades(accountIdValid ? accountId : null);
  const editor = useDashboardEditor({ userId: user?.id });
  const layoutsApi = useUserLayouts({
    userId: user?.id,
    suppressRemotePush: editor.editMode,
  });
  const { layouts: rawLayouts, setLayouts, activeId, setActiveId, layoutsReady } = layoutsApi;
  const gridMetrics = useResponsiveGridMetrics();

  // Old saved layouts (previous panel set) are migrated in memory; persisted on the next explicit Save.
  const layouts = useMemo(() => reconcileLayouts(rawLayouts || []), [rawLayouts]);
  editor.bind({ layouts, activeId, setLayouts, setActiveId });

  usePageHeader(
    isBacktest
      ? { title: 'Backtester', badge: account?.type, badgeVariant: 'is-backtest' }
      : { title: 'Journal', badge: account?.type }
  );

  const bootstrapping =
    !user ||
    accountsLoading ||
    (compatibleAccounts.length > 0 && !accountIdValid) ||
    (accountIdValid && (enriched.isLoading || !enriched.isSynced)) ||
    !layoutsReady;

  if (bootstrapping) return <Skeleton />;

  if (compatibleAccounts.length === 0) {
    return (
      <div className="dash-root">
        <div className="dash-allhidden">
          No {isBacktest ? 'backtest' : 'live or demo'} account yet. Create one from the account menu to start.
        </div>
      </div>
    );
  }

  return (
    <div className="dash-root">
      <style>{SKELETON_CSS}</style>
      {!editor.editMode && <DashboardContextBar account={account} />}
      {header}
      <DashboardGrid editor={editor} layouts={layouts} activeId={activeId} gridMetrics={gridMetrics} />

      {!editor.editMode && (
        <div className="dfab">
          <button type="button" className="ghost" onClick={editor.enterEdit}>
            <Pencil size={14} /><span>Customize</span>
          </button>
          {!isBacktest && (
            <button type="button" className="solid" onClick={() => navigate('/journal/logs?addTrade=1')}>
              <Plus size={15} /><span>Add trade</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
