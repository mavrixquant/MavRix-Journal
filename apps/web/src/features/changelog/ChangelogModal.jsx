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

function formatMissed(missed) {
  if (missed.length === 1) return `v${missed[0].version}`;
  if (missed.length === 2) return `v${missed[1].version} and v${missed[0].version}`;
  return `${missed.length - 1} older releases (up to v${missed[missed.length - 1].version})`;
}

export default function ChangelogModal() {
  const { user } = useAuth();
  const { settings, update, hydrated } = useSettings();
  const { isOpen, mode, targetVersion, close, openLatest, openAll } = useChangelogModal();
  const { data: changelog } = useChangelog();
  const { data: versionData } = useVersion();

  const latest = changelog?.releases?.[0] || null;
  const currentVersion = versionData?.version || null;
  const acknowledged = settings.preferences?.lastAcknowledgedChangelogVersion ?? null;

  const releases = changelog?.releases || [];
  const specificRelease = mode === 'specific' ? releases.find(r => r.version === targetVersion) : null;
  const releaseToShow = specificRelease || latest;

  useEffect(() => {
    if (!user || !latest || !hydrated) return;
    if (acknowledged === latest.version) return;

    try {
      if (sessionStorage.getItem(SESSION_KEY_PREFIX + latest.version)) return;
    } catch {}

    if (!isOpen) {
      openLatest();
    }
  }, [user, latest, acknowledged, hydrated, isOpen, openLatest]);

  if (!isOpen || !releaseToShow) return null;

  const isAll = mode === 'all';
  const isSpecific = mode === 'specific';

  const markAcknowledged = () => {
    if (releaseToShow && acknowledged !== releaseToShow.version) {
      try { sessionStorage.setItem(SESSION_KEY_PREFIX + releaseToShow.version, '1'); } catch {}
      update('preferences', { lastAcknowledgedChangelogVersion: releaseToShow.version });
    }
  };

  const handleGotIt = () => {
    markAcknowledged();
    close();
  };

  const handleClose = () => {
    markAcknowledged();
    close();
  };

  const handleX = () => {
    try { sessionStorage.setItem(SESSION_KEY_PREFIX + releaseToShow.version, '1'); } catch {}
    close();
  };

  // Calculate missed releases for the "latest" view
  const ackIdx = acknowledged ? releases.findIndex(r => r.version === acknowledged) : -1;
  const missedList = ackIdx > 0 ? releases.slice(1, ackIdx) : [];

  const sections = KIND_META
    .map((k) => ({ ...k, items: releaseToShow.sections?.[k.key] || [] }))
    .filter((k) => k.items.length > 0);

  return (
    <Portal>
      <div className="cm-overlay" onClick={(e) => { if (e.target === e.currentTarget) (isAll ? handleClose : handleX)(); }}>
        <div className="cm-modal" role="dialog" aria-modal="true">
          <div className="cm-head">
            <span className="cm-icon" aria-hidden><Sparkles size={20} /></span>
            <div className="cm-head-text">
              <span className="cm-eyebrow">{isAll ? 'Changelog' : (isSpecific ? 'Release Notes' : "What's new")}</span>
              <h2 className="cm-title">{isAll ? 'Release History' : `v${releaseToShow.version} is here`}</h2>
              {!isAll && releaseToShow.date && (
                <div className="cm-date">{formatReleaseDate(releaseToShow.date)}</div>
              )}
            </div>
            <button type="button" className="cm-close" onClick={isAll ? handleClose : handleX} aria-label="Close">
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
                        {r.version === currentVersion && <span className="cm-current-badge">Current</span>}
                        <span className="cm-release-date">{formatReleaseDate(r.date)}</span>
                      </div>
                      {r.highlights?.length > 0 && (
                        <ul className="cm-highlights">
                          {r.highlights.map((h, i) => <li key={i}>{h}</li>)}
                        </ul>
                      )}
                      {relSections.map(sec => (
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
                    <button type="button" className="cm-inline-link" onClick={() => openAll()}>
                      See all releases
                    </button>
                  </span>
                ) : (
                  <span className="cm-foot-hint">
                    You won't see this again until the next release.
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