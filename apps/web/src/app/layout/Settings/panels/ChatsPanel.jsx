
import { useState } from 'react';
import { ShieldOff, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useSettings } from '../SettingsProvider';
import { useBlocks, useUnblockUser } from '@/shared/api/friends';
import Alert from '@/shared/components/Alert';


function Toggle({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`settings-switch${on ? ' is-on' : ''}`}
      onClick={() => onChange(!on)}
    />
  );
}


function initialsOf(u) {
  if (!u) return '?';
  const a = (u.firstName || '').trim();
  const b = (u.lastName || '').trim();
  if (a && b) return (a[0] + b[0]).toUpperCase();
  if (a) return a.slice(0, 2).toUpperCase();
  if (u.email) return u.email.slice(0, 2).toUpperCase();
  return '?';
}

function displayNameOf(u) {
  if (!u) return 'Unknown';
  const a = (u.firstName || '').trim();
  const b = (u.lastName || '').trim();
  if (a && b) return `${a} ${b}`;
  if (a) return a;
  return u.email || 'Unknown';
}

function BlockedUsersSection() {
  const { data: blocks = [], isLoading } = useBlocks();
  const unblockMutation = useUnblockUser();
  const [pendingUnblock, setPendingUnblock] = useState(null);

  const handleConfirm = async () => {
    const entry = pendingUnblock;
    if (!entry) return;
    setPendingUnblock(null);
    try {
      await unblockMutation.mutateAsync(entry.user.id);
      toast.success(`Unblocked ${displayNameOf(entry.user)}`);
    } catch (err) {
      toast.error(err?.message || 'Could not unblock user');
    }
  };

  const countSuffix = blocks.length > 0 ? ` (${blocks.length})` : '';

  return (
    <section className="settings-section">
      <h4 className="settings-section-title">
        Blocked Users{countSuffix}
      </h4>
      <p className="settings-hint">
        Users you have blocked cannot message you, send friend requests, or
        appear in your search. Unblock to restore visibility.
      </p>

      {isLoading && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Loader2 size={18} className="settings-spin" />
        </div>
      )}

      {!isLoading && blocks.length === 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '32px 20px',
            border: '1px dashed rgba(255,255,255,.1)',
            borderRadius: 12,
            background: 'rgba(255,255,255,.015)',
            textAlign: 'center',
          }}
        >
          <ShieldCheck
            size={24}
            style={{ color: 'var(--ink-3)', opacity: 0.5 }}
          />
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12.5,
              color: 'var(--ink-2)',
              letterSpacing: '.01em',
            }}
          >
            No blocked users
          </span>
        </div>
      )}

      {!isLoading && blocks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {blocks.map((b) => (
            <div
              key={b.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(255,255,255,.02)',
                border: '1px solid rgba(255,255,255,.05)',
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,.05)',
                  border: '1px solid rgba(255,255,255,.1)',
                  color: 'var(--ink-2)',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {b.user?.photoUrl ? (
                  <img
                    src={b.user.photoUrl}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  initialsOf(b.user)
                )}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--ink-1)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayNameOf(b.user)}
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11,
                    color: 'var(--ink-3)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: 2,
                  }}
                >
                  {b.user?.email}
                </div>
              </div>

              <button
                type="button"
                className="settings-btn"
                onClick={() => setPendingUnblock(b)}
                disabled={unblockMutation.isPending}
                style={{ flexShrink: 0 }}
              >
                <ShieldOff size={11} />
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}

      <Alert
        isOpen={!!pendingUnblock}
        type="confirm"
        title="Unblock this user?"
        message={
          pendingUnblock
            ? `Unblock ${displayNameOf(pendingUnblock.user)}? You will need to send a new friend request to be friends again.`
            : ''
        }
        confirmText="Unblock"
        cancelText="Cancel"
        onConfirm={handleConfirm}
        onCancel={() => setPendingUnblock(null)}
      />
    </section>
  );
}


export default function ChatsPanel() {
  const { settings, update } = useSettings();
  const c = settings.chats;

  return (
    <>
      <section className="settings-section">
        <h4 className="settings-section-title">Composer</h4>
        <p className="settings-hint">
          How you send messages in a chat thread.
        </p>

        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Enter to send</span>
            <span className="settings-options-desc">
              Press Enter to send · Shift + Enter for a new line.
              Turn off to require Ctrl/Cmd + Enter.
            </span>
          </div>
          <Toggle
            on={c.enterToSend}
            onChange={(v) => update('chats', { enterToSend: v })}
            label="Enter to send"
          />
        </div>
      </section>

      <section className="settings-section">
        <h4 className="settings-section-title">Privacy</h4>
        <p className="settings-hint">
          What other participants can see about your activity.
        </p>

        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Send read receipts</span>
            <span className="settings-options-desc">
              When on, your message ticks turn green for senders once you
              read a message. When off, senders see ✓✓ grey but never
              green.
            </span>
          </div>
          <Toggle
            on={c.sendReadReceipts}
            onChange={(v) => update('chats', { sendReadReceipts: v })}
            label="Send read receipts"
          />
        </div>
      </section>

      <section className="settings-section">
        <h4 className="settings-section-title">Display</h4>
        <p className="settings-hint">
          What you see while inside a thread.
        </p>

        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Show "typing…" in thread</span>
            <span className="settings-options-desc">
              Display a live typing hint under the peer's name.
            </span>
          </div>
          <Toggle
            on={c.showTypingInThread}
            onChange={(v) => update('chats', { showTypingInThread: v })}
            label="Show typing indicator in thread header"
          />
        </div>
      </section>

      <BlockedUsersSection />
    </>
  );
}