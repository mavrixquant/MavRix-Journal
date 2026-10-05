// apps/web/src/features/admin/pages/AdminUserDetailPage.jsx
//
// Full user administration. Every mutating action is confirmed via modal
// when destructive, and every call invalidates the query cache so the page
// reflects the new state immediately.

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, ShieldOff, ShieldCheck,
  Key, LogOut, Ban, Trash2, Save, UserCog,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/app/providers/AuthProvider';
import {
  useAdminUser,
  useAdminUpdateUser,
  useAdminVerifyEmail,
  useAdminUnverifyEmail,
  useAdminTriggerPasswordReset,
  useAdminBanUser,
  useAdminUnbanUser,
  useAdminForceLogout,
  useAdminDeleteUser,
} from '../api';
import RoleBadge from '../components/RoleBadge';
import ConfirmDangerModal from '../components/ConfirmDangerModal';
import BanUserModal from '../components/BanUserModal';

const CSS = `
  .aud-root { display: flex; flex-direction: column; gap: 20px; }
  .aud-back {
    display: inline-flex; align-items: center; gap: 6px;
    color: #8892A3; text-decoration: none;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 600;
    width: fit-content;
  }
  .aud-back:hover { color: #F59E0B; }

  .aud-grid {
    display: grid;
    grid-template-columns: 1fr 1.1fr;
    gap: 20px;
  }
  @media (max-width: 1000px) { .aud-grid { grid-template-columns: 1fr; } }

  .aud-card {
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,26,.72), rgba(15,18,26,.55));
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    overflow: hidden;
  }
  .aud-card-head {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 18px 12px;
    border-bottom: 1px solid rgba(255,255,255,.05);
  }
  .aud-card-title {
    font-size: 13px; font-weight: 700;
    letter-spacing: -.005em; color: #E7E9EE;
  }
  .aud-card-note {
    margin-left: auto;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; letter-spacing: .06em;
    text-transform: uppercase; color: #F59E0B;
    opacity: .85;
  }
  .aud-card-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }

  .aud-field {
    display: flex; flex-direction: column; gap: 5px;
  }
  .aud-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px; font-weight: 700;
    letter-spacing: .14em; text-transform: uppercase;
    color: #545E6E;
  }
  .aud-input {
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
  }
  .aud-input:focus { border-color: #F59E0B; box-shadow: 0 0 0 3px rgba(245,158,11,.15); }
  .aud-input:disabled { opacity: .5; cursor: not-allowed; }
  .aud-input-row { display: flex; gap: 10px; }
  .aud-input-row > * { flex: 1; }

  .aud-kv {
    display: grid; grid-template-columns: 130px 1fr;
    gap: 8px 14px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
  }
  .aud-kv dt { color: #545E6E; }
  .aud-kv dd { color: #E7E9EE; margin: 0; }

  .aud-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 14px;
    border-radius: 9px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 600;
    cursor: pointer;
    transition: all .18s;
    white-space: nowrap;
  }
  .aud-btn:hover:not(:disabled) {
    color: #E7E9EE;
    border-color: rgba(255,255,255,.22);
    background: rgba(255,255,255,.06);
    transform: translateY(-1px);
  }
  .aud-btn:disabled { opacity: .4; cursor: not-allowed; }

  .aud-btn.amber {
    color: #F59E0B; border-color: rgba(245,158,11,.35); background: rgba(245,158,11,.06);
  }
  .aud-btn.amber:hover:not(:disabled) { background: rgba(245,158,11,.12); }
  .aud-btn.danger {
    color: #f87171; border-color: rgba(239,68,68,.35); background: rgba(239,68,68,.05);
  }
  .aud-btn.danger:hover:not(:disabled) { background: rgba(239,68,68,.12); }
  .aud-btn.win {
    color: #35C4A1; border-color: rgba(53,196,161,.3); background: rgba(53,196,161,.05);
  }
  .aud-btn.win:hover:not(:disabled) { background: rgba(53,196,161,.12); }

  .aud-primary {
    padding: 10px 18px; border-radius: 9px; border: none;
    background: linear-gradient(135deg, #F59E0B, #FDE68A);
    color: #0D1117; font-weight: 700; cursor: pointer;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    box-shadow: 0 10px 30px -8px rgba(245,158,11,.55);
  }
  .aud-primary:disabled { opacity: .4; cursor: not-allowed; }

  .aud-actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 8px;
  }

  .aud-danger-zone {
    border-color: rgba(239,68,68,.28) !important;
  }
  .aud-danger-zone .aud-card-head {
    border-bottom-color: rgba(239,68,68,.15);
  }
  .aud-danger-zone .aud-card-title { color: #f87171; }

  .aud-loading { padding: 60px 20px; text-align: center; color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 12.5px; }
`;

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();

  const { data, isLoading, isError, error } = useAdminUser(id);
  const user = data?.user;

  // Local edit state — synced when server data changes
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', role: 'user',
  });
  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName:  user.lastName  || '',
        email:     user.email     || '',
        role:      user.role      || 'user',
      });
    }
  }, [user]);

  const updateUser       = useAdminUpdateUser();
  const verifyEmail      = useAdminVerifyEmail();
  const unverifyEmail    = useAdminUnverifyEmail();
  const triggerReset     = useAdminTriggerPasswordReset();
  const banUser          = useAdminBanUser();
  const unbanUser        = useAdminUnbanUser();
  const forceLogout      = useAdminForceLogout();
  const deleteUser       = useAdminDeleteUser();

  const [showBanModal, setShowBanModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (isLoading) return <div className="aud-loading">Loading user…</div>;
  if (isError)   return <div className="aud-loading">Error: {error?.message}</div>;
  if (!user)     return <div className="aud-loading">User not found.</div>;

  const isSelf = me?.id === user.id;
  const isSuper = me?.role === 'superadmin';
  const roleChanged = form.role !== user.role;
  const otherFieldsChanged =
    form.firstName !== (user.firstName || '') ||
    form.lastName  !== (user.lastName  || '') ||
    form.email     !== (user.email     || '');
  const hasChanges = otherFieldsChanged || (isSuper && roleChanged);

  const handleSave = async () => {
    try {
      const patch = {};
      if (form.firstName !== (user.firstName || '')) patch.firstName = form.firstName;
      if (form.lastName  !== (user.lastName  || '')) patch.lastName  = form.lastName;
      if (form.email     !== (user.email     || '')) patch.email     = form.email;
      if (isSuper && roleChanged)                    patch.role      = form.role;

      if (Object.keys(patch).length === 0) { toast.info('No changes.'); return; }
      await updateUser.mutateAsync({ userId: user.id, patch });
      toast.success('User updated.');
    } catch (err) {
      toast.error(err?.message || 'Update failed');
    }
  };

  const wrap = (fn, success) => async () => {
    try { await fn(); toast.success(success); }
    catch (err) { toast.error(err?.message || 'Action failed'); }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="aud-root">

        <Link to="/admin/users" className="aud-back">
          <ArrowLeft size={13} /> Back to users
        </Link>

        <div className="admin-ph">
          <div className="admin-ph-left">
            <span className="admin-ph-eyebrow">User</span>
            <h1 className="admin-ph-title">
              {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}
            </h1>
            <p className="admin-ph-sub">{user.email}</p>
          </div>
          <div className="admin-ph-right">
            <RoleBadge role={user.role} />
            {user.isBanned && (
              <span style={{
                padding: '3px 10px', borderRadius: 99,
                background: 'rgba(239,68,68,.1)',
                border: '1px solid rgba(239,68,68,.35)',
                color: '#f87171', fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
                textTransform: 'uppercase',
              }}>Banned</span>
            )}
          </div>
        </div>

        <div className="aud-grid">
          {/* ---------- Column 1: profile + meta ---------- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="aud-card">
              <div className="aud-card-head">
                <UserCog size={14} style={{ color: '#F59E0B' }} />
                <span className="aud-card-title">Profile</span>
              </div>
              <div className="aud-card-body">
                <div className="aud-field">
                  <label className="aud-label">First name</label>
                  <input
                    className="aud-input"
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  />
                </div>
                <div className="aud-field">
                  <label className="aud-label">Last name</label>
                  <input
                    className="aud-input"
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  />
                </div>
                <div className="aud-field">
                  <label className="aud-label">Email</label>
                  <input
                    className="aud-input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="aud-field">
                  <label className="aud-label">
                    Role {!isSuper && <span style={{ opacity: .5 }}>(superadmin only)</span>}
                  </label>
                  <select
                    className="aud-input"
                    value={form.role}
                    disabled={!isSuper}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                    <option value="superadmin">superadmin</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="aud-primary"
                    disabled={!hasChanges || updateUser.isPending || isSelf}
                    onClick={handleSave}
                    title={isSelf ? 'You cannot edit your own admin record here' : ''}
                  >
                    <Save size={11} style={{ marginRight: 6 }} />
                    {updateUser.isPending ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            </div>

            <div className="aud-card">
              <div className="aud-card-head">
                <span className="aud-card-title">Account details</span>
              </div>
              <div className="aud-card-body">
                <dl className="aud-kv">
                  <dt>User ID</dt>       <dd style={{ wordBreak: 'break-all' }}>{user.id}</dd>
                  <dt>Joined</dt>        <dd>{fmtDate(user.createdAt)}</dd>
                  <dt>Last login</dt>    <dd>{fmtDate(user.lastLoginAt)}</dd>
                  <dt>Accounts</dt>      <dd>{user.accounts?.length ?? 0}</dd>
                  <dt>Trades</dt>        <dd>{user.tradeCount ?? 0}</dd>
                  {user.isBanned && (
                    <>
                      <dt style={{ color: '#f87171' }}>Ban reason</dt>
                      <dd style={{ color: '#f87171' }}>{user.bannedReason || '—'}</dd>
                      <dt style={{ color: '#f87171' }}>Banned at</dt>
                      <dd style={{ color: '#f87171' }}>{fmtDate(user.bannedAt)}</dd>
                    </>
                  )}
                </dl>
              </div>
            </div>

            {user.accounts?.length > 0 && (
              <div className="aud-card">
                <div className="aud-card-head">
                  <span className="aud-card-title">Accounts ({user.accounts.length})</span>
                </div>
                <div className="aud-card-body">
                  {user.accounts.map((a) => (
                    <div key={a.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px', borderRadius: 8,
                      background: 'rgba(255,255,255,.02)',
                      border: '1px solid rgba(255,255,255,.05)',
                    }}>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#E7E9EE' }}>{a.name}</div>
                        <div style={{
                          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                          color: '#545E6E', marginTop: 2,
                        }}>
                          {a.type} · {a.currency} · {a.tradeCount} trades
                        </div>
                      </div>
                      <Link
                        to={`/admin/accounts?q=${encodeURIComponent(a.name)}`}
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 10.5, color: '#F59E0B',
                          textDecoration: 'none', fontWeight: 600,
                        }}
                      >View →</Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ---------- Column 2: actions ---------- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="aud-card">
              <div className="aud-card-head">
                <span className="aud-card-title">Email &amp; verification</span>
              </div>
              <div className="aud-card-body">
                <div className="aud-actions-grid">
                  {user.emailVerified ? (
                    <button
                      className="aud-btn danger"
                      disabled={unverifyEmail.isPending}
                      onClick={() => wrap(() => unverifyEmail.mutateAsync(user.id), 'Email marked unverified')()}
                    >
                      <ShieldOff size={12} /> Unverify email
                    </button>
                  ) : (
                    <button
                      className="aud-btn win"
                      disabled={verifyEmail.isPending}
                      onClick={() => wrap(() => verifyEmail.mutateAsync(user.id), 'Email verified')()}
                    >
                      <ShieldCheck size={12} /> Verify email
                    </button>
                  )}

                  <button
                    className="aud-btn amber"
                    disabled={triggerReset.isPending}
                    onClick={() => wrap(() => triggerReset.mutateAsync(user.id), 'Password reset email sent')()}
                  >
                    <Key size={12} /> Send password reset
                  </button>
                </div>
              </div>
            </div>

            <div className="aud-card">
              <div className="aud-card-head">
                <span className="aud-card-title">Session</span>
              </div>
              <div className="aud-card-body">
                <div className="aud-actions-grid">
                  <button
                    className="aud-btn"
                    disabled={forceLogout.isPending}
                    onClick={() => wrap(() => forceLogout.mutateAsync(user.id), 'All sessions revoked')()}
                  >
                    <LogOut size={12} /> Force logout
                  </button>
                </div>
              </div>
            </div>

            <div className="aud-card">
              <div className="aud-card-head">
                <span className="aud-card-title">Moderation</span>
              </div>
              <div className="aud-card-body">
                {user.isBanned ? (
                  <div className="aud-actions-grid">
                    <button
                      className="aud-btn win"
                      disabled={unbanUser.isPending}
                      onClick={() => wrap(() => unbanUser.mutateAsync(user.id), 'User unbanned')()}
                    >
                      <CheckCircle2 size={12} /> Unban user
                    </button>
                  </div>
                ) : (
                  <div className="aud-actions-grid">
                    <button
                      className="aud-btn danger"
                      disabled={isSelf}
                      onClick={() => setShowBanModal(true)}
                      title={isSelf ? 'You cannot ban yourself' : ''}
                    >
                      <Ban size={12} /> Ban user
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ---------- Danger zone ---------- */}
            <div className="aud-card aud-danger-zone">
              <div className="aud-card-head">
                <Trash2 size={14} />
                <span className="aud-card-title">Danger zone</span>
              </div>
              <div className="aud-card-body">
                <p style={{
                  margin: 0,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11.5, lineHeight: 1.6, color: '#8892A3',
                }}>
                  Permanently delete this user, their accounts, and every trade.
                  This action is irreversible.
                </p>
                <div className="aud-actions-grid">
                  <button
                    className="aud-btn danger"
                    disabled={!isSuper || isSelf}
                    onClick={() => setShowDeleteModal(true)}
                    title={
                      !isSuper ? 'Superadmin only' :
                      isSelf   ? 'You cannot delete yourself' :
                      'Delete user and all data'
                    }
                  >
                    <Trash2 size={12} /> Delete user
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Modals ---------- */}
      <BanUserModal
        isOpen={showBanModal}
        user={user}
        busy={banUser.isPending}
        onCancel={() => setShowBanModal(false)}
        onConfirm={async (reason) => {
          try {
            await banUser.mutateAsync({ userId: user.id, reason });
            toast.success('User banned');
            setShowBanModal(false);
          } catch (err) {
            toast.error(err?.message || 'Ban failed');
          }
        }}
      />

      <ConfirmDangerModal
        isOpen={showDeleteModal}
        title={`Delete ${user.email}?`}
        description="All accounts, trades, layouts, and audit references will be removed. This cannot be undone."
        confirmPhrase={user.email}
        confirmLabel="Delete user"
        busy={deleteUser.isPending}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          try {
            await deleteUser.mutateAsync(user.id);
            toast.success('User deleted');
            setShowDeleteModal(false);
            navigate('/admin/users');
          } catch (err) {
            toast.error(err?.message || 'Delete failed');
          }
        }}
      />
    </>
  );
}