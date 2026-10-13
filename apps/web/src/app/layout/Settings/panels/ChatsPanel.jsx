// apps/web/src/app/layout/Settings/panels/ChatsPanel.jsx

import { useSettings } from '../SettingsProvider';

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
    </>
  );
}