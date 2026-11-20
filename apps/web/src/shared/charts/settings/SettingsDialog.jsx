import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Portal from '@/shared/components/Portal';
import { SETTINGS_CSS } from './settingsStyles';

/**
 * Dialog shell shared by the drawing and indicator settings.
 * Esc / backdrop = cancel; the host decides what that means (revert the preview).
 */
export default function SettingsDialog({ title, dot, tabs, tab, onTab, onCancel, footer, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCancel(); }
    };
    window.addEventListener('keydown', onKey, true);
    const prev = document.activeElement;
    ref.current?.querySelector('input,select,button.cs-sw')?.focus?.({ preventScroll: true });
    return () => { window.removeEventListener('keydown', onKey, true); prev?.focus?.({ preventScroll: true }); };
  }, [onCancel]);

  return (
    <Portal>
      <style>{SETTINGS_CSS}</style>
      <div className="cs-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
        <div className="cs-dialog" ref={ref} role="dialog" aria-modal="true" aria-label={title}>
          <div className="cs-head">
            {dot && <i className="cs-dot" style={{ background: dot }} />}
            <h2>{title}</h2>
            <button type="button" className="cs-x" onClick={onCancel} aria-label="Close"><X size={14} /></button>
          </div>
          {tabs && tabs.length > 1 && (
            <div className="cs-tabs" role="tablist">
              {tabs.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => onTab(t.id)}>{t.label}</button>
              ))}
            </div>
          )}
          <div className="cs-body">{children}</div>
          <div className="cs-foot">{footer}</div>
        </div>
      </div>
    </Portal>
  );
}
