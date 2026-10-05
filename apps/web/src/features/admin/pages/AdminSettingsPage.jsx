// apps/web/src/features/admin/pages/AdminSettingsPage.jsx
//
// Site settings. Superadmin-only write — admins see the values but every
// input is disabled with a "Superadmin required" hint.

import { useState, useEffect, useMemo } from 'react';
import { Save, Lock, Settings2, Bell } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/app/providers/AuthProvider';
import { useAdminSettings, useAdminUpdateSettings } from '../api';

const CSS = `
  .asg-root { display: flex; flex-direction: column; gap: 18px; }

  .asg-card {
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
  }
  .asg-card-head {
    padding: 14px 18px 12px;
    border-bottom: 1px solid rgba(255,255,255,.05);
    display: flex; align-items: center; gap: 10px;
  }
  .asg-card-title {
    font-size: 13px; font-weight: 700;
    color: #E7E9EE;
  }
  .asg-card-note {
    margin-left: auto;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; letter-spacing: .06em;
    text-transform: uppercase; color: #F59E0B;
    opacity: .85;
    display: inline-flex; align-items: center; gap: 5px;
  }

  .asg-card-body {
    padding: 18px;
    display: flex; flex-direction: column; gap: 16px;
  }

  .asg-row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 16px;
    padding: 14px 16px;
    border-radius: 10px;
    background: rgba(255,255,255,.02);
    border: 1px solid rgba(255,255,255,.05);
  }
  .asg-row-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .asg-row-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 700;
    color: #E7E9EE;
    letter-spacing: .01em;
  }
  .asg-row-desc {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; line-height: 1.55;
    color: #8892A3;
  }

  /* Toggle switch */
  .asg-switch {
    position: relative;
    width: 42px; height: 24px;
    border-radius: 99px;
    background: rgba(255,255,255,.08);
    border: 1px solid rgba(255,255,255,.1);
    cursor: pointer;
    transition: background .18s, border-color .18s;
    flex-shrink: 0;
  }
  .asg-switch.on {
    background: linear-gradient(135deg, #F59E0B, #FDE68A);
    border-color: rgba(245,158,11,.6);
  }
  .asg-switch:disabled { opacity: .4; cursor: not-allowed; }
  .asg-switch-dot {
    position: absolute;
    top: 2px; left: 2px;
    width: 18px; height: 18px;
    border-radius: 50%;
    background: #E7E9EE;
    box-shadow: 0 2px 6px rgba(0,0,0,.4);
    transition: transform .18s cubic-bezier(.2,.8,.25,1);
  }
  .asg-switch.on .asg-switch-dot {
    background: #0D1117;
    transform: translateX(18px);
  }

  .asg-input, .asg-textarea {
    padding: 9px 12px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 9px;
    color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
    outline: none;
    box-sizing: border-box;
    transition: all .18s;
    min-width: 100px;
  }
  .asg-input.num { width: 130px; text-align: right; }
  .asg-textarea {
    min-height: 70px;
    resize: vertical;
    width: 100%;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
  }
  .asg-input:focus, .asg-textarea:focus {
    border-color: #F59E0B;
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }
  .asg-input:disabled, .asg-textarea:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .asg-foot {
    display: flex; justify-content: flex-end; gap: 10px;
    padding: 18px 0 0;
  }
  .asg-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 18px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 600;
    cursor: pointer;
    transition: all .18s;
  }
  .asg-btn:hover:not(:disabled) {
    color: #E7E9EE;
    border-color: rgba(255,255,255,.22);
    background: rgba(255,255,255,.06);
  }
  .asg-btn:disabled { opacity: .4; cursor: not-allowed; }
  .asg-btn-primary {
    background: linear-gradient(135deg, #F59E0B, #FDE68A);
    color: #0D1117;
    border: none;
    font-weight: 700;
    box-shadow: 0 10px 30px -8px rgba(245,158,11,.55);
  }
  .asg-btn-primary:hover:not(:disabled) { transform: translateY(-1px); }
  .asg-btn-primary:disabled {
    background: rgba(245,158,11,.35);
    color: rgba(13,17,23,.5);
    box-shadow: none;
    transform: none;
  }

  .asg-loading {
    padding: 60px 24px; text-align: center;
    color: #8892A3; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
  }
`;

/* ---------- Sub-component: toggle ---------- */
function Toggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      className={`asg-switch${value ? ' on' : ''}`}
      onClick={() => onChange(!value)}
      disabled={disabled}
      aria-pressed={value}
    >
      <span className="asg-switch-dot" />
    </button>
  );
}

/* ---------- Sub-component: numeric input ---------- */
function NumberField({ value, onChange, disabled, min = 0, max = 1_000_000 }) {
  return (
    <input
      type="number"
      className="asg-input num"
      value={value}
      min={min}
      max={max}
      onChange={(e) => {
        const n = Number(e.target.value);
        onChange(Number.isFinite(n) ? n : 0);
      }}
      disabled={disabled}
    />
  );
}

