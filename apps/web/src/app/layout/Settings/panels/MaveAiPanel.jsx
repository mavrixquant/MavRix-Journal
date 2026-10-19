// apps/web/src/app/layout/Settings/panels/MaveAiPanel.jsx
//
// BYOK configuration panel for Mave AI.
// Allows users to connect their own OpenAI, Anthropic, Groq, etc., API keys
// for unlimited, priority access to the assistant.

import { useState, useEffect } from 'react';
import {
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { AI_PROVIDERS, getProviderMeta } from '@mavrix/shared';

import {
  useAiSettings,
  useAiProviders,
  useSaveAiCredential,
  useDeleteAiCredential,
  useTestAiKey,
} from '@/shared/api/ai';
import Alert from '@/shared/components/Alert';

/* ------------------------------------------------------------------ */
/*  Local CSS                                                          */
/* ------------------------------------------------------------------ */
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

  .mave-status-card {
    padding: 14px 16px;
    border-radius: 12px;
    background: rgba(255,255,255,.03);
    border: 1px solid rgba(255,255,255,.08);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .mave-status-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .mave-status-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: #4ade80;
  }
  .mave-status-title.is-default {
    color: var(--ink-3);
  }
  .mave-status-desc {
    font-size: 13px;
    color: var(--ink-1);
    font-weight: 500;
  }
  .mave-status-date {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    color: var(--ink-3);
  }

  /* Form elements */
  .mave-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
    border-radius: 12px;
    background: rgba(0,0,0,.15);
    border: 1px solid rgba(255,255,255,.05);
  }
  .mave-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
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
  .mave-label a:hover {
    text-decoration: underline;
  }

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
/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function MaveAiPanel() {
  const { data: settings, isLoading: loadingSettings } = useAiSettings();
  const { data: providers = [], isLoading: loadingProviders } = useAiProviders();

  const saveMutation = useSaveAiCredential();
  const deleteMutation = useDeleteAiCredential();
  const testMutation = useTestAiKey();

  // Form state
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync initial provider
  useEffect(() => {
    if (providers.length > 0 && !providers.find(p => p.id === provider)) {
      setProvider(providers[0].id);
    }
  }, [providers, provider]);

  if (loadingSettings || loadingProviders) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)' }}>
        <Loader2 size={20} className="settings-spin" style={{ margin: '0 auto 12px' }} />
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>Loading AI configuration…</span>
      </div>
    );
  }

  const isConnected = !!settings;
  const currentMeta = getProviderMeta(settings?.provider || '');
  const selectedMeta = getProviderMeta(provider);

  const handleTest = async () => {
    setErrorMsg('');
    if (!apiKey.trim()) {
      setErrorMsg('Please enter an API key first.');
      return;
    }

    try {
      await testMutation.mutateAsync({
        provider,
        apiKey: apiKey.trim(),
        model: model.trim() || undefined,
      });
      toast.success('API key is valid!');
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
      await saveMutation.mutateAsync({
        provider,
        apiKey: apiKey.trim(),
        model: model.trim() || undefined,
      });
      toast.success('Mave AI connected to your API key.');
      setApiKey(''); // Clear input for security
      setModel('');
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to save key.');
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      await deleteMutation.mutateAsync();
      toast.success('API key removed. Falling back to default providers.');
    } catch (err) {
      toast.error('Failed to delete key.');
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="mave-panel">
        
        {/* Hero */}
        <div className="mave-hero">
          <div className="mave-hero-icon">
            <Sparkles size={20} />
          </div>
          <div className="mave-hero-text">
            <h3>Power up Mave AI</h3>
            <p>
              By default, Mave AI uses shared free-tier providers (which have hourly limits). 
              Connect your own OpenAI, Anthropic, or Groq API key for unlimited messages and priority speed.
            </p>
          </div>
        </div>

        {/* Status Card */}
        {isConnected ? (
          <div className="mave-status-card" style={{ borderColor: 'rgba(34,197,94,.3)', background: 'rgba(34,197,94,.05)' }}>
            <div className="mave-status-left">
              <span className="mave-status-title">
                <CheckCircle2 size={13} /> Connected to {currentMeta?.label || settings.provider}
              </span>
              <span className="mave-status-desc">
                Using model: <b style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{settings.model || currentMeta?.defaultModel}</b>
              </span>
              <span className="mave-status-date">
                Added {new Date(settings.updatedAt).toLocaleDateString()}
              </span>
            </div>
            <button
              type="button"
              className="settings-btn settings-btn-danger"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 size={12} />
              {deleteMutation.isPending ? 'Removing…' : 'Disconnect'}
            </button>
          </div>
        ) : (
          <div className="mave-status-card">
            <div className="mave-status-left">
              <span className="mave-status-title is-default">
                <AlertTriangle size={13} /> Using shared free-tier providers
              </span>
              <span className="mave-status-desc" style={{ color: 'var(--ink-2)' }}>
                You may hit hourly rate limits. Connect a key below to remove limits.
              </span>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="settings-section">
          <h4 className="settings-section-title">
            {isConnected ? 'Update API Key' : 'Connect Your API Key'}
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
                {AI_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} {p.freeTier ? '(Free tier available)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="mave-field">
              <label className="mave-label">
                <span>API Key</span>
                {selectedMeta?.keyDocsUrl && (
                  <a href={selectedMeta.keyDocsUrl} target="_blank" rel="noreferrer">
                    Get {selectedMeta.label} key <ExternalLink size={10} />
                  </a>
                )}
              </label>
              <input
                type="password"
                className="mave-input"
                placeholder={selectedMeta ? `e.g. ${selectedMeta.keyPrefix}...` : 'Paste your key here'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={saveMutation.isPending || testMutation.isPending}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="mave-field">
              <label className="mave-label">
                <span>Model Override (Optional)</span>
              </label>
              <input
                type="text"
                className="mave-input"
                placeholder={selectedMeta ? `Default: ${selectedMeta.defaultModel}` : 'Leave blank for default'}
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
                disabled={!apiKey.trim() || testMutation.isPending || saveMutation.isPending}
              >
                {testMutation.isPending ? (
                  <><Loader2 size={12} className="settings-spin" /> Testing…</>
                ) : (
                  <><KeyRound size={12} /> Test Key</>
                )}
              </button>

              <div style={{ flex: 1 }} />

              <button
                type="submit"
                className="settings-btn settings-btn-primary"
                disabled={!apiKey.trim() || saveMutation.isPending || testMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving…' : 'Save Key'}
              </button>
            </div>
          </form>
        </div>

      </div>

      <Alert
        isOpen={showDeleteConfirm}
        type="confirm"
        title="Disconnect API Key?"
        message={`Are you sure you want to remove your ${currentMeta?.label || 'API'} key? Mave AI will revert to using the shared free-tier providers.`}
        confirmText="Disconnect"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}