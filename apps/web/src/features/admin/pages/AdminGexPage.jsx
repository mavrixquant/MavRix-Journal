import { useState, useCallback, useMemo } from 'react';
import {
  RefreshCw, Trash2, CheckCircle2, AlertTriangle,
  Clipboard, ClipboardCheck, Layers, Save, Wand2,
  Download, FileJson, FileText, FileSpreadsheet, X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/app/providers/AuthProvider';
import {
  useAdminGexDays,
  useAdminUpsertGex,
  useAdminDeleteGex,
  downloadAdminGex,
} from '@/shared/api/gex';
import Portal from '@/shared/components/Portal';
import { useAdminPageHeader } from '../AdminPageHeader';
import Alert from '@/shared/components/Alert';
import {
  convertGexJson,
  GEX_DEFAULT_TIMEZONE,
  GEX_SYMBOLS,
  GEX_SYMBOL_META,
  DEFAULT_GEX_SYMBOL,
} from '@mavrix/shared';

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

function formatDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

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

const CSS = `
  .gexp-root { display: flex; flex-direction: column; gap: 20px; }

  .gexp-symbar {
    display: flex;
    gap: 10px;
    padding: 6px;
    border-radius: 14px;
    background: rgba(0,0,0,.32);
    border: 1px solid rgba(255,255,255,.06);
  }
  .gexp-sym {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid transparent;
    background: transparent;
    color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    text-align: left;
  }
  .gexp-sym:hover:not(.is-active) {
    color: #E7E9EE;
    background: rgba(255,255,255,.04);
  }
  .gexp-sym.is-active {
    background: color-mix(in srgb, var(--sym-color) 12%, transparent);
    border-color: color-mix(in srgb, var(--sym-color) 45%, transparent);
    color: #FFFFFF;
    box-shadow: 0 0 26px -10px color-mix(in srgb, var(--sym-color) 60%, transparent);
  }
  .gexp-sym-dot {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    background: var(--sym-color);
    box-shadow: 0 0 10px var(--sym-color);
    flex-shrink: 0;
  }
  .gexp-sym-code {
    font-weight: 700;
    font-size: 14px;
    letter-spacing: .04em;
  }
  .gexp-sym-name {
    font-size: 11px;
    color: #545E6E;
    font-weight: 500;
    letter-spacing: .02em;
  }
  .gexp-sym.is-active .gexp-sym-name {
    color: rgba(255,255,255,.6);
  }

  .gexp-top {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    align-items: start;
  }
  @media (max-width: 1100px) { .gexp-top { grid-template-columns: 1fr; } }

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
    display: flex; align-items: center; gap: 10px;
    flex-shrink: 0;
  }
  .gexp-card-title { font-size: 13px; font-weight: 700; color: #E7E9EE; letter-spacing: -.005em; }
  .gexp-card-sub {
    margin-left: auto;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 600;
    letter-spacing: .06em; text-transform: uppercase;
    color: var(--accent); opacity: .85;
  }
  .gexp-card-body { padding: 18px; display: flex; flex-direction: column; gap: 16px; }

  .gexp-field { display: flex; flex-direction: column; gap: 6px; }
  .gexp-label {
    display: flex; align-items: center; justify-content: space-between;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: #545E6E;
  }
  .gexp-label-hint {
    font-weight: 500; letter-spacing: .02em;
    text-transform: none; color: #8892A3;
  }
  .gexp-label-hint.is-strong {
    color: var(--accent);
    font-weight: 700;
  }

  .gexp-input {
    width: 100%; padding: 9px 12px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px; color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 13px; outline: none;
    box-sizing: border-box; color-scheme: dark;
    transition: all .18s;
  }
  .gexp-input:hover { border-color: rgba(255,255,255,.2); }
  .gexp-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
  }

  .gexp-textarea {
    width: 100%; min-height: 260px;
    padding: 12px 14px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px; color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px; line-height: 1.6;
    outline: none; box-sizing: border-box;
    resize: vertical; transition: all .18s;
  }
  .gexp-textarea:hover { border-color: rgba(255,255,255,.2); }
  .gexp-textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
  }
  .gexp-textarea::placeholder { color: #545E6E; }

  .gexp-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .gexp-row-end { justify-content: flex-end; }
  .gexp-spacer { flex: 1; }

  .gexp-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 14px; border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03); color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 600; letter-spacing: .02em;
    cursor: pointer; transition: all .22s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
  }
  .gexp-btn:hover:not(:disabled) {
    color: #E7E9EE; background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2); transform: translateY(-1px);
  }
  .gexp-btn:active:not(:disabled) { transform: translateY(0) scale(.98); }
  .gexp-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }

  .gexp-btn-primary {
    border: none;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117; font-weight: 700;
    box-shadow:
      0 10px 30px -8px color-mix(in srgb, var(--accent) 55%, transparent),
      inset 0 1px 0 rgba(255,255,255,.4);
  }
  .gexp-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow:
      0 16px 42px -10px color-mix(in srgb, var(--accent) 70%, transparent),
      inset 0 1px 0 rgba(255,255,255,.5);
  }
  .gexp-btn-primary:disabled {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 32%, transparent),
      color-mix(in srgb, var(--accent-2) 28%, transparent)
    );
    color: rgba(13,17,23,.55); box-shadow: none;
  }

  .gexp-empty-preview {
    padding: 60px 20px; text-align: center;
    border: 1px dashed rgba(255,255,255,.10);
    border-radius: 12px;
    background: rgba(255,255,255,.015);
    color: #545E6E;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px; line-height: 1.7;
  }

  .gexp-banner {
    display: flex; gap: 10px;
    padding: 11px 14px; border-radius: 10px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; line-height: 1.6;
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
    padding: 10px 12px; border-radius: 10px;
    background: rgba(255,255,255,.025);
    border: 1px solid rgba(255,255,255,.05);
    display: flex; flex-direction: column; gap: 2px;
  }
  .gexp-count-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px; font-weight: 700;
    letter-spacing: .14em; text-transform: uppercase;
    color: #545E6E;
  }
  .gexp-count-value {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 18px; font-weight: 700;
    color: #E7E9EE; letter-spacing: -.01em; line-height: 1.1;
  }
  .gexp-count-value.is-bl  { color: var(--accent); }
  .gexp-count-value.is-gex { color: #60A5FA; }

  .gexp-output-wrap {
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.08);
    background: rgba(10,13,19,.6);
    overflow: hidden;
  }
  .gexp-output-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px;
    background: rgba(0,0,0,.22);
    border-bottom: 1px solid rgba(255,255,255,.05);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700;
    letter-spacing: .12em; text-transform: uppercase;
    color: #545E6E;
  }
  .gexp-output-copy {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 9px; border-radius: 7px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03); color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 600; letter-spacing: .04em;
    text-transform: uppercase; cursor: pointer;
    transition: all .18s;
  }
  .gexp-output-copy:hover {
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 35%, transparent);
    background: color-mix(in srgb, var(--accent) 6%, transparent);
  }
  .gexp-output-copy.is-copied {
    color: #4ade80;
    border-color: rgba(34,197,94,.35);
    background: rgba(34,197,94,.06);
  }
  .gexp-output-body {
    padding: 12px 14px; max-height: 220px;
    overflow-y: auto;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; line-height: 1.65;
    color: #E7E9EE; word-break: break-all;
    white-space: pre-wrap;
  }
  .gexp-output-body::-webkit-scrollbar { width: 8px; }
  .gexp-output-body::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08); border-radius: 99px;
  }

  /* ---------- Download modal ---------- */
  .gexp-dl-overlay {
    position: fixed; inset: 0;
    background: rgba(4,6,9,.78);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    z-index: 3000; padding: 16px;
    animation: gexpDlFade .16s ease;
  }
  .gexp-dl-modal {
    width: 100%; max-width: 460px;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid rgba(255,255,255,.10);
    border-radius: 16px;
    color: #E7E9EE;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    overflow: hidden;
    position: relative;
    animation: gexpDlIn .24s cubic-bezier(.2,.8,.25,1);
    box-shadow: 0 40px 100px -30px rgba(0,0,0,.95);
  }
  .gexp-dl-modal::before {
    content: '';
    position: absolute; left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: gexpDlGrad 4s linear infinite;
  }
  .gexp-dl-head {
    padding: 20px 22px 10px;
    display: flex; align-items: flex-start; gap: 12px;
  }
  .gexp-dl-icon { color: var(--accent); flex-shrink: 0; margin-top: 2px; }
  .gexp-dl-title {
    margin: 0; font-size: 16px; font-weight: 700;
    letter-spacing: -.01em; color: #FFFFFF;
  }
  .gexp-dl-sub {
    margin: 5px 0 0;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; line-height: 1.6; color: #8892A3;
  }
  .gexp-dl-close {
    margin-left: auto;
    width: 28px; height: 28px;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 8px; border: 1px solid rgba(255,255,255,.09);
    background: rgba(255,255,255,.025); color: #8892A3;
    cursor: pointer; transition: all .18s;
  }
  .gexp-dl-close:hover { color: #E7E9EE; background: rgba(255,255,255,.06); }

  .gexp-dl-body {
    padding: 6px 22px 18px;
    display: flex; flex-direction: column; gap: 16px;
  }
  .gexp-dl-group { display: flex; flex-direction: column; gap: 8px; }
  .gexp-dl-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700;
    letter-spacing: .14em; text-transform: uppercase; color: #545E6E;
  }
  .gexp-dl-options { display: grid; gap: 8px; }
  .gexp-dl-options.is-2 { grid-template-columns: 1fr 1fr; }
  .gexp-dl-opt {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: 10px;
    border: 1px solid rgba(255,255,255,.09);
    background: rgba(255,255,255,.02);
    color: #8892A3; cursor: pointer; text-align: left;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 600;
    transition: all .16s;
  }
  .gexp-dl-opt:hover { color: #E7E9EE; border-color: rgba(255,255,255,.18); background: rgba(255,255,255,.04); }
  .gexp-dl-opt.is-active {
    color: #FFFFFF;
    border-color: color-mix(in srgb, var(--accent) 50%, transparent);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    box-shadow: 0 0 22px -12px color-mix(in srgb, var(--accent) 60%, transparent);
  }
  .gexp-dl-opt svg { flex-shrink: 0; opacity: .7; }
  .gexp-dl-opt.is-active svg { color: var(--accent); opacity: 1; }
  .gexp-dl-opt-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .gexp-dl-opt-name { font-weight: 700; letter-spacing: .02em; }
  .gexp-dl-opt-desc {
    font-size: 10px; font-weight: 500; color: #545E6E;
    letter-spacing: 0; white-space: normal; line-height: 1.45;
  }
  .gexp-dl-opt.is-active .gexp-dl-opt-desc { color: rgba(255,255,255,.55); }

  .gexp-dl-foot {
    display: flex; justify-content: flex-end; gap: 10px;
    padding: 14px 22px;
    border-top: 1px solid rgba(255,255,255,.05);
    background: rgba(0,0,0,.15);
  }

  @keyframes gexpDlFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes gexpDlIn {
    from { opacity: 0; transform: translateY(-10px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes gexpDlGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }

  .gexp-table {
    width: 100%; border-collapse: collapse;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
  }
  .gexp-th {
    padding: 11px 14px; text-align: left;
    font-size: 10px; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
    color: #8892A3; background: rgba(0,0,0,.2);
    border-bottom: 1px solid rgba(255,255,255,.08);
    white-space: nowrap;
  }
  .gexp-th.right { text-align: right; }
  .gexp-tr { transition: background-color .12s; }
  .gexp-tr:hover { background: rgba(255,255,255,.025); }
  .gexp-td {
    padding: 11px 14px;
    border-bottom: 1px solid rgba(255,255,255,.04);
    color: #E7E9EE; vertical-align: middle;
  }
  .gexp-td.muted { color: #8892A3; }
  .gexp-td.right { text-align: right; }
  .gexp-td.date { font-weight: 700; }

  .gexp-pill {
    display: inline-flex;
    padding: 2px 8px; border-radius: 99px;
    font-size: 10px; font-weight: 700;
    letter-spacing: .04em; border: 1px solid;
  }
  .gexp-pill.bl {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border-color: color-mix(in srgb, var(--accent) 30%, transparent);
  }
  .gexp-pill.gex {
    color: #60A5FA;
    background: rgba(96,165,250,.08);
    border-color: rgba(96,165,250,.30);
  }

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
    padding: 60px 24px; text-align: center;
    color: #545E6E;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
  }
  .gexp-loading { color: #8892A3; }

  @media (prefers-reduced-motion: reduce) {
    .gexp-sym, .gexp-btn, .gexp-btn-primary, .gexp-output-copy,
    .gexp-btn-icon { transition: none !important; }
  }
`;

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

export default function AdminGexPage() {
  const { user: me } = useAuth();
  const isSuper = me?.role === 'superadmin';

  const [symbol, setSymbol] = useState(DEFAULT_GEX_SYMBOL);
  const [date, setDate] = useState(todayIST);
  const [jsonInput, setJsonInput] = useState('');
  const [preview, setPreview] = useState(null);
  const [copied, setCopied] = useState(false);

  const [overwritePrompt, setOverwritePrompt] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Download dropdown state
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('json');
  const [downloadScope, setDownloadScope] = useState('symbol'); // 'symbol' | 'all'
  const [downloading, setDownloading] = useState(false);

  const { data: days = [], isLoading } = useAdminGexDays(symbol);
  const upsert = useAdminUpsertGex();
  const remove = useAdminDeleteGex();

  const hasPreview = !!preview?.ok;
  const meta = useMemo(() => GEX_SYMBOL_META[symbol] || GEX_SYMBOL_META.NQ, [symbol]);

  useAdminPageHeader({
    eyebrow: 'Operations',
    title: 'GEX Levels',
    subtitle: 'Upload daily gamma-exposure levels — NQ and ES tracked independently.',
  });

  const handleSymbolChange = useCallback((next) => {
    if (next === symbol) return;
    setSymbol(next);
    setPreview(null);
    setJsonInput('');
  }, [symbol]);

  const handleConvert = useCallback(() => {
    const result = convertGexJson(jsonInput);
    setPreview(result);
    if (!result.ok) {
      toast.error(result.errors?.[0] || 'Conversion failed');
    }
  }, [jsonInput]);

  const handleJsonChange = useCallback((value) => {
    setJsonInput(value);
    if (preview) setPreview(null);
  }, [preview]);

  const runSave = useCallback(
    async (overwrite) => {
      const payload = {
        date,
        symbol,
        levels: preview.levels,
        converted: preview.converted,
        sourceTimezone: GEX_DEFAULT_TIMEZONE,
        overwrite,
      };
      return upsert.mutateAsync(payload);
    },
    [date, symbol, preview, upsert]
  );

  const handleSave = useCallback(async () => {
    if (!hasPreview) return;
    try {
      await runSave(false);
      toast.success(`${symbol} GEX saved for ${formatDate(date)}`);
      setJsonInput('');
      setPreview(null);
    } catch (err) {
      if (err.status === 409) {
        setOverwritePrompt({ existing: err.body?.details?.existing || null });
      } else {
        toast.error(err.message || 'Save failed');
      }
    }
  }, [hasPreview, date, symbol, runSave]);

  const handleConfirmOverwrite = useCallback(async () => {
    try {
      await runSave(true);
      toast.success(`${symbol} GEX overwritten for ${formatDate(date)}`);
      setOverwritePrompt(null);
      setJsonInput('');
      setPreview(null);
    } catch (err) {
      toast.error(err.message || 'Overwrite failed');
      setOverwritePrompt(null);
    }
  }, [date, symbol, runSave]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync({
        date: deleteTarget.date,
        symbol: deleteTarget.symbol,
      });
      toast.success(
        `Deleted ${deleteTarget.symbol} GEX for ${formatDate(deleteTarget.date)}`
      );
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || 'Delete failed');
      setDeleteTarget(null);
    }
  }, [deleteTarget, remove]);

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

  const handleDownload = useCallback(async () => {
    if (downloading || days.length === 0) return;
    setDownloading(true);
    try {
      const { blob, filename } = await downloadAdminGex(symbol, {
        scope: downloadScope,
        format: downloadFormat,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${downloadFormat.toUpperCase()} (${downloadScope === 'all' ? 'All symbols' : symbol})`);
    } catch (err) {
      toast.error(err.message || 'Download failed');
    } finally {
      setDownloading(false);
      setDownloadOpen(false);
    }
  }, [symbol, days.length, downloadFormat, downloadScope, downloading]);

  const canSave = hasPreview && !!date && !upsert.isPending;
  const counts = preview?.counts;

  return (
    <>
      <style>{CSS}</style>
      <div className="gexp-root">

        <div className="gexp-symbar" role="tablist" aria-label="Select symbol">
          {GEX_SYMBOLS.map((sym) => {
            const m = GEX_SYMBOL_META[sym];
            const active = symbol === sym;
            return (
              <button
                key={sym}
                type="button"
                role="tab"
                aria-selected={active}
                className={`gexp-sym${active ? ' is-active' : ''}`}
                style={{ '--sym-color': m.color }}
                onClick={() => handleSymbolChange(sym)}
              >
                <span className="gexp-sym-dot" aria-hidden />
                <span className="gexp-sym-code">{m.label}</span>
                <span className="gexp-sym-name">{m.fullName}</span>
              </button>
            );
          })}
        </div>

        <div className="gexp-top">
          <div className="gexp-card">
            <div className="gexp-card-head">
              <Wand2 size={14} style={{ color: 'var(--accent)' }} />
              <span className="gexp-card-title">Upload</span>
              <span className="gexp-card-sub">
                <span style={{ color: meta.color }}>{meta.label}</span> · {meta.fullName}
              </span>
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
                  <span className="gexp-label-hint">{'array of { Name, Y1, TextMsg, ShowPrice }'}</span>
                </label>
                <textarea
                  className="gexp-textarea"
                  spellCheck={false}
                  placeholder={`[\n  {\n    "Name": "BL${todayIST().replace(/-/g, '')}_${symbol}1!_1000_VFRQ",\n    "Y1": 29104.19,\n    "TextMsg": "BL 1 (${symbol}1!)",\n    "ShowPrice": true\n  }\n]`}
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

          <div className="gexp-card">
            <div className="gexp-card-head">
              <Layers size={14} style={{ color: 'var(--accent)' }} />
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
                  Paste JSON and click <b style={{ color: 'var(--accent)' }}>Convert</b> to
                  preview the {symbol} levels and the TradingView pipe-string.
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
                      <b>{counts.total}</b> level{counts.total === 1 ? '' : 's'} ready to
                      upload for <b>{symbol} · {formatDate(date)}</b>.
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
                      {upsert.isPending ? 'Saving…' : `Save ${symbol} to Database`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="gexp-card">
          <div className="gexp-card-head">
            <span className="gexp-card-title">Uploaded {symbol} Days</span>
            <span className="gexp-card-sub">
              {days.length} {days.length === 1 ? 'day' : 'days'}
            </span>

            {days.length > 0 && (
              <button
                type="button"
                className="gexp-btn"
                style={{ marginLeft: 8 }}
                onClick={() => setDownloadOpen(true)}
                title="Download GEX data"
              >
                <Download size={12} />
                Download
              </button>
            )}
          </div>
          <div className="gexp-card-body" style={{ padding: 0 }}>
            {isLoading ? (
              <div className="gexp-loading">Loading {symbol} days…</div>
            ) : days.length === 0 ? (
              <div className="gexp-empty">
                No {symbol} days uploaded yet. Upload one above, or switch symbol.
              </div>
            ) : (
              <table className="gexp-table">
                <thead>
                  <tr>
                    <th className="gexp-th">Date</th>
                    <th className="gexp-th">Symbol</th>
                    <th className="gexp-th">Levels</th>
                    <th className="gexp-th">BL</th>
                    <th className="gexp-th">GEX</th>
                    <th className="gexp-th">Uploaded</th>
                    <th className="gexp-th right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((d) => (
                    <tr key={`${d.symbol}:${d.date}`} className="gexp-tr">
                      <td className="gexp-td date">{formatDate(d.date)}</td>
                      <td className="gexp-td">
                        <span
                          className="gexp-pill"
                          style={{
                            color: GEX_SYMBOL_META[d.symbol]?.color,
                            borderColor: `${GEX_SYMBOL_META[d.symbol]?.color}66`,
                            background: `${GEX_SYMBOL_META[d.symbol]?.color}15`,
                          }}
                        >
                          {d.symbol}
                        </span>
                      </td>
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
                          title={isSuper ? `Delete ${d.symbol} · ${d.date}` : 'Superadmin only'}
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

      <Alert
        isOpen={!!overwritePrompt}
        type="confirm"
        title={`${symbol} GEX already exists`}
        message={
          overwritePrompt
            ? `${symbol} GEX data for ${formatDate(date)} already exists` +
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

      <Alert
        isOpen={!!deleteTarget}
        type="confirm"
        title={`Delete ${deleteTarget?.symbol} GEX day?`}
        message={
          deleteTarget
            ? `Delete all ${deleteTarget.symbol} GEX levels for ${formatDate(deleteTarget.date)}? Users on the ${deleteTarget.symbol} tab will no longer see this day. This cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {downloadOpen && (
        <Portal>
          <div
            className="gexp-dl-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget && !downloading) setDownloadOpen(false);
            }}
          >
            <div className="gexp-dl-modal" role="dialog" aria-modal="true" aria-labelledby="gexp-dl-title">
              <div className="gexp-dl-head">
                <Download size={18} className="gexp-dl-icon" />
                <div>
                  <h3 className="gexp-dl-title" id="gexp-dl-title">Download GEX data</h3>
                  <p className="gexp-dl-sub">
                    {downloadScope === 'all'
                      ? `Export every ${GEX_SYMBOLS.join(' + ')} day`
                      : `Export ${days.length} ${symbol} ${days.length === 1 ? 'day' : 'days'}`}
                  </p>
                </div>
                <button
                  type="button"
                  className="gexp-dl-close"
                  onClick={() => setDownloadOpen(false)}
                  disabled={downloading}
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="gexp-dl-body">
                <div className="gexp-dl-group">
                  <span className="gexp-dl-label">Scope</span>
                  <div className="gexp-dl-options is-2">
                    <button
                      type="button"
                      className={`gexp-dl-opt${downloadScope === 'symbol' ? ' is-active' : ''}`}
                      onClick={() => setDownloadScope('symbol')}
                    >
                      <Layers size={14} />
                      <span className="gexp-dl-opt-main">
                        <span className="gexp-dl-opt-name">{symbol} only</span>
                        <span className="gexp-dl-opt-desc">Active symbol</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`gexp-dl-opt${downloadScope === 'all' ? ' is-active' : ''}`}
                      onClick={() => setDownloadScope('all')}
                    >
                      <Layers size={14} />
                      <span className="gexp-dl-opt-main">
                        <span className="gexp-dl-opt-name">All symbols</span>
                        <span className="gexp-dl-opt-desc">{GEX_SYMBOLS.join(' + ')}</span>
                      </span>
                    </button>
                  </div>
                </div>

                <div className="gexp-dl-group">
                  <span className="gexp-dl-label">Format</span>
                  <div className="gexp-dl-options">
                    <button
                      type="button"
                      className={`gexp-dl-opt${downloadFormat === 'json' ? ' is-active' : ''}`}
                      onClick={() => setDownloadFormat('json')}
                    >
                      <FileJson size={14} />
                      <span className="gexp-dl-opt-main">
                        <span className="gexp-dl-opt-name">JSON</span>
                        <span className="gexp-dl-opt-desc">Full data — levels, counts, metadata. Best for backups & scripts.</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`gexp-dl-opt${downloadFormat === 'csv' ? ' is-active' : ''}`}
                      onClick={() => setDownloadFormat('csv')}
                    >
                      <FileSpreadsheet size={14} />
                      <span className="gexp-dl-opt-main">
                        <span className="gexp-dl-opt-name">CSV</span>
                        <span className="gexp-dl-opt-desc">One row per level — opens in Excel / Sheets.</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`gexp-dl-opt${downloadFormat === 'text' ? ' is-active' : ''}`}
                      onClick={() => setDownloadFormat('text')}
                    >
                      <FileText size={14} />
                      <span className="gexp-dl-opt-main">
                        <span className="gexp-dl-opt-name">TEXT</span>
                        <span className="gexp-dl-opt-desc">TradingView pipe-strings, one per day.</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="gexp-dl-foot">
                <button
                  type="button"
                  className="gexp-btn"
                  onClick={() => setDownloadOpen(false)}
                  disabled={downloading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="gexp-btn gexp-btn-primary"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  <Download size={11} />
                  {downloading ? 'Downloading…' : 'Download'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}