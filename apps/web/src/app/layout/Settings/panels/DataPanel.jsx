// apps/web/src/app/layout/Settings/panels/DataPanel.jsx
//
// Data & Storage controls. Everything here is locally-triggered — the
// export hits existing API endpoints, the cache clear touches local
// state, and the reset calls the settings provider.

import { useState } from 'react';
import { Download, Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { apiJson } from '@/shared/api/client';
import { queryClient } from '@/shared/api/queryClient';
import { useSettings } from '../SettingsProvider';
import ConfirmDangerModal from '@/features/admin/components/ConfirmDangerModal';

const SETTINGS_KEY = 'mavrix:settings';

async function collectAndDownload() {
  const [{ accounts }, { strategies }] = await Promise.all([
    apiJson('/api/accounts'),
    apiJson('/api/strategies'),
  ]);

  const tradesByAccount = await Promise.all(
    accounts.map(async (a) => {
      try {
        const { trades } = await apiJson(
          `/api/trades?accountId=${encodeURIComponent(a.id)}`
        );
        return { accountId: a.id, accountName: a.name, trades };
      } catch {
        return { accountId: a.id, accountName: a.name, trades: [] };
      }
    })
  );

  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'Mavrix Journal',
    version: '0.1.0',
    accounts,
    strategies,
    tradesByAccount,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `mavrix-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function clearLocalCache() {
  queryClient.clear();

  // Preserve settings + sidebar state; clear everything else.
  const preserved = {
    [SETTINGS_KEY]: localStorage.getItem(SETTINGS_KEY),
    'mavrix:sidebar:collapsed': localStorage.getItem('mavrix:sidebar:collapsed'),
  };
  localStorage.clear();
  for (const [k, v] of Object.entries(preserved)) {
    if (v != null) localStorage.setItem(k, v);
  }
}

export default function DataPanel() {
  const { reset } = useSettings();
  const [exporting, setExporting] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  // confirmAction: 'clear-cache' | 'reset-settings' | null

  const handleExport = async () => {
    setExporting(true);
    try {
      await collectAndDownload();
      toast.success('Export downloaded');
    } catch (err) {
      toast.error(err?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleClearCache = () => {
    clearLocalCache();
    setConfirmAction(null);
    toast.success('Local cache cleared');
  };

  const handleResetSettings = () => {
    reset();
    setConfirmAction(null);
    toast.success('Settings reset to defaults');
  };

  return (
    <>
      <section className="settings-section">
        <h4 className="settings-section-title">Export</h4>
        <p className="settings-hint">
          Download all of your accounts, strategies, and trades as a single
          JSON file. Useful as a backup or for analysis in other tools.
        </p>

        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Export all data</span>
            <span className="settings-options-desc">
              A JSON snapshot of everything you own on this account.
            </span>
          </div>
          <button
            type="button"
            className="settings-btn settings-btn-primary"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <>
                <Loader2 size={12} className="settings-spin" />
                Exporting…
              </>
            ) : (
              <>
                <Download size={12} />
                Export JSON
              </>
            )}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h4 className="settings-section-title">Local storage</h4>
        <p className="settings-hint">
          The app caches API responses and small UI state in your browser.
          Clearing it forces a fresh fetch on the next request.
        </p>

        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Clear local cache</span>
            <span className="settings-options-desc">
              Empties the query cache and non-essential localStorage keys.
              Your settings and sidebar state are preserved.
            </span>
          </div>
          <button
            type="button"
            className="settings-btn"
            onClick={() => setConfirmAction('clear-cache')}
          >
            <Trash2 size={12} />
            Clear cache
          </button>
        </div>
      </section>

      <section className="settings-section settings-danger-zone">
        <h4 className="settings-section-title">Reset</h4>
        <p className="settings-hint">
          Restore every preference in this modal to its factory default.
          This does not affect your accounts, trades, or strategies.
        </p>

        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Reset all settings</span>
            <span className="settings-options-desc">
              Accent color, density, formats, notifications, and chat
              preferences all return to their initial values.
            </span>
          </div>
          <button
            type="button"
            className="settings-btn settings-btn-danger"
            onClick={() => setConfirmAction('reset-settings')}
          >
            <RotateCcw size={12} />
            Reset settings
          </button>
        </div>
      </section>

      <ConfirmDangerModal
        isOpen={confirmAction === 'clear-cache'}
        title="Clear local cache?"
        description="This empties the API response cache and removes non-essential browser storage. Your settings are kept. Data will be refetched on the next request."
        confirmPhrase="CLEAR"
        confirmLabel="Clear cache"
        onConfirm={handleClearCache}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDangerModal
        isOpen={confirmAction === 'reset-settings'}
        title="Reset all settings?"
        description="Every preference in this modal will return to its factory default. This cannot be undone."
        confirmPhrase="RESET"
        confirmLabel="Reset settings"
        onConfirm={handleResetSettings}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}