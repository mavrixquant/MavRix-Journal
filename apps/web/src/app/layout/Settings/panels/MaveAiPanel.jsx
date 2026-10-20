
import { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  KeyRound,
  Loader2,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { AI_PROVIDERS, getProviderMeta } from '@mavrix/shared';

import {
  useAiSettings,
  useAiProviders,
  useSaveAiCredential,
  useDeleteAiCredential,
  useUpdateAiModels,
  useTestAiKey,
} from '@/shared/api/ai';
import Alert from '@/shared/components/Alert';

const CSS = `
  .mave-panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .mave-hero {
    padding: 20px;
    border-radius: 14px;
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, transparent), rgba(255,255,255,.02));
    border: 1px solid var(--accent-soft2);
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }
  .mave-hero-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 0 24px -8px color-mix(in srgb, var(--accent) 50%, transparent);
  }
  .mave-hero-text h3 {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 700;
    color: var(--ink-1);
  }
  .mave-hero-text p {
    margin: 0;
    font-size: 12.5px;
    color: var(--ink-2);
    line-height: 1.6;
    font-family: 'IBM Plex Mono', monospace;
  }

  .mave-cred-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .mave-cred {
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.08);
    background: rgba(255,255,255,.02);
    transition: border-color .18s;
  }
  .mave-cred:hover { border-color: rgba(255,255,255,.14); }
  .mave-cred-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
  }
  .mave-cred-provider {
    font-size: 13px;
    font-weight: 700;
    color: var(--ink-1);
    margin-bottom: 3px;
  }
  .mave-cred-meta {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    color: var(--ink-3);
    letter-spacing: .02em;
  }
  .mave-cred-actions {
    display: inline-flex;
    gap: 6px;
    flex-shrink: 0;
    flex-wrap: wrap;
  }
  .mave-cred-models {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed rgba(255,255,255,.06);
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 240px;
    overflow-y: auto;
  }
  .mave-cred-models::-webkit-scrollbar { width: 6px; }
  .mave-cred-models::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }
  .mave-cred-model-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    border-radius: 6px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    color: var(--ink-2);
    cursor: pointer;
    transition: background-color .15s;
  }
  .mave-cred-model-row:hover { background: rgba(255,255,255,.03); }
  .mave-cred-model-row input[type="checkbox"] {
    accent-color: var(--accent);
    cursor: pointer;
    flex-shrink: 0;
  }
  .mave-cred-model-row span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mave-cred-empty {
    padding: 16px;
    text-align: center;
    color: var(--ink-3);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
  }

  .mave-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
    border-radius: 12px;
    background: rgba(0,0,0,.15);
    border: 1px solid rgba(255,255,255,.05);
  }
  .mave-field { display: flex; flex-direction: column; gap: 6px; }
  .mave-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .mave-label a {
    color: var(--accent);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    text-transform: none;
    letter-spacing: 0;
  }
  .mave-label a:hover { text-decoration: underline; }
  .mave-input, .mave-select {
    width: 100%;
    padding: 10px 12px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: var(--ink-1);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
    transition: all .2s;
  }
  .mave-input:focus, .mave-select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
  }
  .mave-select {
    appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 20 20' fill='%23545E6E'><path d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'/></svg>");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 32px;
    cursor: pointer;
  }
  .mave-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 4px;
  }
`;


function SavedCredentialCard({ cred, onRequestDelete, onToggleModel, updating }) {
  const [expanded, setExpanded] = useState(false);
  const meta = getProviderMeta(cred.provider);
  const models = Array.isArray(cred.models) ? cred.models : [];

  return (
    <div className="mave-cred">
      <div className="mave-cred-head">
        <div style={{ minWidth: 0 }}>
          <div className="mave-cred-provider">{meta?.label || cred.provider}</div>
          <div className="mave-cred-meta">
            {models.length} model{models.length === 1 ? '' : 's'} in rotation
            {' · '}
            updated {new Date(cred.updatedAt).toLocaleDateString()}
          </div>
        </div>
        <div className="mave-cred-actions">
          <button
            type="button"
            className="settings-btn"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {expanded ? 'Hide models' : 'Manage models'}
          </button>
          <button
            type="button"
            className="settings-btn settings-btn-danger"
            onClick={() => onRequestDelete(cred.provider)}
          >
            <Trash2 size={11} />
            Disconnect
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mave-cred-models">
          {models.length === 0 && (
            <div className="mave-cred-empty">
              No models discovered. Re-save the key to retry discovery.
            </div>
          )}
          {models.map((m) => (
            <label key={m} className="mave-cred-model-row">
              <input
                type="checkbox"
                defaultChecked
                disabled={updating}
                onChange={(e) => onToggleModel(cred.provider, m, e.target.checked)}
              />
              <span title={m}>{m}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}


export default function MaveAiPanel() {
  const { data: credentials = [], isLoading: loadingSettings } = useAiSettings();
  const { data: providers = [], isLoading: loadingProviders } = useAiProviders();

  const saveMutation = useSaveAiCredential();
  const deleteMutation = useDeleteAiCredential();
  const updateModelsMutation = useUpdateAiModels();
  const testMutation = useTestAiKey();

  const [provider, setProvider] = useState('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const availableProviders = useMemo(
    () => (providers.length > 0 ? providers : AI_PROVIDERS),
    [providers]
  );

  const savedProviders = useMemo(
    () => new Set(credentials.map((c) => c.provider)),
    [credentials]
  );

  useEffect(() => {
    if (
      availableProviders.length > 0 &&
      !availableProviders.find((p) => p.id === provider)
    ) {
      setProvider(availableProviders[0].id);
    }
  }, [availableProviders, provider]);

  if (loadingSettings || loadingProviders) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)' }}>
        <Loader2 size={20} className="settings-spin" style={{ margin: '0 auto 12px' }} />
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
          Loading AI configuration…
        </span>
      </div>
    );
  }

  const selectedMeta = getProviderMeta(provider);
  const isProviderSaved = savedProviders.has(provider);

  const handleTest = async () => {
    setErrorMsg('');
    if (!apiKey.trim()) {
      setErrorMsg('Please enter an API key first.');
      return;
    }
    try {
      const result = await testMutation.mutateAsync({
        provider,
        apiKey: apiKey.trim(),
      });
      const count = result?.modelCount ?? 0;
      const sample = Array.isArray(result?.sampleModels) ? result.sampleModels : [];
      const suffix = count > 0
        ? ` · ${count} model${count === 1 ? '' : 's'} available`
        : '';
      toast.success(`Key is valid${suffix}.`, {
        description: sample.length > 0
          ? `e.g. ${sample.slice(0, 2).join(', ')}`
          : undefined,
      });
    } catch (err) {
      setErrorMsg(err?.message || 'Test failed. Check your key.');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!apiKey.trim()) {
      setErrorMsg('Please enter an API key.');
      return;
    }

    try {
      const result = await saveMutation.mutateAsync({
        provider,
        apiKey: apiKey.trim(),
        model: model.trim() || undefined,
      });

      const count = result?.credential?.models?.length ?? 0;
      const discovered = result?.discovered;
      const label = selectedMeta?.label || provider;

      if (discovered) {
        toast.success(`${label} connected · ${count} model${count === 1 ? '' : 's'} in rotation.`);
      } else {
        toast.warning(`${label} saved · discovery failed, using ${count} fallback model${count === 1 ? '' : 's'}.`, {
          description: result?.discoveryError || 'You can re-save to retry discovery.',
        });
      }

      setApiKey('');
      setModel('');
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to save key.');
    }
  };

  const handleDelete = async (targetProvider) => {
    setShowDeleteConfirm(null);
    try {
      await deleteMutation.mutateAsync(targetProvider);
      toast.success('API key removed.');
    } catch {
      toast.error('Failed to delete key.');
    }
  };

  const handleToggleModel = (prov, modelId, checked) => {
    const cred = credentials.find((c) => c.provider === prov);
    if (!cred) return;

    const current = Array.isArray(cred.models) ? cred.models : [];
    const next = checked
      ? (current.includes(modelId) ? current : [...current, modelId])
      : current.filter((m) => m !== modelId);

    if (next.length === 0) {
      toast.error('Keep at least one model in the rotation.');
      return;
    }

    updateModelsMutation.mutate(
      { provider: prov, models: next },
      { onError: (err) => toast.error(err?.message || 'Failed to update models.') }
    );
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="mave-panel">

        {}
        <div className="mave-hero">
          <div className="mave-hero-icon">
            <Sparkles size={20} />
          </div>
          <div className="mave-hero-text">
            <h3>Power up Mave AI</h3>
            <p>
              By default, Mave AI uses shared free-tier providers (which have hourly limits).
              Connect your own keys — the router rotates across every saved provider
              and, within each provider, across every model, so a single exhausted
              model doesn't end the conversation.
            </p>
          </div>
        </div>

        {}
        {credentials.length > 0 && (
          <div className="settings-section">
            <h4 className="settings-section-title">
              Saved providers ({credentials.length})
            </h4>
            <p className="settings-hint">
              The router tries the least-recently-used provider first.
              On a 429 or 5xx it slides to the next model — no interruption.
            </p>
            <div className="mave-cred-list">
              {credentials.map((cred) => (
                <SavedCredentialCard
                  key={cred.provider}
                  cred={cred}
                  onRequestDelete={setShowDeleteConfirm}
                  onToggleModel={handleToggleModel}
                  updating={updateModelsMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {}
        <div className="settings-section">
          <h4 className="settings-section-title">
            {isProviderSaved
              ? `Update ${selectedMeta?.label || provider} key`
              : 'Connect a provider'}
          </h4>

          {errorMsg && (
            <div className="settings-error" style={{ marginBottom: 12 }}>
              {errorMsg}
            </div>
          )}

          <form className="mave-form" onSubmit={handleSave}>

            <div className="mave-field">
              <label className="mave-label">
                <span>AI Provider</span>
              </label>
              <select
                className="mave-select"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                disabled={saveMutation.isPending}
              >
                {availableProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                    {p.freeTier ? ' (free tier available)' : ''}
                    {savedProviders.has(p.id) ? '  ✓ saved' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="mave-field">
              <label className="mave-label">
                <span>API Key</span>
                {selectedMeta?.keyDocsUrl && (
                  <a
                    href={selectedMeta.keyDocsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Get {selectedMeta.label} key <ExternalLink size={10} />
                  </a>
                )}
              </label>
              <input
                type="password"
                className="mave-input"
                placeholder={
                  selectedMeta
                    ? `e.g. ${selectedMeta.keyPrefix}…`
                    : 'Paste your key here'
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={saveMutation.isPending || testMutation.isPending}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="mave-field">
              <label className="mave-label">
                <span>Primary model (optional)</span>
              </label>
              <input
                type="text"
                className="mave-input"
                placeholder={
                  selectedMeta
                    ? `Default: ${selectedMeta.defaultModel}`
                    : 'Leave blank for default'
                }
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={saveMutation.isPending || testMutation.isPending}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="mave-actions">
              <button
                type="button"
                className="settings-btn"
                onClick={handleTest}
                disabled={
                  !apiKey.trim() ||
                  testMutation.isPending ||
                  saveMutation.isPending
                }
              >
                {testMutation.isPending ? (
                  <>
                    <Loader2 size={12} className="settings-spin" /> Testing…
                  </>
                ) : (
                  <>
                    <KeyRound size={12} /> Test key
                  </>
                )}
              </button>

              <div style={{ flex: 1 }} />

              <button
                type="submit"
                className="settings-btn settings-btn-primary"
                disabled={
                  !apiKey.trim() ||
                  saveMutation.isPending ||
                  testMutation.isPending
                }
              >
                {saveMutation.isPending
                  ? 'Saving…'
                  : isProviderSaved
                    ? 'Update key'
                    : 'Save key'}
              </button>
            </div>
          </form>
        </div>

      </div>

      <Alert
        isOpen={!!showDeleteConfirm}
        type="confirm"
        title="Disconnect provider?"
        message={
          showDeleteConfirm
            ? `Remove the ${getProviderMeta(showDeleteConfirm)?.label || showDeleteConfirm} key? The router will stop using it. You can re-add it later.`
            : ''
        }
        confirmText="Disconnect"
        cancelText="Cancel"
        onConfirm={() => handleDelete(showDeleteConfirm)}
        onCancel={() => setShowDeleteConfirm(null)}
      />
    </>
  );
}