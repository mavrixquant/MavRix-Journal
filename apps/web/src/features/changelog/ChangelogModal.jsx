import { useEffect } from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';

import Portal from '@/shared/components/Portal';
import { useAuth } from '@/app/providers/AuthProvider';
import { useSettings } from '@/app/layout/Settings/SettingsProvider';
import { useChangelog, useVersion } from '@/shared/api/version';
import { useChangelogModal } from './ChangelogContext';

import './ChangelogModal.css';

const KIND_META = [
  { key: 'added',   label: 'Added' },
  { key: 'changed', label: 'Changed' },
  { key: 'fixed',   label: 'Fixed' },
];

const SESSION_KEY_PREFIX = 'mavrix:changelog:dismissed:';

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

// `missed` is newest-first (e.g. [v1.2, v1.1]). Reads as "You also missed ...".
function formatMissed(missed) {
  if (missed.length === 0) return '';
  if (missed.length === 1) return `v${missed[0].version}`;
  if (missed.length === 2) return `v${missed[0].version} and v${missed[1].version}`;
  return `${missed.length} older releases (back to v${missed[missed.length - 1].version})`;
}

// Has the user seen this release? Two ways to say "yes":
//   1. They acknowledged this exact version (backward compat, older rows).
//   2. They acknowledged a NEWER release (this happens when an admin deletes
//      the newest release and an older one becomes "latest"; without the
//      timestamp check we'd re-show the older release as if it were new).
function hasSeenRelease(release, seenVersion, seenAtIso) {
  if (!release) return false;
  if (seenVersion === release.version) return true;
  if (seenAtIso && release.publishedAt) {
    const seen = new Date(seenAtIso).getTime();
    const published = new Date(release.publishedAt).getTime();
    if (Number.isFinite(seen) && Number.isFinite(published)) {
      return published <= seen;
    }
  }
  return false;
}