export default function AdminSettingsPage() {
  const { user: me } = useAuth();
  const isSuper = me?.role === 'superadmin';

  const { data: server, isLoading } = useAdminSettings();
  const [form, setForm] = useState(null);
  // Hydrate form from server on load / after every successful save
  useEffect(() => {
    if (server) {
      setForm({ ...server });
    }
  }, [server]);

  const updateMutation = useAdminUpdateSettings();

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  // Compute a patch — only changed keys
  const patch = useMemo(() => {
    if (!form || !server) return {};
    const diff = {};
    for (const k of Object.keys(form)) {
      if (JSON.stringify(form[k]) !== JSON.stringify(server[k])) {
        diff[k] = form[k];
      }
    }
    return diff;
  }, [form, server]);

  const hasChanges = Object.keys(patch).length > 0;

  const handleSave = async () => {
    if (!hasChanges) { toast.info('No changes.'); return; }
    try {
      await updateMutation.mutateAsync(patch);
      toast.success(`Saved ${Object.keys(patch).length} setting${Object.keys(patch).length === 1 ? '' : 's'}`);
    } catch (err) {
      toast.error(err?.message || 'Save failed');
    }
  };

  const handleReset = () => {
    if (server) { setForm({ ...server }); }
  };

  if (isLoading || !form) {
    return <div className="asg-loading">Loading settings…</div>;
  }

  const disabled = !isSuper || updateMutation.isPending;

  return (
    <>
      <style>{CSS}</style>
      <div className="asg-root">
        <div className="admin-ph">
          <div className="admin-ph-left">
            <span className="admin-ph-eyebrow">System</span>
            <h1 className="admin-ph-title">Site settings</h1>
            <p className="admin-ph-sub">
              Runtime configuration · {isSuper
                ? 'edits take effect immediately'
                : 'read-only — superadmin required to save'}
            </p>
          </div>
        </div>

        {/* ---------- Access control ---------- */}
        <div className="asg-card">
          <div className="asg-card-head">
            <Settings2 size={14} style={{ color: '#F59E0B' }} />
            <span className="asg-card-title">Access control</span>
            {!isSuper && (
              <span className="asg-card-note">
                <Lock size={10} /> superadmin only
              </span>
            )}
          </div>
          <div className="asg-card-body">
            <div className="asg-row">
              <div className="asg-row-text">
                <span className="asg-row-label">signupsEnabled</span>
                <span className="asg-row-desc">
                  Allow new user registration. When off, POST /api/auth/signup
                  returns 403 and the signup page shows a maintenance notice.
                </span>
              </div>
              <Toggle
                value={!!form.signupsEnabled}
                onChange={(v) => setField('signupsEnabled', v)}
                disabled={disabled}
              />
            </div>

            <div className="asg-row">
              <div className="asg-row-text">
                <span className="asg-row-label">requireEmailVerification</span>
                <span className="asg-row-desc">
                  Block app access until email is verified. When off, users can
                  jump straight to /journal after signup.
                </span>
              </div>
              <Toggle
                value={!!form.requireEmailVerification}
                onChange={(v) => setField('requireEmailVerification', v)}
                disabled={disabled}
              />
            </div>

            <div className="asg-row">
              <div className="asg-row-text">
                <span className="asg-row-label">maintenanceMode</span>
                <span className="asg-row-desc">
                  Show a maintenance banner site-wide. Read-only users are
                  blocked; admins keep access.
                </span>
              </div>
              <Toggle
                value={!!form.maintenanceMode}
                onChange={(v) => setField('maintenanceMode', v)}
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        {/* ---------- Limits ---------- */}
        <div className="asg-card">
          <div className="asg-card-head">
            <span className="asg-card-title">Limits</span>
          </div>
          <div className="asg-card-body">
            <div className="asg-row">
              <div className="asg-row-text">
                <span className="asg-row-label">maxAccountsPerUser</span>
                <span className="asg-row-desc">
                  Ceiling on trading accounts a single user can create.
                  Default: 10.
                </span>
              </div>
              <NumberField
                value={form.maxAccountsPerUser}
                onChange={(v) => setField('maxAccountsPerUser', v)}
                disabled={disabled}
                min={1}
                max={1000}
              />
            </div>

            <div className="asg-row">
              <div className="asg-row-text">
                <span className="asg-row-label">maxTradesPerAccount</span>
                <span className="asg-row-desc">
                  Ceiling on rows per account (used to reject bulk uploads
                  that would blow past this). Default: 10000.
                </span>
              </div>
              <NumberField
                value={form.maxTradesPerAccount}
                onChange={(v) => setField('maxTradesPerAccount', v)}
                disabled={disabled}
                min={10}
                max={1_000_000}
              />
            </div>
          </div>
        </div>

        {/* ---------- Announcement ---------- */}
        <div className="asg-card">
          <div className="asg-card-head">
            <Bell size={14} style={{ color: '#F59E0B' }} />
            <span className="asg-card-title">Announcement banner</span>
          </div>
          <div className="asg-card-body">
            <div className="asg-row" style={{ gridTemplateColumns: '1fr' }}>
              <div className="asg-row-text">
                <span className="asg-row-label">announcementBanner</span>
                <span className="asg-row-desc">
                  Optional banner text shown to all users. Leave empty to hide.
                  Supports plain text only.
                </span>
              </div>
              <textarea
                className="asg-textarea"
                value={form.announcementBanner || ''}
                onChange={(e) => setField('announcementBanner', e.target.value)}
                placeholder="e.g. Scheduled maintenance on Saturday 02:00–04:00 UTC"
                disabled={disabled}
                maxLength={500}
              />
            </div>
          </div>
        </div>

        {/* ---------- Footer ---------- */}
        <div className="asg-foot">
          <button
            type="button"
            className="asg-btn"
            onClick={handleReset}
            disabled={!hasChanges || updateMutation.isPending}
          >
            Reset
          </button>
          <button
            type="button"
            className="asg-btn asg-btn-primary"
            onClick={handleSave}
            disabled={!hasChanges || disabled}
          >
            <Save size={12} />
            {updateMutation.isPending ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>
    </>
  );
}