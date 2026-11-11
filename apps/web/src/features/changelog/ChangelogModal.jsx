// ============================================================================
// "What's new" modal - shown once per user per release.
//
// Gate logic:
//   - latest CHANGELOG release must match the running bundle version
//   - user.preferences.lastSeenChangelogVersion must differ from that version
//   - sessionStorage key prevents re-showing in the same tab (StrictMode safe)
//
// On dismiss, lastSeenChangelogVersion is saved through SettingsProvider,
// which is debounced and syncs to the server automatically.
// ============================================================================

import { useEffect, useState } from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';

import Portal from '@/shared/components/Portal';
import { useAuth } from '@/app/providers/AuthProvider';
import { useSettings } from '@/app/layout/Settings/SettingsProvider';
import { useChangelog, APP_VERSION } from '@/shared/api/version';

import './ChangelogModal.css';

const SESSION_KEY = 'mavrix:changelog-shown:';

const KIND_META = [
  { key: 'added',   label: 'Added' },
  { key: 'changed', label: 'Changed' },
  { key: 'fixed',   label: 'Fixed' },
];

function formatReleaseDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return iso; }
}

export default function ChangelogModal() {
  const { user } = useAuth();
  const { settings, update } = useSettings();
  const { data: changelog } = useChangelog();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || !changelog) return;
    const latest = changelog.releases?.[0];
    if (!latest) return;
    if (latest.version !== APP_VERSION) return;

    const seen = settings.preferences?.lastSeenChangelogVersion;
    if (seen === latest.version) return;

    try {
      if (sessionStorage.getItem(SESSION_KEY + latest.version)) return;
    } catch {}

    setOpen(true);
  }, [user, changelog, settings.preferences?.lastSeenChangelogVersion]);

  if (!open || !changelog?.releases?.[0]) return null;
  const latest = changelog.releases[0];

  const dismiss = () => {
    try { sessionStorage.setItem(SESSION_KEY + latest.version, '1'); } catch {}
    setOpen(false);
    update('preferences', { lastSeenChangelogVersion: latest.version });
  };

  const sections = KIND_META
    .map((k) => ({ ...k, items: latest.sections?.[k.key] || [] }))
    .filter((k) => k.items.length > 0);

  return (
    <Portal>
      <div
        className="cm-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
      >
        <div className="cm-modal" role="dialog" aria-modal="true">
          <div className="cm-head">
            <span className="cm-icon" aria-hidden><Sparkles size={20} /></span>
            <div className="cm-head-text">
              <span className="cm-eyebrow">What's new</span>
              <h2 className="cm-title">v{latest.version} is here</h2>
              {latest.date && (
                <div className="cm-date">{formatReleaseDate(latest.date)}</div>
              )}
            </div>
            <button
              type="button"
              className="cm-close"
              onClick={dismiss}
              aria-label="Dismiss changelog"
            >
              <X size={16} />
            </button>
          </div>

          <div className="cm-body">
            {latest.highlights?.length > 0 && (
              <div>
                <div className="cm-section-label">Highlights</div>
                <ul className="cm-highlights">
                  {latest.highlights.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </div>
            )}

            {sections.length > 0 && (
              <div className="cm-kinds">
                {sections.map((sec) => (
                  <div key={sec.key} className={`cm-kind is-${sec.key}`}>
                    <div className="cm-kind-head">{sec.label}</div>
                    <ul>
                      {sec.items.map((it, i) => <li key={i}>{it}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="cm-foot">
            <span className="cm-foot-hint">
              You won't see this again until the next release.
            </span>
            <button type="button" className="cm-btn-primary" onClick={dismiss}>
              Got it <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
