import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Pipette } from 'lucide-react';
import Portal from '@/shared/components/Portal';
import { isHexColor, parseColor } from '../../lib/colorUtil';
import { loadRecentColors, pushRecentColor } from '../../lib/chartSettings';
import { SETTINGS_CSS } from './settingsStyles';

/* ------------------------------- palette data ------------------------------- */

// The app's own quick colours (first row).
export const THEME_COLORS = [
  '#F5B544', '#FF5C5C', '#35C4A1', '#5EA8FF', '#B58CFF', '#FF8AD8', '#FFD166', '#7DD3FC', '#E7E9EE', '#8892A3',
];

const GRAYS = ['#FFFFFF', '#E7E9EE', '#B4BBC8', '#8892A3', '#5C6677', '#3A4252', '#252B38', '#131720', '#0A0D13', '#000000'];
const HUES = [0, 24, 46, 100, 158, 188, 214, 254, 284, 330]; // red → pink
const SHADES = [[88, 80], [74, 80], [60, 82], [47, 80], [34, 70]]; // [lightness, saturation]

function hsl(h, s, l) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// 6 rows × 10 columns: greys, then five shades for each hue.
export const GRID = [GRAYS, ...SHADES.map(([l, s]) => HUES.map((h) => hsl(h, s, l)))];

/* --------------------------------- popover --------------------------------- */

const PANEL_W = 252;

/**
 * Colour palette popover. Used everywhere a colour is asked: dialogs, the selected-drawing bar,
 * the drawing rail. `renderTrigger({ ref, onClick, open })` lets toolbars bring their own button.
 */
export function ColorPopover({
  value, onChange, opacity, onOpacity, label = 'Colour', renderTrigger, placement = 'bottom', compact = false,
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [recent, setRecent] = useState([]);
  const [hexText, setHexText] = useState('');
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const hex = parseColor(value).hex;

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const h = panelRef.current?.offsetHeight || (onOpacity ? 372 : 330);
    let left; let top;
    if (placement === 'right') {
      left = r.right + 8; top = r.top;
      if (left + PANEL_W > window.innerWidth - 8) left = r.left - PANEL_W - 8;
    } else {
      left = r.left; top = r.bottom + 6;
      if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    }
    left = Math.max(8, Math.min(left, window.innerWidth - PANEL_W - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - h - 8));
    setPos({ left, top });
  }, [placement, onOpacity]);

  const toggle = () => {
    if (!open) { setRecent(loadRecentColors()); setHexText(hex); }
    setOpen((v) => !v);
  };

  useLayoutEffect(() => { if (open) place(); }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (panelRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btnRef.current?.focus?.(); } };
    const onResize = () => setOpen(false);
    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const pick = (c) => {
    const h = parseColor(c).hex;
    onChange(h);
    setHexText(h);
    setRecent(pushRecentColor(h));
  };

  const trigger = renderTrigger
    ? renderTrigger({ ref: btnRef, onClick: toggle, open })
    : (
      <button
        ref={btnRef} type="button" className={`cs-trigger${compact ? ' is-compact' : ''}`} onClick={toggle}
        aria-haspopup="dialog" aria-expanded={open} aria-label={`${label}: ${hex}`}
      >
        <i className="cs-chip" style={{ '--c': hex, '--a': opacity ?? 1 }} />
        {!compact && <span>{hex.toUpperCase()}</span>}
        {!compact && <ChevronDown size={12} />}
      </button>
    );

  return (
    <>
      {trigger}
      {open && (
        <Portal>
          <style>{SETTINGS_CSS}</style>
          <div ref={panelRef} className="cs-palette" role="dialog" aria-label={label} style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, width: PANEL_W }}>
            <div className="cs-pal-title">Theme</div>
            <div className="cs-pal-grid">
              {THEME_COLORS.map((c) => <Swatch key={c} c={c} on={hex === c.toLowerCase()} onPick={pick} />)}
            </div>

            <div className="cs-pal-title">Palette</div>
            <div className="cs-pal-grid">
              {GRID.flat().map((c, i) => <Swatch key={`${c}${i}`} c={c} on={hex === c.toLowerCase()} onPick={pick} />)}
            </div>

            {recent.length > 0 && (
              <>
                <div className="cs-pal-title">Recent</div>
                <div className="cs-pal-grid">
                  {recent.map((c) => <Swatch key={c} c={c} on={hex === c.toLowerCase()} onPick={pick} />)}
                </div>
              </>
            )}

            <div className="cs-pal-custom">
              <label className="cs-pal-pick" title="Pick any colour" aria-label="Pick a custom colour">
                <Pipette size={13} />
                <input type="color" value={hex} onChange={(e) => pick(e.target.value)} />
              </label>
              <input
                className="cs-input" value={hexText} spellCheck={false} maxLength={7} aria-label="Hex colour"
                onChange={(e) => {
                  let v = e.target.value.trim();
                  if (v && !v.startsWith('#')) v = `#${v}`;
                  setHexText(v);
                  if (isHexColor(v)) pick(v);
                }}
                placeholder="#RRGGBB"
              />
            </div>

            {onOpacity && (
              <div className="cs-pal-opacity">
                <span>Opacity</span>
                <input type="range" min={0.1} max={1} step={0.05} value={opacity ?? 1} onChange={(e) => onOpacity(Number(e.target.value))} aria-label="Opacity" />
                <output>{Math.round((opacity ?? 1) * 100)}%</output>
              </div>
            )}
          </div>
        </Portal>
      )}
    </>
  );
}

function Swatch({ c, on, onPick }) {
  return (
    <button type="button" className={`cs-pal-sw${on ? ' is-on' : ''}`} style={{ background: c }} onClick={() => onPick(c)} aria-label={c} title={c.toUpperCase()}>
      {on && <Check size={10} color={isLight(c) ? '#0A0D14' : '#fff'} />}
    </button>
  );
}

function isLight(hex) {
  const { hex: h } = parseColor(hex);
  const r = parseInt(h.slice(1, 3), 16); const g = parseInt(h.slice(3, 5), 16); const b = parseInt(h.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

/** Compact swatch-only trigger (used in dense rows such as the fib levels). */
export function ColorSwatch({ value, onChange, label }) {
  return <ColorPopover value={value} onChange={onChange} label={label} compact />;
}

