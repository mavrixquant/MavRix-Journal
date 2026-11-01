import { useMemo, useState } from 'react';
import { useSettings } from '@/app/layout/Settings/SettingsProvider';
import { resolveTimezone, dayKey, formatTime } from '@/shared/format/datetime';

function relative(ms) {
  if (ms <= 0) return 'now';
  const m = Math.round(ms / 6e4);
  if (m < 60) return `in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `in ${h}h ${m % 60}m`;
  return `in ${Math.floor(h / 24)}d ${h % 24}h`;
}

export default function ComingUp({ events = [], now, onOpenEvent }) {
  const { settings } = useSettings();
  const tz = useMemo(() => resolveTimezone(settings.preferences.timezone), [settings.preferences.timezone]);
  const timeFormat = settings.preferences.timeFormat;
  const [highOnly, setHighOnly] = useState(false);

  const todayKey = dayKey(new Date(now).toISOString(), tz);
  const tomorrowKey = dayKey(new Date(now + 864e5).toISOString(), tz);

  const rows = useMemo(
    () => (highOnly ? events.filter((e) => e.impact === 'high') : events).slice(0, 40),
    [events, highOnly]
  );

  const dayLabel = (key) => {
    if (key === todayKey) return 'Today';
    if (key === tomorrowKey) return 'Tomorrow';
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  };

  return (
    <div className="ec-card ec-grow cu-card">
      <div className="cu-head">
        <span className="cu-title">Coming up</span>
        <span className="cu-count">{rows.length}</span>
        <button
          type="button"
          className={`cu-toggle${highOnly ? ' is-active' : ''}`}
          onClick={() => setHighOnly((v) => !v)}
          aria-pressed={highOnly}
        >
          High impact only
        </button>
      </div>

      <div className="cu-scroll">
        {rows.length === 0 && (
          <div className="cu-empty">
            Nothing pending{highOnly ? ' at high impact' : ''} in the next 7 days
            {events.length === 0 ? '' : '. Turn off the high-impact filter to see everything.'}
          </div>
        )}
        {rows.map((e) => {
          const key = dayKey(e.dateTimeUtc, tz);
          return (
            <button key={e.id} type="button" className="cu-row" onClick={() => onOpenEvent?.(e.id)}>
              <span className="cu-when">
                <b>{formatTime(e.dateTimeUtc, timeFormat, tz)}</b>
                <i>{dayLabel(key)}</i>
              </span>
              <span className="cu-main">
                <span className="cu-name" title={e.event}>{e.event}</span>
                <span className="cu-meta">
                  <span className={`cu-dot ${e.impact}`} />
                  {e.currency}
                  {e.forecast ? ` · forecast ${e.forecast}` : ''}
                </span>
              </span>
              <span className="cu-in">{relative(new Date(e.dateTimeUtc).getTime() - now)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}