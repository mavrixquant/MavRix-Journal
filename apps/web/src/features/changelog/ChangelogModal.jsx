// ============================================================================
// "What's new" modal - shown once per published release, per user.
//
// Gate logic:
//   1. Wait for useSettings() hydration (server preferences fetched).
//   2. Latest published release must not match preferences.lastSeenChangelogVersion.
//   3. On match, mark as seen IMMEDIATELY (not on dismiss), so closing the tab
//      without clicking "Got it" doesn't cause re-show on next login.
//
// Live: the server broadcasts `invalidate` with ['changelog'] on every publish,
// so the query refetches and this effect fires without a page reload.
//
// Missed releases: captured BEFORE the preference write so the footer can still
// show "You also missed v1.1.0 · See all releases".
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, ArrowRight } from 'lucide-react';

import Portal from '@/shared/components/Portal';
import { useAuth } from '@/app/providers/AuthProvider';
import { useSettings } from '@/app/layout/Settings/SettingsProvider';
import { useChangelog } from '@/shared/api/version';

import './ChangelogModal.css';

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

function formatMissed(missed) {
  if (missed.length === 1) return `v${missed[0].version}`;
  if (missed.length === 2) return `v${missed[1].version} and v${missed[0].version}`;
  return `${missed.length - 1} older releases (up to v${missed[missed.length - 1].version})`;
}

export default function ChangelogModal() {
  const { user } = useAuth();
  const { settings, update, hydrated } = useSettings();
  const navigate = useNavigate();
  const { data: changelog } = useChangelog();
  const [open, setOpen] = useState(false);
  const [missedList, setMissedList] = useState([]);

  // Guards against double-firing when `seen` updates mid-open (which happens
  // because we write the preference on open, not on dismiss).
  const firedForRef = useRef(null);

  const latest = changelog?.releases?.[0] || null;
  const seen = settings.preferences?.lastSeenChangelogVersion || null;

  useEffect(() => {
    if (!user || !latest || !hydrated) return;
    if (firedForRef.current === latest.version) return;
    if (seen === latest.version) return;

    // Capture the misses BEFORE writing the preference; otherwise seenIdx
    // would equal currentIdx and missedList would collapse to [].
    const releases = changelog?.releases || [];
    const seenIdx = seen ? releases.findIndex((r) => r.version === seen) : -1;
    const missed = seenIdx > 0 ? releases.slice(1, seenIdx) : [];
    setMissedList(missed);

    firedForRef.current = latest.version;
    setOpen(true);

    // Mark as seen immediately. Do NOT wait for the user to dismiss - that
    // would let the modal re-show next time they open the app.
    update('preferences', { lastSeenChangelogVersion: latest.version });
  }, [user, latest, seen, hydrated, changelog?.releases, update]);

  if (!open || !latest) return null;

  const dismiss = () => setOpen(false);
  const goToAll = () => { setOpen(false); navigate('/changelog'); };

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
            {missedList.length > 0 ? (
              <span className="cm-foot-missed">
                You also missed {formatMissed(missedList)} ·{' '}
                <button
                  type="button"
                  className="cm-inline-link"
                  onClick={goToAll}
                >
                  See all releases
                </button>
              </span>
            ) : (
              <span className="cm-foot-hint">
                You won't see this again until the next release.
              </span>
            )}
            <button type="button" className="cm-btn-primary" onClick={dismiss}>
              Got it <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}