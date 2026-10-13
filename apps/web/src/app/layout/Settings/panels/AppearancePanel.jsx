// apps/web/src/app/layout/Settings/panels/AppearancePanel.jsx

import { Check } from 'lucide-react';
import { useSettings } from '../SettingsProvider';

const ACCENTS = [
  { hex: '#F59E0B', label: 'Amber'  },
  { hex: '#4C8BF5', label: 'Blue'   },
  { hex: '#35C4A1', label: 'Green'  },
  { hex: '#A78BFA', label: 'Violet' },
  { hex: '#F43F5E', label: 'Rose'   },
  { hex: '#22D3EE', label: 'Cyan'   },
];

const DENSITY = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact',     label: 'Compact'     },
];

const FONT_SIZE = [
  { value: 'small',  label: 'Small'  },
  { value: 'medium', label: 'Medium' },
  { value: 'large',  label: 'Large'  },
];

const REDUCE_MOTION = [
  { value: 'auto', label: 'Auto' },
  { value: 'on',   label: 'On'   },
  { value: 'off',  label: 'Off'  },
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

export default function AppearancePanel() {
  const { settings, update } = useSettings();
  const a = settings.appearance;

  return (
    <>
      <section className="settings-section">
        <h4 className="settings-section-title">Accent color</h4>
        <p className="settings-hint">
          Used across buttons, links, and highlights in components that
          support dynamic theming.
        </p>
        <div className="settings-colors">
          {ACCENTS.map((c) => {
            const active = a.accentColor === c.hex;
            return (
              <button
                key={c.hex}
                type="button"
                className={`settings-color${active ? ' is-active' : ''}`}
                style={{ background: c.hex, '--swatch-color': c.hex }}
                onClick={() => update('appearance', { accentColor: c.hex })}
                title={c.label}
                aria-label={c.label}
                aria-pressed={active}
              >
                {active && <Check size={14} strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="settings-section">
        <h4 className="settings-section-title">Density</h4>
        <p className="settings-hint">
          Adjust spacing in tables, lists, and cards.
        </p>
        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Layout density</span>
            <span className="settings-options-desc">
              Compact fits more rows on screen.
            </span>
          </div>
          <Segmented
            value={a.density}
            options={DENSITY}
            onChange={(v) => update('appearance', { density: v })}
          />
        </div>
      </section>

      <section className="settings-section">
        <h4 className="settings-section-title">Font size</h4>
        <p className="settings-hint">
          Adjust the base text size across the app.
        </p>
        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Base size</span>
            <span className="settings-options-desc">
              Scales body text and interface labels.
            </span>
          </div>
          <Segmented
            value={a.fontSize}
            options={FONT_SIZE}
            onChange={(v) => update('appearance', { fontSize: v })}
          />
        </div>
      </section>

      <section className="settings-section">
        <h4 className="settings-section-title">Motion</h4>
        <p className="settings-hint">
          Reduce or disable animations. "Auto" respects your operating
          system preference.
        </p>
        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Reduce motion</span>
            <span className="settings-options-desc">
              Collapses transitions and animations to a single frame.
            </span>
          </div>
          <Segmented
            value={a.reduceMotion}
            options={REDUCE_MOTION}
            onChange={(v) => update('appearance', { reduceMotion: v })}
          />
        </div>
      </section>
    </>
  );
}