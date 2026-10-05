// apps/web/src/features/admin/pages/AdminGexPage.jsx
//
// Admin GEX upload page — /admin/gex
//
// Flow:
//   1. Pick a date (defaults to today IST)
//   2. Paste JSON into the textarea (or load the built-in example)
//   3. Convert → shows preview (counts + pipe-string)
//   4. Save → POST /api/admin/gex
//        - 200 → toast, clear form, refresh list
//        - 409 → overwrite confirmation modal → re-POST with ?overwrite=true
//
// Editing the JSON textarea clears the preview, forcing re-convert.
// The server re-serializes `levels` and rejects if `converted` doesn't
// match — so a stale preview can never be saved silently.

import { useState, useCallback } from 'react';
import {
  RefreshCw, Trash2, CheckCircle2, AlertTriangle,
  Clipboard, ClipboardCheck, Layers, Save, Wand2,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/app/providers/AuthProvider';
import {
  useAdminGexDays,
  useAdminUpsertGex,
  useAdminDeleteGex,
} from '@/shared/api/gex';
import Alert from '@/shared/components/Alert';
import { convertGexJson, GEX_DEFAULT_TIMEZONE } from '@mavrix/shared';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** "YYYY-MM-DD" for today, in IST (Asia/Kolkata). */
function todayIST() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: GEX_DEFAULT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

/** "Oct 5, 2026" from "2026-10-05". */
function formatDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** "5 min ago" from an ISO timestamp. */
function relativeTime(iso) {
  if (!iso) return '—';
  const delta = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(delta / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

/* ------------------------------------------------------------------ */
/*  Scoped CSS                                                         */
/* ------------------------------------------------------------------ */

const CSS = `
  .gexp-root { display: flex; flex-direction: column; gap: 20px; }

  .gexp-top {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    align-items: start;
  }
  @media (max-width: 1100px) {
    .gexp-top { grid-template-columns: 1fr; }
  }

  /* ---------- Card shell ---------- */
  .gexp-card {
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .gexp-card-head {
    padding: 14px 18px 12px;
    border-bottom: 1px solid rgba(255,255,255,.05);
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .gexp-card-title { font-size: 13px; font-weight: 700; color: #E7E9EE; letter-spacing: -.005em; }
  .gexp-card-sub {
    margin-left: auto;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #F59E0B;
    opacity: .85;
  }
  .gexp-card-body { padding: 18px; display: flex; flex-direction: column; gap: 16px; }

  /* ---------- Form fields ---------- */
  .gexp-field { display: flex; flex-direction: column; gap: 6px; }
  .gexp-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: #545E6E;
  }
  .gexp-label-hint {
    font-weight: 500;
    letter-spacing: .02em;
    text-transform: none;
    color: #8892A3;
  }

  .gexp-input {
    width: 100%;
    padding: 9px 12px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
    color-scheme: dark;
    transition: all .18s;
  }
  .gexp-input:hover { border-color: rgba(255,255,255,.2); }
  .gexp-input:focus {
    border-color: #F59E0B;
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }

  .gexp-textarea {
    width: 100%;
    min-height: 260px;
    padding: 12px 14px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.6;
    outline: none;
    box-sizing: border-box;
    resize: vertical;
    transition: all .18s;
  }
  .gexp-textarea:hover { border-color: rgba(255,255,255,.2); }
  .gexp-textarea:focus {
    border-color: #F59E0B;
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }
  .gexp-textarea::placeholder { color: #545E6E; }

  /* ---------- Buttons ---------- */
  .gexp-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .gexp-row-end { justify-content: flex-end; }
  .gexp-spacer { flex: 1; }

  .gexp-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
  }
  .gexp-btn:hover:not(:disabled) {
    color: #E7E9EE;
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
    transform: translateY(-1px);
  }
  .gexp-btn:active:not(:disabled) { transform: translateY(0) scale(.98); }
  .gexp-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }
  .gexp-btn:focus-visible {
    outline: none;
    border-color: #F59E0B;
    box-shadow: 0 0 0 3px rgba(245,158,11,.18);
  }

  .gexp-btn-primary {
    border: none;
    background: linear-gradient(135deg, #F59E0B, #FDE68A);
    color: #0D1117;
    font-weight: 700;
    box-shadow:
      0 10px 30px -8px rgba(245,158,11,.55),
      inset 0 1px 0 rgba(255,255,255,.4);
    transition: transform .25s cubic-bezier(.175,.885,.32,1.275), box-shadow .3s;
  }
  .gexp-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 16px 42px -10px rgba(245,158,11,.7), inset 0 1px 0 rgba(255,255,255,.5);
  }
  .gexp-btn-primary:disabled {
    background: linear-gradient(135deg, rgba(245,158,11,.32), rgba(253,230,138,.28));
    color: rgba(13,17,23,.55);
    box-shadow: none;
  }

  /* ---------- Preview ---------- */
  .gexp-empty-preview {
    padding: 60px 20px;
    text-align: center;
    border: 1px dashed rgba(255,255,255,.10);
    border-radius: 12px;
    background: rgba(255,255,255,.015);
    color: #545E6E;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.7;
  }

  .gexp-banner {
    display: flex;
    gap: 10px;
    padding: 11px 14px;
    border-radius: 10px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    line-height: 1.6;
    align-items: flex-start;
  }
  .gexp-banner.ok {
    background: rgba(34,197,94,.08);
    border: 1px solid rgba(34,197,94,.28);
    color: #86efac;
  }
  .gexp-banner.err {
    background: rgba(239,68,68,.08);
    border: 1px solid rgba(239,68,68,.28);
    color: #fca5a5;
  }
  .gexp-banner svg { flex-shrink: 0; margin-top: 2px; }

  .gexp-counts {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .gexp-count {
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(255,255,255,.025);
    border: 1px solid rgba(255,255,255,.05);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .gexp-count-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: #545E6E;
  }
  .gexp-count-value {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 18px;
    font-weight: 700;
    color: #E7E9EE;
    letter-spacing: -.01em;
    line-height: 1.1;
  }
  .gexp-count-value.is-bl  { color: #F59E0B; }
  .gexp-count-value.is-gex { color: #60A5FA; }

  .gexp-output-wrap {
    position: relative;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.08);
    background: rgba(10,13,19,.6);
    overflow: hidden;
  }
  .gexp-output-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: rgba(0,0,0,.22);
    border-bottom: 1px solid rgba(255,255,255,.05);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: #545E6E;
  }
  .gexp-output-copy {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 9px;
    border-radius: 7px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .04em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all .18s;
  }
  .gexp-output-copy:hover {
    color: #F59E0B;
    border-color: rgba(245,158,11,.35);
    background: rgba(245,158,11,.06);
  }
  .gexp-output-copy.is-copied {
    color: #4ade80;
    border-color: rgba(34,197,94,.35);
    background: rgba(34,197,94,.06);
  }
  .gexp-output-body {
    padding: 12px 14px;
    max-height: 220px;
    overflow-y: auto;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    line-height: 1.65;
    color: #E7E9EE;
    word-break: break-all;
    white-space: pre-wrap;
  }
  .gexp-output-body::-webkit-scrollbar { width: 8px; }
  .gexp-output-body::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08); border-radius: 99px;
  }

  /* ---------- Existing days table ---------- */
  .gexp-table { width: 100%; border-collapse: collapse; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 12px; }
  .gexp-th {
    padding: 11px 14px;
    text-align: left;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: #8892A3;
    background: rgba(0,0,0,.2);
    border-bottom: 1px solid rgba(255,255,255,.08);
    white-space: nowrap;
  }
  .gexp-th.right { text-align: right; }
  .gexp-tr { transition: background-color .12s; }
  .gexp-tr:hover { background: rgba(255,255,255,.025); }
  .gexp-td {
    padding: 11px 14px;
    border-bottom: 1px solid rgba(255,255,255,.04);
    color: #E7E9EE;
    vertical-align: middle;
  }
  .gexp-td.muted { color: #8892A3; }
  .gexp-td.right { text-align: right; }
  .gexp-td.date { font-weight: 700; }

  .gexp-pill {
    display: inline-flex;
    padding: 2px 8px;
    border-radius: 99px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .04em;
    border: 1px solid;
  }
  .gexp-pill.bl  { color: #F59E0B; background: rgba(245,158,11,.08);  border-color: rgba(245,158,11,.30); }
  .gexp-pill.gex { color: #60A5FA; background: rgba(96,165,250,.08); border-color: rgba(96,165,250,.30); }

  .gexp-btn-icon {
    width: 26px; height: 26px; padding: 0;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 7px;
    border: 1px solid rgba(255,255,255,.09);
    background: rgba(255,255,255,.025);
    color: #8892A3; cursor: pointer;
    transition: all .18s;
  }
  .gexp-btn-icon:hover:not(:disabled) {
    color: #f87171;
    border-color: rgba(239,68,68,.42);
    background: rgba(239,68,68,.08);
  }
  .gexp-btn-icon:disabled { opacity: .35; cursor: not-allowed; }

  .gexp-empty, .gexp-loading {
    padding: 60px 24px;
    text-align: center;
    color: #545E6E;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
  }
  .gexp-loading { color: #8892A3; }
`;

/* ------------------------------------------------------------------ */
/*  Example JSON                                                       */
/* ------------------------------------------------------------------ */

const EXAMPLE_JSON = JSON.stringify(
  [
    {
      AnnType: 8,
      Name: 'BL20260901_NQ1!_1000_VFRQ',
      Y1: 29104.19,
      ShowPrice: true,
      TextMsg: 'BL 1 (NQ1!)',
    },
    {
      AnnType: 8,
      Name: 'GEX20260901_NQ1!_1000_VFRQ',
      Y1: 29500.0,
      ShowPrice: true,
      TextMsg: 'Call Resistance 0DTE / Gamma Wall (NQ1!)',
    },
  ],
  null,
  2
);

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminGexPage() {
  const { user: me } = useAuth();
  const isSuper = me?.role === 'superadmin';

  // ---- Upload form state ----
  const [date, setDate] = useState(todayIST);
  const [jsonInput, setJsonInput] = useState('');
  const [preview, setPreview] = useState(null);   // convert result or null
  const [copied, setCopied] = useState(false);

  // ---- Modals ----
  const [overwritePrompt, setOverwritePrompt] = useState(null);   // { existing } | null
  const [deleteTarget, setDeleteTarget] = useState(null);         // row | null

  // ---- Data ----
  const { data: days = [], isLoading } = useAdminGexDays();
  const upsert = useAdminUpsertGex();
  const remove = useAdminDeleteGex();

  // Live-derived preview placeholder (for the info banner text)
  const hasPreview = !!preview?.ok;

  /* -------- Convert -------- */
  const handleConvert = useCallback(() => {
    const result = convertGexJson(jsonInput);
    setPreview(result);
    if (!result.ok) {
      toast.error(result.errors?.[0] || 'Conversion failed');
    }
  }, [jsonInput]);

  /* -------- Textarea edits invalidate the previous preview -------- */
  const handleJsonChange = useCallback((value) => {
    setJsonInput(value);
    if (preview) setPreview(null);   // force re-convert before save
  }, [preview]);

  /* -------- Save -------- */
  const runSave = useCallback(
    async (overwrite) => {
      const payload = {
        date,
        levels: preview.levels,
        converted: preview.converted,
        sourceTimezone: GEX_DEFAULT_TIMEZONE,
        overwrite,
      };
      return upsert.mutateAsync(payload);
    },
    [date, preview, upsert]
  );

  const handleSave = useCallback(async () => {
    if (!hasPreview) return;
    try {
      await runSave(false);
      toast.success(`GEX saved for ${formatDate(date)}`);
      setJsonInput('');
      setPreview(null);
    } catch (err) {
      if (err.status === 409) {
        setOverwritePrompt({ existing: err.body?.details?.existing || null });
      } else {
        toast.error(err.message || 'Save failed');
      }
    }
  }, [hasPreview, date, runSave]);

  const handleConfirmOverwrite = useCallback(async () => {
    try {
      await runSave(true);
      toast.success(`GEX overwritten for ${formatDate(date)}`);
      setOverwritePrompt(null);
      setJsonInput('');
      setPreview(null);
    } catch (err) {
      toast.error(err.message || 'Overwrite failed');
      setOverwritePrompt(null);
    }
  }, [date, runSave]);

  /* -------- Delete -------- */
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget.date);
      toast.success(`Deleted GEX for ${formatDate(deleteTarget.date)}`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || 'Delete failed');
      setDeleteTarget(null);
    }
  }, [deleteTarget, remove]);

  /* -------- Copy converted string -------- */
  const handleCopyConverted = useCallback(async () => {
    if (!preview?.converted) return;
    try {
      await navigator.clipboard.writeText(preview.converted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy failed');
    }
  }, [preview]);

  /* -------- Derived -------- */
  const canSave = hasPreview && !!date && !upsert.isPending;
  const counts = preview?.counts;

  return (
    <>
      <style>{CSS}</style>
      <div className="gexp-root">

        {/* ---------- Header ---------- */}
        <div className="admin-ph">
          <div className="admin-ph-left">
            <span className="admin-ph-eyebrow">Operations</span>
            <h1 className="admin-ph-title">GEX Levels</h1>
            <p className="admin-ph-sub">
              Upload daily gamma-exposure levels · users see these on Utilities → GEX
            </p>
          </div>
        </div>

        {/* ---------- Upload + Preview ---------- */}
        <div className="gexp-top">

          {/* ---------- Input card ---------- */}
          <div className="gexp-card">
            <div className="gexp-card-head">
              <Wand2 size={14} style={{ color: '#F59E0B' }} />
              <span className="gexp-card-title">Upload</span>
            </div>
            <div className="gexp-card-body">

              <div className="gexp-field">
                <label className="gexp-label">
                  Date
                  <span className="gexp-label-hint">IST · {GEX_DEFAULT_TIMEZONE}</span>
                </label>
                <input
                  type="date"
                  className="gexp-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="gexp-field">
                <label className="gexp-label">
                  Raw JSON
                  <span className="gexp-label-hint">array of {'{ Name, Y1, TextMsg, ShowPrice }'}</span>
                </label>
                <textarea
                  className="gexp-textarea"
                  spellCheck={false}
                  placeholder='[\n  {\n    "Name": "BL20260901_NQ1!_1000_VFRQ",\n    "Y1": 29104.19,\n    "TextMsg": "BL 1 (NQ1!)",\n    "ShowPrice": true\n  }\n]'
                  value={jsonInput}
                  onChange={(e) => handleJsonChange(e.target.value)}
                />
              </div>

              <div className="gexp-row">
                <button
                  type="button"
                  className="gexp-btn"
                  onClick={() => handleJsonChange(EXAMPLE_JSON)}
                  title="Fill the textarea with a small sample"
                >
                  Load Example
                </button>

                <button
                  type="button"
                  className="gexp-btn"
                  onClick={() => { handleJsonChange(''); setPreview(null); }}
                  disabled={!jsonInput && !preview}
                >
                  Clear
                </button>

                <span className="gexp-spacer" />

                <button
                  type="button"
                  className="gexp-btn gexp-btn-primary"
                  onClick={handleConvert}
                  disabled={!jsonInput.trim()}
                >
                  <RefreshCw size={11} />
                  Convert
                </button>
              </div>
            </div>
          </div>

          {/* ---------- Preview card ---------- */}
          <div className="gexp-card">
            <div className="gexp-card-head">
              <Layers size={14} style={{ color: '#F59E0B' }} />
              <span className="gexp-card-title">Preview</span>
              {preview && !preview.ok && (
                <span className="gexp-card-sub" style={{ color: '#f87171' }}>Invalid</span>
              )}
              {hasPreview && (
                <span className="gexp-card-sub">Ready to save</span>
              )}
            </div>
            <div className="gexp-card-body">

              {!preview && (
                <div className="gexp-empty-preview">
                  Paste JSON and click <b style={{ color: '#F59E0B' }}>Convert</b> to preview the levels and the TradingView pipe-string.
                </div>
              )}

              {preview && !preview.ok && (
                <div className="gexp-banner err">
                  <AlertTriangle size={14} />
                  <span>
                    <b>Conversion failed.</b>{' '}
                    {preview.errors?.[0] || 'Unknown error.'}
                  </span>
                </div>
              )}

              {hasPreview && (
                <>
                  <div className="gexp-banner ok">
                    <CheckCircle2 size={14} />
                    <span>
                      <b>{counts.total}</b> level{counts.total === 1 ? '' : 's'} ready to upload
                      for <b>{formatDate(date)}</b>.
                    </span>
                  </div>

                  <div className="gexp-counts">
                    <div className="gexp-count">
                      <span className="gexp-count-label">Total</span>
                      <span className="gexp-count-value">{counts.total}</span>
                    </div>
                    <div className="gexp-count">
                      <span className="gexp-count-label">BL</span>
                      <span className="gexp-count-value is-bl">{counts.bl}</span>
                    </div>
                    <div className="gexp-count">
                      <span className="gexp-count-label">GEX</span>
                      <span className="gexp-count-value is-gex">{counts.gex}</span>
                    </div>
                    <div className="gexp-count">
                      <span className="gexp-count-label">Other</span>
                      <span className="gexp-count-value">{counts.other}</span>
                    </div>
                  </div>

                  <div className="gexp-output-wrap">
                    <div className="gexp-output-head">
                      <span>TradingView string</span>
                      <button
                        type="button"
                        className={`gexp-output-copy ${copied ? 'is-copied' : ''}`}
                        onClick={handleCopyConverted}
                      >
                        {copied
                          ? <><ClipboardCheck size={10} /> Copied</>
                          : <><Clipboard size={10} /> Copy</>
                        }
                      </button>
                    </div>
                    <div className="gexp-output-body">{preview.converted}</div>
                  </div>

                  <div className="gexp-row gexp-row-end">
                    <button
                      type="button"
                      className="gexp-btn gexp-btn-primary"
                      onClick={handleSave}
                      disabled={!canSave}
                    >
                      <Save size={11} />
                      {upsert.isPending ? 'Saving…' : 'Save to Database'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ---------- Existing days ---------- */}
        <div className="gexp-card">
          <div className="gexp-card-head">
            <span className="gexp-card-title">Uploaded Days</span>
            <span className="gexp-card-sub">
              {days.length} {days.length === 1 ? 'day' : 'days'}
            </span>
          </div>
          <div className="gexp-card-body" style={{ padding: 0 }}>
            {isLoading ? (
              <div className="gexp-loading">Loading days…</div>
            ) : days.length === 0 ? (
              <div className="gexp-empty">No GEX days uploaded yet. Upload one above.</div>
            ) : (
              <table className="gexp-table">
                <thead>
                  <tr>
                    <th className="gexp-th">Date</th>
                    <th className="gexp-th">Levels</th>
                    <th className="gexp-th">BL</th>
                    <th className="gexp-th">GEX</th>
                    <th className="gexp-th">Uploaded</th>
                    <th className="gexp-th right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((d) => (
                    <tr key={d.date} className="gexp-tr">
                      <td className="gexp-td date">{formatDate(d.date)}</td>
                      <td className="gexp-td muted">{d.levelCount}</td>
                      <td className="gexp-td">
                        <span className="gexp-pill bl">{d.blCount}</span>
                      </td>
                      <td className="gexp-td">
                        <span className="gexp-pill gex">{d.gexCount}</span>
                      </td>
                      <td className="gexp-td muted">{relativeTime(d.uploadedAt)}</td>
                      <td className="gexp-td right">
                        <button
                          type="button"
                          className="gexp-btn-icon"
                          disabled={!isSuper || remove.isPending}
                          title={isSuper ? 'Delete this day' : 'Superadmin only'}
                          onClick={() => setDeleteTarget(d)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Overwrite confirmation ---------- */}
      <Alert
        isOpen={!!overwritePrompt}
        type="confirm"
        title="GEX data already exists"
        message={
          overwritePrompt
            ? `GEX data for ${formatDate(date)} already exists` +
              (overwritePrompt.existing
                ? ` (${overwritePrompt.existing.levelCount} levels).`
                : '.') +
              ' Overwrite it with the new upload?'
            : ''
        }
        confirmText="Overwrite"
        cancelText="Cancel"
        onConfirm={handleConfirmOverwrite}
        onCancel={() => setOverwritePrompt(null)}
      />

      {/* ---------- Delete confirmation ---------- */}
      <Alert
        isOpen={!!deleteTarget}
        type="confirm"
        title="Delete GEX day?"
        message={
          deleteTarget
            ? `Delete all GEX levels for ${formatDate(deleteTarget.date)}? ` +
              `Users will no longer see this day. This cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}