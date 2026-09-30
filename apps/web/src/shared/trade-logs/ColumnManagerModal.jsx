// apps/web/src/features/journal/trade-logs/ColumnManagerModal.jsx
import { useEffect, useMemo, useState } from 'react';
import { FaTimes, FaPlus, FaTrash, FaEdit, FaCheck } from 'react-icons/fa';

import Portal from '@/shared/components/Portal';
import Alert from '@/shared/components/Alert';
import { useUpdateColumnConfigs } from '@/shared/api/accounts';
import {
  useAddCustomColumn,
  useRenameCustomColumn,
  useDeleteCustomColumn,
} from '@/shared/api/trades';

const TYPES = [
  { value: 'text',     label: 'Text' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'number',   label: 'Number' },
];

const RESERVED = new Set([
  'date', 'entryTime', 'exitTime', 'direction', 'symbol',
  'mae', 'mfe', 'pnl', 'slPoints', 'contracts', 'notes',
]);

/* ------------------------------------------------------------------ */
/*  Local spinner                                                      */
/* ------------------------------------------------------------------ */
function Spinner({ size = 12, variant = 'dark' }) {
  return (
    <span
      className={`cm-spinner ${variant === 'light' ? 'is-light' : ''}`}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Scoped CSS                                                         */
/* ------------------------------------------------------------------ */
const CSS = `
  .cm-overlay {
    position: fixed; inset: 0;
    background: rgba(4,6,9,.72);
    backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; padding: 16px;
    animation: cmFade .18s ease;
  }
  .cm-modal {
    --accent: #F59E0B; --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE; --ink-2: #8892A3; --ink-3: #545E6E;
    --win: #22c55e; --loss: #ef4444;
    width: 100%; max-width: 560px; max-height: 90vh;
    display: flex; flex-direction: column;
    background: linear-gradient(180deg, #12161F, #0C1017);
    border: 1px solid var(--line);
    border-radius: 18px;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,.95),
                0 0 0 1px var(--accent-soft);
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    overflow: hidden;
    animation: cmModalIn .28s cubic-bezier(.2,.8,.25,1);
  }
  .cm-head {
    padding: 18px 22px 14px; border-bottom: 1px solid var(--line-soft);
    display: flex; justify-content: space-between; align-items: center;
    position: relative; flex-shrink: 0;
  }
  .cm-head::before {
    content: ''; position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent),
                var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: cmGrad 4s linear infinite;
    transition: background .3s ease;
  }
  /* Speed up the header strip while any operation is pending */
  .cm-modal.is-busy .cm-head::before {
    animation-duration: .9s;
  }
  .cm-title { font-size: 16px; font-weight: 700; margin: 0; letter-spacing: -.01em; }
  .cm-sub {
    margin: 4px 0 0; font-size: 11.5px; color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }
  .cm-close {
    background: none; border: none; color: var(--ink-2);
    font-size: 15px; cursor: pointer; padding: 6px; border-radius: 8px;
    transition: all .2s;
  }
  .cm-close:hover:not(:disabled) {
    color: var(--accent); background: rgba(245,158,11,.08);
  }
  .cm-close:disabled { opacity: .35; cursor: not-allowed; }
  .cm-body {
    padding: 20px 22px; overflow-y: auto; flex: 1;
    display: flex; flex-direction: column; gap: 16px;
  }
  .cm-body::-webkit-scrollbar { width: 8px; }
  .cm-body::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08); border-radius: 99px;
  }
  .cm-section-title {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: var(--accent);
    display: flex; align-items: center; gap: 8px;
  }
  .cm-count { color: var(--ink-3); font-weight: 600; }
  .cm-addrow {
    display: grid; grid-template-columns: 1fr 130px auto;
    gap: 8px; align-items: stretch;
  }
  .cm-label {
    display: block; margin-bottom: 6px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: var(--ink-3);
  }
  .cm-input, .cm-select {
    width: 100%; padding: 9px 12px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px; color: var(--ink-1);
    font-size: 12.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    outline: none; box-sizing: border-box; transition: all .2s;
  }
  .cm-input::placeholder { color: var(--ink-3); }
  .cm-input:hover:not(:disabled), .cm-select:hover:not(:disabled) {
    border-color: rgba(255,255,255,.2);
  }
  .cm-input:focus, .cm-select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }
  .cm-input:disabled, .cm-select:disabled {
    opacity: .55; cursor: not-allowed;
  }
  .cm-select {
    appearance: none; -webkit-appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 20 20' fill='%23545E6E'><path d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'/></svg>");
    background-repeat: no-repeat; background-position: right 10px center;
    padding-right: 32px; cursor: pointer;
  }
  .cm-addbtn {
    padding: 0 16px; border-radius: 10px; border: none;
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117; font-weight: 700; font-size: 11.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: .02em; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    box-shadow: 0 8px 20px -10px rgba(245,158,11,.6),
                inset 0 1px 0 rgba(255,255,255,.4);
    transition: all .2s; white-space: nowrap; min-width: 84px;
  }
  .cm-addbtn:hover:not(:disabled) { transform: translateY(-1px); }
  .cm-addbtn:disabled { opacity: .5; cursor: not-allowed; }
  .cm-list {
    display: flex; flex-direction: column; gap: 8px;
  }
  .cm-row {
    display: grid;
    grid-template-columns: 1fr 130px auto;
    gap: 8px; align-items: center;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(255,255,255,.02);
    border: 1px solid var(--line-soft);
    transition: border-color .2s, background-color .2s;
  }
  .cm-row:hover { border-color: rgba(255,255,255,.12); }
  .cm-row.is-busy {
    border-color: var(--accent-soft2);
    background: rgba(245,158,11,.05);
  }
  .cm-row-name {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px; font-weight: 600; color: var(--ink-1);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .cm-row-type {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase;
    color: var(--ink-2); padding: 3px 8px; border-radius: 6px;
    background: rgba(255,255,255,.03);
    border: 1px solid var(--line-soft);
    text-align: center; width: fit-content;
  }
  .cm-row-actions { display: flex; gap: 6px; }
  .cm-icon-btn {
    width: 30px; height: 30px; padding: 0;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2); cursor: pointer;
    transition: all .18s;
  }
  .cm-icon-btn:hover:not(:disabled) {
    color: var(--accent); background: rgba(245,158,11,.08);
    border-color: var(--accent-soft2);
  }
  .cm-icon-btn:disabled { opacity: .5; cursor: not-allowed; }
  .cm-icon-btn.is-danger:hover:not(:disabled) {
    color: #f87171; background: rgba(239,68,68,.08);
    border-color: rgba(239,68,68,.4);
  }
  .cm-icon-btn.is-ok {
    color: #4ade80;
    background: rgba(34,197,94,.08);
    border-color: rgba(34,197,94,.35);
  }
  .cm-icon-btn.is-ok:hover:not(:disabled) {
    color: #86efac;
    background: rgba(34,197,94,.14);
    border-color: rgba(34,197,94,.55);
  }
  .cm-empty {
    padding: 40px 20px; text-align: center;
    color: var(--ink-3);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    border: 1px dashed rgba(255,255,255,.08);
    border-radius: 12px;
    background: rgba(255,255,255,.015);
  }
  .cm-empty b { color: var(--accent); }
  .cm-error {
    padding: 10px 12px; border-radius: 10px;
    background: rgba(239,68,68,.08);
    border: 1px solid rgba(239,68,68,.28);
    color: #fca5a5;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; line-height: 1.55;
  }
  .cm-hint {
    margin: 0; font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px; line-height: 1.6; color: var(--ink-2);
  }
  .cm-foot {
    padding: 14px 22px; border-top: 1px solid var(--line-soft);
    display: flex; gap: 10px; align-items: center;
    background: rgba(0,0,0,.15); flex-shrink: 0;
  }
  .cm-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 16px; border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03); color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 600; letter-spacing: .02em;
    cursor: pointer; transition: all .22s; white-space: nowrap;
  }
  .cm-btn:hover:not(:disabled) {
    color: var(--ink-1); background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
  }
  .cm-btn:disabled { opacity: .5; cursor: not-allowed; }

  /* ---------- spinner ---------- */
  .cm-spinner {
    display: inline-block;
    border-radius: 50%;
    border: 2px solid rgba(13, 17, 23, .3);
    border-top-color: #0D1117;
    animation: cmSpin .7s linear infinite;
    flex-shrink: 0;
    vertical-align: middle;
  }
  .cm-spinner.is-light {
    border-color: rgba(255, 255, 255, .2);
    border-top-color: var(--accent);
  }

  @keyframes cmFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes cmModalIn {
    from { opacity: 0; transform: translateY(-12px) scale(.97); }
    to { opacity: 1; transform: none; }
  }
  @keyframes cmGrad {
    0% { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @keyframes cmSpin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .cm-head::before { animation: none !important; }
    .cm-spinner { animation-duration: 1.6s; }
    .cm-btn, .cm-icon-btn { transition: none !important; }
  }
`;

export default function ColumnManagerModal({ isOpen, onClose, account }) {
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('text');
  const [renaming, setRenaming] = useState(null); // { old, draft }
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null);   // { op, key? }
  const [deleteTarget, setDeleteTarget] = useState(null);

  const addCol    = useAddCustomColumn();
  const renameCol = useRenameCustomColumn();
  const deleteCol = useDeleteCustomColumn();
  const updateCfg = useUpdateColumnConfigs();

  const busy = pending !== null;
  const isPending = (op, key) =>
    pending?.op === op && (key === undefined || pending?.key === key);

  const columns = useMemo(() => {
    const cfg = account?.columnConfigs || {};
    return Object.entries(cfg)
      .map(([name, type]) => ({ name, type }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [account]);

  useEffect(() => {
    if (!isOpen) {
      setNewName('');
      setNewType('text');
      setRenaming(null);
      setError('');
      setPending(null);
      setDeleteTarget(null);
    }
  }, [isOpen]);

  if (!isOpen || !account) return null;

  const cfgOf = () => ({ ...(account.columnConfigs || {}) });

  /* ---------------------------------------------------------------- */
  /*  Add                                                              */
  /* ---------------------------------------------------------------- */
  const handleAdd = async () => {
    setError('');
    const name = newName.trim();
    if (!name) { setError('Column name is required.'); return; }
    if (name.length > 40) { setError('Column name must be 40 chars or fewer.'); return; }
    if (cfgOf()[name] || columns.some((c) => c.name === name)) {
      setError(`"${name}" already exists.`);
      return;
    }
    if (RESERVED.has(name)) {
      setError(`"${name}" is a reserved column name.`);
      return;
    }

    setPending({ op: 'add' });
    try {
      await addCol.mutateAsync({ accountId: account.id, name });
      const next = cfgOf();
      next[name] = newType;
      await updateCfg.mutateAsync({ accountId: account.id, columnConfigs: next });
      setNewName('');
      setNewType('text');
    } catch (err) {
      setError(err?.message || 'Could not add column.');
    } finally {
      setPending(null);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Rename                                                           */
  /* ---------------------------------------------------------------- */
  const startRename = (col) => {
    setRenaming({ old: col.name, draft: col.name });
    setError('');
  };

  const commitRename = async () => {
    if (!renaming) return;
    const oldName = renaming.old;
    const newName = renaming.draft.trim();
    if (!newName || newName === oldName) {
      setRenaming(null);
      return;
    }
    if (cfgOf()[newName]) {
      setError(`"${newName}" already exists.`);
      return;
    }

    setPending({ op: 'rename', key: oldName });
    try {
      await renameCol.mutateAsync({
        accountId: account.id,
        oldName,
        newName,
      });
      const next = cfgOf();
      const type = next[oldName] || 'text';
      delete next[oldName];
      next[newName] = type;
      await updateCfg.mutateAsync({ accountId: account.id, columnConfigs: next });
      setRenaming(null);
    } catch (err) {
      setError(err?.message || 'Could not rename column.');
    } finally {
      setPending(null);
    }
  };

  const cancelRename = () => {
    setRenaming(null);
    setError('');
  };

  /* ---------------------------------------------------------------- */
  /*  Change type                                                      */
  /* ---------------------------------------------------------------- */
  const changeType = async (name, type) => {
    setPending({ op: 'type', key: name });
    try {
      const next = cfgOf();
      next[name] = type;
      await updateCfg.mutateAsync({ accountId: account.id, columnConfigs: next });
    } catch (err) {
      setError(err?.message || 'Could not update column type.');
    } finally {
      setPending(null);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Delete (confirmation via shared <Alert />)                       */
  /* ---------------------------------------------------------------- */
  const requestDelete = (col) => {
    setDeleteTarget(col);
    setError('');
  };

  const confirmDelete = async () => {
    const col = deleteTarget;
    if (!col) return;
    setDeleteTarget(null);
    setPending({ op: 'delete', key: col.name });
    try {
      await deleteCol.mutateAsync({ accountId: account.id, name: col.name });
      const next = cfgOf();
      delete next[col.name];
      await updateCfg.mutateAsync({ accountId: account.id, columnConfigs: next });
    } catch (err) {
      setError(err?.message || 'Could not delete column.');
    } finally {
      setPending(null);
    }
  };

  return (
    <Portal>
      <style>{CSS}</style>
      <div
        className="cm-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget && !busy) onClose();
        }}
      >
        <div className={`cm-modal ${busy ? 'is-busy' : ''}`}>
          <div className="cm-head">
            <div>
              <h2 className="cm-title">Custom Columns</h2>
              <p className="cm-sub">
                Manage extra fields on <b>{account.name}</b>
              </p>
            </div>
            <button
              className="cm-close"
              onClick={onClose}
              disabled={busy}
              aria-label="Close"
            >
              <FaTimes />
            </button>
          </div>

          <div className="cm-body">
            {error && <div className="cm-error">{error}</div>}

            {/* ---- Add new ---- */}
            <div>
              <span className="cm-section-title">Add a column</span>
              <div style={{ marginTop: 10 }} className="cm-addrow">
                <input
                  type="text"
                  className="cm-input"
                  placeholder="e.g. Setup, Confidence, Session"
                  value={newName}
                  maxLength={40}
                  disabled={busy}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAdd();
                    }
                  }}
                />
                <select
                  className="cm-select"
                  value={newType}
                  disabled={busy}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="cm-addbtn"
                  onClick={handleAdd}
                  disabled={busy || !newName.trim()}
                >
                  {isPending('add') ? (
                    <>
                      <Spinner size={11} />
                      <span>Adding…</span>
                    </>
                  ) : (
                    <>
                      <FaPlus size={10} />
                      <span>Add</span>
                    </>
                  )}
                </button>
              </div>
              <p className="cm-hint" style={{ marginTop: 8 }}>
                The column is added to every existing trade as an empty cell.
              </p>
            </div>

            {/* ---- Existing ---- */}
            <div>
              <span className="cm-section-title">
                Existing columns
                <span className="cm-count">({columns.length})</span>
              </span>

              <div style={{ marginTop: 10 }} className="cm-list">
                {columns.length === 0 ? (
                  <div className="cm-empty">
                    No custom columns yet. Add one above — it will appear as an
                    extra column on <b>Trade Logs</b>.
                  </div>
                ) : (
                  columns.map((col) => {
                    const isRenaming = renaming?.old === col.name;
                    const renamingThis = isPending('rename', col.name);
                    const deletingThis = isPending('delete', col.name);
                    const typingThis = isPending('type', col.name);
                    const rowBusy = renamingThis || deletingThis || typingThis;

                    return (
                      <div
                        key={col.name}
                        className={`cm-row ${rowBusy ? 'is-busy' : ''}`}
                      >
                        {isRenaming ? (
                          <input
                            type="text"
                            autoFocus
                            className="cm-input"
                            value={renaming.draft}
                            maxLength={40}
                            disabled={busy}
                            onChange={(e) =>
                              setRenaming((p) => ({ ...p, draft: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                              else if (e.key === 'Escape') { e.preventDefault(); cancelRename(); }
                            }}
                          />
                        ) : (
                          <span className="cm-row-name" title={col.name}>
                            {col.name}
                          </span>
                        )}

                        {isRenaming ? (
                          <span />
                        ) : (
                          <select
                            className="cm-select"
                            value={col.type}
                            onChange={(e) => changeType(col.name, e.target.value)}
                            disabled={busy}
                            style={{ padding: '5px 30px 5px 10px', fontSize: 11 }}
                          >
                            {TYPES.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        )}

                        <div className="cm-row-actions">
                          {isRenaming ? (
                            <>
                              <button
                                type="button"
                                className="cm-icon-btn is-ok"
                                onClick={commitRename}
                                disabled={busy}
                                title="Save"
                              >
                                {renamingThis
                                  ? <Spinner size={11} variant="light" />
                                  : <FaCheck size={11} />}
                              </button>
                              <button
                                type="button"
                                className="cm-icon-btn"
                                onClick={cancelRename}
                                disabled={busy}
                                title="Cancel"
                              >
                                <FaTimes size={11} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="cm-icon-btn"
                                onClick={() => startRename(col)}
                                disabled={busy}
                                title="Rename"
                              >
                                <FaEdit size={11} />
                              </button>
                              <button
                                type="button"
                                className="cm-icon-btn is-danger"
                                onClick={() => requestDelete(col)}
                                disabled={busy}
                                title="Delete"
                              >
                                {deletingThis
                                  ? <Spinner size={11} variant="light" />
                                  : <FaTrash size={11} />}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="cm-foot">
            <div style={{ flex: 1 }} />
            <button
              type="button"
              className="cm-btn"
              onClick={onClose}
              disabled={busy}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* ---- Modern delete confirmation ---- */}
      <Alert
        isOpen={!!deleteTarget}
        type="confirm"
        title="Delete column?"
        message={`Delete column "${deleteTarget?.name}" from every trade? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Portal>
  );
}