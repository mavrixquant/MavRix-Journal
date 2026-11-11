import { useMemo, useState } from 'react';
import {
  Rocket, Plus, Save, Send, RotateCw, EyeOff, Eye, Pencil, Trash2, X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAdminPageHeader } from '../AdminPageHeader';
import {
  useAdminReleases,
  useCreateRelease,
  useUpdateRelease,
  usePublishRelease,
  useRebroadcastRelease,
  useUnpublishRelease,
  useDeleteRelease,
} from '../api';
import ConfirmDangerModal from '../components/ConfirmDangerModal';

const VERSION_RE = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
const TODAY = new Date().toISOString().slice(0, 10);

const EMPTY = { version: '', date: TODAY, highlights: '', added: '', changed: '', fixed: '' };

const toForm = (r) => r ? {
  version: r.version,
  date: r.date,
  highlights: (r.highlights || []).join('\n'),
  added: (r.sections?.added || []).join('\n'),
  changed: (r.sections?.changed || []).join('\n'),
  fixed: (r.sections?.fixed || []).join('\n'),
} : { ...EMPTY };

const toPayload = (f) => ({
  version: f.version.trim(),
  date: f.date.trim(),
  highlights: f.highlights.split('\n').map((s) => s.trim()).filter(Boolean),
  sections: {
    added: f.added.split('\n').map((s) => s.trim()).filter(Boolean),
    changed: f.changed.split('\n').map((s) => s.trim()).filter(Boolean),
    fixed: f.fixed.split('\n').map((s) => s.trim()).filter(Boolean),
  },
});

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const relative = (iso) => {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const CSS = `
  .rel-root { display: flex; flex-direction: column; gap: 18px; }
  .rel-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
  .rel-kpi { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 14px; background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55)); border: 1px solid rgba(255,255,255,.08); box-shadow: 0 20px 50px -30px rgba(0,0,0,.9); }
  .rel-kpi-icon { flex-shrink: 0; width: 42px; height: 42px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); color: #8892A3; }
  .rel-kpi-icon.is-amber { color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); border-color: color-mix(in srgb, var(--accent) 28%, transparent); box-shadow: 0 0 24px -10px color-mix(in srgb, var(--accent) 55%, transparent); }
  .rel-kpi-label { font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #545E6E; }
  .rel-kpi-value { font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 700; color: #E7E9EE; letter-spacing: -.01em; line-height: 1.15; }
  .rel-kpi-sub { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: #545E6E; }
  .rel-card { border-radius: 14px; background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55)); border: 1px solid rgba(255,255,255,.08); box-shadow: 0 20px 50px -30px rgba(0,0,0,.9); overflow: hidden; }
  .rel-card-head { padding: 14px 18px 12px; border-bottom: 1px solid rgba(255,255,255,.05); display: flex; align-items: center; gap: 10px; }
  .rel-card-title { font-size: 13px; font-weight: 700; color: #E7E9EE; }
  .rel-card-sub { margin-left: auto; font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: .06em; text-transform: uppercase; color: var(--accent); opacity: .85; }
  .rel-form { padding: 16px 18px; display: flex; flex-direction: column; gap: 14px; }
  .rel-error { padding: 10px 12px; border-radius: 10px; background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.28); color: #fca5a5; font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; line-height: 1.55; }
  .rel-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .rel-field { display: flex; flex-direction: column; gap: 6px; }
  .rel-field > span { font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #545E6E; }
  .rel-field > span em { font-style: normal; font-weight: 500; letter-spacing: .02em; text-transform: none; opacity: .75; margin-left: 6px; }
  .rel-field input, .rel-field textarea { width: 100%; padding: 10px 12px; background: rgba(10,13,19,.6); border: 1px solid rgba(255,255,255,.1); border-radius: 10px; color: #E7E9EE; font-family: 'IBM Plex Mono', monospace; font-size: 13px; outline: none; box-sizing: border-box; color-scheme: dark; resize: vertical; transition: border-color .18s, box-shadow .2s; }
  .rel-field textarea { line-height: 1.55; font-family: Inter, sans-serif; }
  .rel-field input:focus, .rel-field textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent); }
  .rel-field input:disabled, .rel-field textarea:disabled { opacity: .55; cursor: not-allowed; }
  .rel-sections { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .rel-actions { display: flex; gap: 10px; padding-top: 4px; align-items: center; }
  .rel-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03); color: #8892A3; font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; font-weight: 600; letter-spacing: .02em; cursor: pointer; transition: all .2s; white-space: nowrap; }
  .rel-btn:hover:not(:disabled) { color: #E7E9EE; background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.2); }
  .rel-btn:disabled { opacity: .45; cursor: not-allowed; }
  .rel-btn-primary { background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #0D1117; border: none; font-weight: 700; box-shadow: 0 10px 30px -8px color-mix(in srgb, var(--accent) 55%, transparent), inset 0 1px 0 rgba(255,255,255,.4); }
  .rel-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 16px 42px -10px color-mix(in srgb, var(--accent) 70%, transparent), inset 0 1px 0 rgba(255,255,255,.5); }
  .rel-list { padding: 8px; }
  .rel-empty { padding: 40px 20px; text-align: center; color: #545E6E; font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
  .rel-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 10px; border: 1px solid transparent; transition: background .16s, border-color .16s; }
  .rel-item:hover { background: rgba(255,255,255,.03); border-color: rgba(255,255,255,.06); }
  .rel-item-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .rel-item-title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .rel-item-title b { font-size: 13.5px; font-weight: 700; color: #E7E9EE; }
  .rel-item-date { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #545E6E; }
  .rel-pill { padding: 2px 8px; border-radius: 99px; font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; border: 1px solid; white-space: nowrap; }
  .rel-pill.is-published { color: #4ade80; background: rgba(34,197,94,.08); border-color: rgba(34,197,94,.28); }
  .rel-pill.is-draft { color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); border-color: var(--accent-soft2); }
  .rel-item-highlights { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #8892A3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rel-item-actions { display: inline-flex; gap: 4px; flex-shrink: 0; }
  .rel-btn-icon { width: 30px; height: 30px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; border: 1px solid rgba(255,255,255,.09); background: rgba(255,255,255,.025); color: #8892A3; cursor: pointer; transition: all .18s; }
  .rel-btn-icon:hover:not(:disabled) { color: var(--accent); border-color: var(--accent-soft2); background: color-mix(in srgb, var(--accent) 8%, transparent); }
  .rel-btn-icon.is-accent { color: var(--accent); border-color: var(--accent-soft2); background: color-mix(in srgb, var(--accent) 8%, transparent); }
  .rel-btn-icon.is-accent:hover:not(:disabled) { background: color-mix(in srgb, var(--accent) 16%, transparent); }
  .rel-btn-icon.is-danger:hover:not(:disabled) { color: #f87171; border-color: rgba(239,68,68,.42); background: rgba(239,68,68,.08); }
  .rel-btn-icon:disabled { opacity: .35; cursor: not-allowed; }
  @media (max-width: 900px) { .rel-row, .rel-sections { grid-template-columns: 1fr; } }
`;

export default function AdminReleasesPage() {
  const { data: releases = [], isLoading } = useAdminReleases();
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const createM = useCreateRelease();
  const updateM = useUpdateRelease();
  const publishM = usePublishRelease();
  const rebroadcastM = useRebroadcastRelease();
  const unpublishM = useUnpublishRelease();
  const deleteM = useDeleteRelease();

  const busy = createM.isPending || updateM.isPending || publishM.isPending ||
    rebroadcastM.isPending || unpublishM.isPending || deleteM.isPending;

  useAdminPageHeader({
    eyebrow: 'Operations',
    title: 'Version & Changelog',
    subtitle: 'Publish releases straight to every live user — no rebuild needed',
  });

  const current = useMemo(
    () => releases.filter((r) => r.isPublished)
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))[0] || null,
    [releases]
  );
  const drafts = releases.filter((r) => !r.isPublished);
  const published = releases.filter((r) => r.isPublished);

  const startNew = () => { setEditingId(null); setForm({ ...EMPTY }); setError(''); };
  const startEdit = (r) => {
    setEditingId(r.id);
    setForm(toForm(r));
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validate = () => {
    const p = toPayload(form);
    if (!VERSION_RE.test(p.version)) return 'Version must look like 1.2.3 or 1.2.3-beta.1';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) return 'Date must be YYYY-MM-DD';
    if (p.highlights.length === 0) return 'Add at least one highlight';
    return '';
  };

  const save = async ({ publish }) => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    const payload = { ...toPayload(form), publish };
    try {
      if (editingId) {
        await updateM.mutateAsync({ id: editingId, payload });
        if (publish) await publishM.mutateAsync(editingId);
      } else {
        await createM.mutateAsync(payload);
      }
      toast.success(publish ? `Published v${payload.version} to every user` : `Saved v${payload.version} as draft`);
      startNew();
    } catch (e) {
      setError(e?.message || 'Save failed');
    }
  };

  const handlePublish = async (r) => {
    if (!window.confirm(`Publish v${r.version}? This sends a notification to every active user.`)) return;
    try { await publishM.mutateAsync(r.id); toast.success(`Published v${r.version}`); }
    catch (e) { toast.error(e?.message || 'Publish failed'); }
  };

  const handleRebroadcast = async (r) => {
    if (!window.confirm(`Re-broadcast v${r.version}? Every active user gets the notification again.`)) return;
    try { await rebroadcastM.mutateAsync(r.id); toast.success(`Re-broadcast v${r.version}`); }
    catch (e) { toast.error(e?.message || 'Re-broadcast failed'); }
  };

  const handleUnpublish = async (r) => {
    if (!window.confirm(`Unpublish v${r.version}? It will be hidden from users but past notifications stay.`)) return;
    try { await unpublishM.mutateAsync(r.id); toast.success(`Unpublished v${r.version}`); }
    catch (e) { toast.error(e?.message || 'Unpublish failed'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteM.mutateAsync(deleteTarget.id); toast.success(`Deleted v${deleteTarget.version}`); setDeleteTarget(null); }
    catch (e) { toast.error(e?.message || 'Delete failed'); }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <style>{CSS}</style>
      <div className="rel-root">
        <div className="rel-kpis">
          <div className="rel-kpi">
            <div className="rel-kpi-icon is-amber"><Rocket size={16} /></div>
            <div>
              <div className="rel-kpi-label">Current release</div>
              <div className="rel-kpi-value">{current?.version || '—'}</div>
              <div className="rel-kpi-sub">
                {current ? `Published ${relative(current.publishedAt)}` : 'Nothing published yet'}
              </div>
            </div>
          </div>
          <div className="rel-kpi">
            <div className="rel-kpi-icon"><Eye size={16} /></div>
            <div>
              <div className="rel-kpi-label">Published</div>
              <div className="rel-kpi-value">{published.length}</div>
              <div className="rel-kpi-sub">visible to every user</div>
            </div>
          </div>
          <div className="rel-kpi">
            <div className="rel-kpi-icon"><Pencil size={16} /></div>
            <div>
              <div className="rel-kpi-label">Drafts</div>
              <div className="rel-kpi-value">{drafts.length}</div>
              <div className="rel-kpi-sub">not yet visible</div>
            </div>
          </div>
        </div>

        <div className="rel-card">
          <div className="rel-card-head">
            <span className="rel-card-title">{editingId ? 'Edit release' : 'Create release'}</span>
            {editingId && (
              <button type="button" className="rel-btn-icon" onClick={startNew} title="Cancel edit">
                <X size={13} />
              </button>
            )}
          </div>
          <div className="rel-form">
            {error && <div className="rel-error">{error}</div>}

            <div className="rel-row">
              <label className="rel-field">
                <span>Version</span>
                <input type="text" value={form.version} onChange={(e) => set('version', e.target.value)} placeholder="1.2.0" disabled={busy} autoFocus />
              </label>
              <label className="rel-field">
                <span>Release date</span>
                <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} disabled={busy} />
              </label>
            </div>

            <label className="rel-field">
              <span>Highlights <em>one per line - shown in the modal</em></span>
              <textarea rows={4} value={form.highlights} onChange={(e) => set('highlights', e.target.value)}
                placeholder={'Faster trade log import\nNew Monte Carlo methods\nRedesigned settings panel'} disabled={busy} />
            </label>

            <div className="rel-sections">
              {[['added', 'Added'], ['changed', 'Changed'], ['fixed', 'Fixed']].map(([k, label]) => (
                <label key={k} className="rel-field">
                  <span>{label} <em>one per line</em></span>
                  <textarea rows={3} value={form[k]} onChange={(e) => set(k, e.target.value)}
                    placeholder={k === 'added' ? 'New Kelly calculator' : k === 'changed' ? 'Faster initial load' : 'Safari drag bug'}
                    disabled={busy} />
                </label>
              ))}
            </div>

            <div className="rel-actions">
              {editingId && (
                <button type="button" className="rel-btn" onClick={startNew} disabled={busy}>
                  <X size={11} /> Cancel
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button type="button" className="rel-btn" onClick={() => save({ publish: false })} disabled={busy}>
                <Save size={11} /> Save draft
              </button>
              <button type="button" className="rel-btn rel-btn-primary" onClick={() => save({ publish: true })} disabled={busy}>
                <Send size={11} /> {editingId ? 'Save & publish' : 'Create & publish'}
              </button>
            </div>
          </div>
        </div>

        <div className="rel-card">
          <div className="rel-card-head">
            <span className="rel-card-title">All releases</span>
            <span className="rel-card-sub">{releases.length} total</span>
          </div>
          <div className="rel-list">
            {isLoading && <div className="rel-empty">Loading releases…</div>}
            {!isLoading && releases.length === 0 && (
              <div className="rel-empty">No releases yet. Create the first one above.</div>
            )}
            {!isLoading && releases.map((r) => (
              <div key={r.id} className="rel-item">
                <div className="rel-item-main">
                  <div className="rel-item-title">
                    <b>v{r.version}</b>
                    {r.isPublished ? (
                      <span className="rel-pill is-published">Published {relative(r.publishedAt)}</span>
                    ) : (
                      <span className="rel-pill is-draft">Draft</span>
                    )}
                    <span className="rel-item-date">{fmtDate(r.date)}</span>
                  </div>
                  <div className="rel-item-highlights">
                    {(r.highlights || []).slice(0, 2).join(' · ')}
                    {(r.highlights || []).length > 2 ? ` · +${r.highlights.length - 2} more` : ''}
                  </div>
                </div>
                <div className="rel-item-actions">
                  <button type="button" className="rel-btn-icon" onClick={() => startEdit(r)} title="Edit" disabled={busy}>
                    <Pencil size={12} />
                  </button>
                  {!r.isPublished ? (
                    <button type="button" className="rel-btn-icon is-accent" onClick={() => handlePublish(r)} title="Publish & broadcast" disabled={busy}>
                      <Send size={12} />
                    </button>
                  ) : (
                    <>
                      <button type="button" className="rel-btn-icon" onClick={() => handleRebroadcast(r)} title="Re-broadcast" disabled={busy}>
                        <RotateCw size={12} />
                      </button>
                      <button type="button" className="rel-btn-icon" onClick={() => handleUnpublish(r)} title="Unpublish" disabled={busy}>
                        <EyeOff size={12} />
                      </button>
                    </>
                  )}
                  <button type="button" className="rel-btn-icon is-danger" onClick={() => setDeleteTarget(r)} title="Delete" disabled={busy}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmDangerModal
        isOpen={!!deleteTarget}
        title={deleteTarget ? `Delete v${deleteTarget.version}?` : ''}
        description="Permanently removes this release. Past notifications to users stay untouched."
        confirmPhrase={deleteTarget?.version || 'DELETE'}
        confirmLabel="Delete release"
        busy={deleteM.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
