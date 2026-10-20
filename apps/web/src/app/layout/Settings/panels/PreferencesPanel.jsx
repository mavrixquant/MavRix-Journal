
import { useMemo, useState } from 'react';
import { Check, ChevronDown, Globe, Search } from 'lucide-react';
import { Command } from 'cmdk';

import { useSettings } from '../SettingsProvider';
import {
  getAllTimezones,
  getTimezoneOffsetString,
  browserTimezoneLabel,
} from '@/shared/format/datetime';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover';

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


function TimezonePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const zones = useMemo(() => getAllTimezones(), []);
  const browserTz = browserTimezoneLabel();
  const isAuto = !value || value === 'auto';

  const currentCity = isAuto ? `Auto (browser)` : (value.split('/').pop() || value).replace(/_/g, ' ');
  const currentOffset = getTimezoneOffsetString(isAuto ? browserTz : value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="settings-tz-trigger"
          aria-label="Time zone"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <Globe size={13} className="settings-tz-trigger-icon" />
          <span className="settings-tz-trigger-label">{currentCity}</span>
          <span className="settings-tz-trigger-offset">{currentOffset}</span>
          <ChevronDown size={12} className="settings-tz-trigger-chevron" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="settings-tz-pop"
      >
        <Command className="settings-tz-cmd">
          <div className="settings-tz-search">
            <Search size={12} />
            <Command.Input
              className="settings-tz-input"
              placeholder="Search city, region, or offset…"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <Command.List className="settings-tz-list">
            <Command.Empty className="settings-tz-empty">
              No timezones match.
            </Command.Empty>

            {}
            <Command.Item
              value={`auto browser ${browserTz} ${getTimezoneOffsetString(browserTz)}`}
              onSelect={() => { onChange('auto'); setOpen(false); }}
              className={`settings-tz-item is-auto${isAuto ? ' is-current' : ''}`}
            >
              <span className="settings-tz-item-body">
                <span className="settings-tz-item-city">Auto (browser)</span>
                <span className="settings-tz-item-sub">{browserTz}</span>
              </span>
              <span className="settings-tz-item-offset">
                {getTimezoneOffsetString(browserTz)}
              </span>
              {isAuto && <Check size={12} className="settings-tz-item-check" />}
            </Command.Item>              {zones.map((z) => {
                const isCurrent = value === z.value;
                return (
                  <Command.Item
                    key={z.value}
                    value={`${z.city} ${z.region} ${z.offset} ${z.value}`}
                    onSelect={() => { onChange(z.value); setOpen(false); }}
                    className={`settings-tz-item${isCurrent ? ' is-current' : ''}`}
                  >
                    <span className="settings-tz-item-body">
                      <span className="settings-tz-item-city">{z.city}</span>
                      <span className="settings-tz-item-sub">{z.value}</span>
                    </span>
                    <span className="settings-tz-item-offset">{z.offset}</span>
                    {isCurrent && (
                      <Check size={12} className="settings-tz-item-check" />
                    )}
                  </Command.Item>
                );
              })}          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


export default function PreferencesPanel() {
  const { settings, update } = useSettings();
  const p = settings.preferences;

  const isAutoTz = !p.timezone || p.timezone === 'auto';
  const tzHint = isAutoTz
    ? `Following your browser · ${browserTimezoneLabel()}`
    : 'Timestamps are shown in this time zone.';

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
          Display formats and timezone for timestamps across the app.
        </p>

        {}
        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Time zone</span>
            <span className="settings-options-desc">{tzHint}</span>
          </div>
          <TimezonePicker
            value={p.timezone || 'auto'}
            onChange={(v) => update('preferences', { timezone: v })}
          />
        </div>

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