// Used for the loading / empty / not-found cases.
function FallbackModal({ eyebrow = 'Changelog', title, onClose, action, children }) {
  return (
    <Portal>
      <div
        className="cm-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="cm-modal" role="dialog" aria-modal="true">
          <div className="cm-head">
            <span className="cm-icon" aria-hidden><Sparkles size={20} /></span>
            <div className="cm-head-text">
              <span className="cm-eyebrow">{eyebrow}</span>
              <h2 className="cm-title">{title}</h2>
            </div>
            <button
              type="button"
              className="cm-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          <div className="cm-body">
            <div
              style={{
                padding: '28px 8px',
                textAlign: 'center',
                color: '#8892A3',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                lineHeight: 1.65,
              }}
            >
              {children}
            </div>
          </div>
          <div className="cm-foot">
            {action ? (
              <>
                <span className="cm-foot-hint" />
                <button
                  type="button"
                  className="cm-btn-primary"
                  onClick={action.onClick}
                >
                  {action.label} <ArrowRight size={13} />
                </button>
              </>
            ) : (
              <button
                type="button"
                className="cm-btn-primary"
                onClick={onClose}
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}

export default function ChangelogModal() {
  const { user } = useAuth();
  const { settings, update, hydrated } = useSettings();
  const { isOpen, mode, targetVersion, close, openLatest, openAll } = useChangelogModal();
  const { data: changelog, isLoading: changelogLoading } = useChangelog();
  const { data: versionData } = useVersion();

  const releases = changelog?.releases || [];
  const latest = releases[0] || null;
  const currentVersion = versionData?.version || null;

  const acknowledgedVersion =
    settings.preferences?.lastAcknowledgedChangelogVersion ?? null;
  const acknowledgedAt =
    settings.preferences?.lastAcknowledgedChangelogAt ?? null;

  const specificRelease =
    mode === 'specific'
      ? releases.find((r) => r.version === targetVersion)
      : null;

  // In 'specific' mode a deleted release means no release to show;
  // everywhere else we fall back to `latest`.
  const releaseToShow = mode === 'specific' ? specificRelease : latest;

  // ---- Auto-open on first visit -----------------------------------------
  // Only fires when the user has genuinely not seen the current latest.
  // Timestamp guard (instead of version-equality) means that:
  //   • publishing a new release → auto-opens
  //   • deleting the newest release (nothing new) → does NOT auto-open
  useEffect(() => {
    if (!user || !latest || !hydrated) return;
    if (hasSeenRelease(latest, acknowledgedVersion, acknowledgedAt)) return;

    try {
      if (sessionStorage.getItem(SESSION_KEY_PREFIX + latest.version)) return;
    } catch {}

    if (!isOpen) openLatest();
  }, [user, latest, acknowledgedVersion, acknowledgedAt, hydrated, isOpen, openLatest]);

  // ---- Acknowledge -------------------------------------------------------
  // Stores the release version AND its publishedAt as the "seen at" marker.
  // In 'specific' mode (reviewing an old release), the marker becomes that
  // old release's publishedAt — the current latest is still considered unseen
  // and will auto-open next visit.
  const acknowledge = (release) => {
    if (!release) return;
    try {
      sessionStorage.setItem(SESSION_KEY_PREFIX + release.version, '1');
    } catch {}
    update('preferences', {
      lastAcknowledgedChangelogVersion: release.version,
      lastAcknowledgedChangelogAt:
        release.publishedAt || new Date().toISOString(),
    });
  };

  const handleClose = () => close();

  const handleGotIt = () => {
    acknowledge(releaseToShow);
    close();
  };

  // X means "dismiss" in latest/specific and "just close" in all-mode.
  // In all-mode the user is browsing the list, not a specific release,
  // so acknowledging would silently mark releases they only skimmed.
  const handleX = () => {
    if (mode === 'all') {
      close();
    } else {
      acknowledge(releaseToShow);
      close();
    }
  };

  // ---- Fallback states --------------------------------------------------
  if (!isOpen) return null;

  if (changelogLoading) {
    return (
      <FallbackModal
        eyebrow="Changelog"
        title="Loading releases…"
        onClose={handleClose}
      >
        One moment, we're pulling the latest release notes.
      </FallbackModal>
    );
  }

  if (releases.length === 0) {
    return (
      <FallbackModal
        eyebrow="Changelog"
        title="No releases yet"
        onClose={handleClose}
      >
        New releases will appear here as soon as an admin publishes one.
      </FallbackModal>
    );
  }

  if (mode === 'specific' && !specificRelease) {
    return (
      <FallbackModal
        eyebrow="Release notes"
        title="This release is no longer available"
        onClose={handleClose}
        action={{ label: 'Show latest', onClick: () => openLatest() }}
      >
        {targetVersion
          ? `Release v${targetVersion} may have been unpublished or removed.`
          : 'That release could not be found.'}
      </FallbackModal>
    );
  }

  if (!releaseToShow) return null;

  // ---- Normal render ----------------------------------------------------
  const isAll = mode === 'all';
  const isSpecific = mode === 'specific';

  const ackIdx = acknowledgedVersion
    ? releases.findIndex((r) => r.version === acknowledgedVersion)
    : -1;
  const missedList = ackIdx > 0 ? releases.slice(1, ackIdx) : [];

  const sections = KIND_META
    .map((k) => ({ ...k, items: releaseToShow.sections?.[k.key] || [] }))
    .filter((k) => k.items.length > 0);

  return (
    <Portal>
      <div
        className="cm-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleX();
        }}
      >
        <div className="cm-modal" role="dialog" aria-modal="true">
          <div className="cm-head">
            <span className="cm-icon" aria-hidden><Sparkles size={20} /></span>
            <div className="cm-head-text">
              <span className="cm-eyebrow">
                {isAll ? 'Changelog' : isSpecific ? 'Release Notes' : "What's new"}
              </span>
              <h2 className="cm-title">
                {isAll ? 'Release History' : `v${releaseToShow.version} is here`}
              </h2>
              {!isAll && releaseToShow.date && (
                <div className="cm-date">{formatReleaseDate(releaseToShow.date)}</div>
              )}
            </div>
            <button type="button" className="cm-close" onClick={handleX} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <div className={`cm-body ${isAll ? 'is-all-mode' : ''}`}>
            {isAll ? (
              <div className="cm-all-list">
                {releases.map((r) => {
                  const relSections = KIND_META
                    .map((k) => ({ ...k, items: r.sections?.[k.key] || [] }))
                    .filter((k) => k.items.length > 0);

                  return (
                    <div key={r.version} className="cm-release">
                      <div className="cm-release-head">
                        <h3 className="cm-release-version">v{r.version}</h3>
                        {r.version === currentVersion && (
                          <span className="cm-current-badge">Current</span>
                        )}
                        <span className="cm-release-date">
                          {formatReleaseDate(r.date)}
                        </span>
                      </div>
                      {r.highlights?.length > 0 && (
                        <ul className="cm-highlights">
                          {r.highlights.map((h, i) => <li key={i}>{h}</li>)}
                        </ul>
                      )}
                      {relSections.map((sec) => (
                        <div key={sec.key} className={`cm-kind is-${sec.key}`}>
                          <div className="cm-kind-head">{sec.label}</div>
                          <ul>
                            {sec.items.map((it, i) => <li key={i}>{it}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                {releaseToShow.highlights?.length > 0 && (
                  <div>
                    <div className="cm-section-label">Highlights</div>
                    <ul className="cm-highlights">
                      {releaseToShow.highlights.map((h, i) => <li key={i}>{h}</li>)}
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
              </>
            )}
          </div>

          <div className="cm-foot">
            {isAll ? (
              <button type="button" className="cm-btn-primary" onClick={handleClose}>
                Close
              </button>
            ) : (
              <>
                {!isSpecific && missedList.length > 0 ? (
                  <span className="cm-foot-missed">
                    You also missed {formatMissed(missedList)} -{' '}
                    <button
                      type="button"
                      className="cm-inline-link"
                      onClick={() => openAll()}
                    >
                      See all releases
                    </button>
                  </span>
                ) : (
                  <span className="cm-foot-hint">
                    New release Changelogs
                  </span>
                )}
                <button type="button" className="cm-btn-primary" onClick={handleGotIt}>
                  Got it <ArrowRight size={13} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}