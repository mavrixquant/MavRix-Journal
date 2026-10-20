
import { useSettings } from '../SettingsProvider';

const CHAT_LEVEL = [
  { value: 'all',   label: 'All'    },
  { value: 'dms',   label: 'DMs'    },
  { value: 'muted', label: 'Muted'  },
];

function Segmented({ value, options, onChange }) {
  return (
    <div className="settings-segmented">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`settings-segmented-btn${value === opt.value ? ' is-active' : ''}`}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

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

export default function NotificationsPanel() {
  const { settings, update } = useSettings();
  const n = settings.notifications;

  return (
    <>
      <section className="settings-section">
        <h4 className="settings-section-title">Broadcasts</h4>
        <p className="settings-hint">
          App-wide announcements sent by administrators.
        </p>

        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Show broadcast banner</span>
            <span className="settings-options-desc">
              Display a banner when a new broadcast is received.
            </span>
          </div>
          <Toggle
            on={n.broadcastBanner}
            onChange={(v) => update('notifications', { broadcastBanner: v })}
            label="Show broadcast banner"
          />
        </div>
      </section>

      <section className="settings-section">
        <h4 className="settings-section-title">Chat</h4>
        <p className="settings-hint">
          Notifications from direct messages and groups.
        </p>

        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Notify me about</span>
            <span className="settings-options-desc">
              All = DMs + groups · DMs = direct only · Muted = no chat alerts.
            </span>
          </div>
          <Segmented
            value={n.chatNotifications}
            options={CHAT_LEVEL}
            onChange={(v) => update('notifications', { chatNotifications: v })}
          />
        </div>

        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Play sound</span>
            <span className="settings-options-desc">
              Play a soft chime when a new message arrives.
            </span>
          </div>
          <Toggle
            on={n.chatSound}
            onChange={(v) => update('notifications', { chatSound: v })}
            label="Play sound on new message"
          />
        </div>

        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Show "typing…" in list</span>
            <span className="settings-options-desc">
              Display a live typing hint next to active conversations.
            </span>
          </div>
          <Toggle
            on={n.showTypingInList}
            onChange={(v) => update('notifications', { showTypingInList: v })}
            label="Show typing indicator in conversation list"
          />
        </div>
      </section>
    </>
  );
}