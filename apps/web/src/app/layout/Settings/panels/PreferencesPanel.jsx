// apps/web/src/app/layout/Settings/panels/PreferencesPanel.jsx

import { useSettings } from '../SettingsProvider';

const LANDING = [
  { value: 'journal',    label: 'Journal'    },
  { value: 'backtester', label: 'Backtester' },
  { value: 'last',       label: 'Last'       },
];

const TIME_FORMAT = [
  { value: '24h', label: '24-hour' },
  { value: '12h', label: '12-hour' },
];

const DATE_FORMAT = [
  { value: 'iso', label: 'ISO'  },
  { value: 'us',  label: 'US'   },
  { value: 'eu',  label: 'EU'   },
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

export default function PreferencesPanel() {
  const { settings, update } = useSettings();
  const p = settings.preferences;

  return (
    <>
      <section className="settings-section">
        <h4 className="settings-section-title">Landing page</h4>
        <p className="settings-hint">
          Where the app takes you after signing in.
        </p>
        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Default landing</span>
            <span className="settings-options-desc">
              "Last" remembers your most recent dashboard.
            </span>
          </div>
          <Segmented
            value={p.defaultLanding}
            options={LANDING}
            onChange={(v) => update('preferences', { defaultLanding: v })}
          />
        </div>
      </section>

      <section className="settings-section">
        <h4 className="settings-section-title">Time &amp; date</h4>
        <p className="settings-hint">
          Display formats for timestamps across the app.
        </p>

        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Time format</span>
            <span className="settings-options-desc">
              Applies to entry, exit, and message timestamps.
            </span>
          </div>
          <Segmented
            value={p.timeFormat}
            options={TIME_FORMAT}
            onChange={(v) => update('preferences', { timeFormat: v })}
          />
        </div>

        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Date format</span>
            <span className="settings-options-desc">
              ISO: 2026-10-13 · US: 10/13/2026 · EU: 13/10/2026
            </span>
          </div>
          <Segmented
            value={p.dateFormat}
            options={DATE_FORMAT}
            onChange={(v) => update('preferences', { dateFormat: v })}
          />
        </div>
      </section>

      <section className="settings-section">
        <h4 className="settings-section-title">Safety</h4>
        <p className="settings-hint">
          Controls for actions that cannot be undone.
        </p>

        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Confirm destructive actions</span>
            <span className="settings-options-desc">
              Show a confirmation dialog before deleting trades, accounts,
              or strategies.
            </span>
          </div>
          <Toggle
            on={p.confirmDestructive}
            onChange={(v) => update('preferences', { confirmDestructive: v })}
            label="Confirm destructive actions"
          />
        </div>
      </section>
    </>
  );
}