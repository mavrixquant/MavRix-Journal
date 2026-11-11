// ============================================================================
// /changelog — full release history.
//
// Renders every entry from CHANGELOG.json newest-first with the current
// release highlighted. Reachable from the changelog modal footer, the About
// panel, and the sidebar's Product group.
// ============================================================================

import { Sparkles } from 'lucide-react';

import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import { useChangelog, useVersion } from '@/shared/api/version';
import { PageSkeleton } from '@/shared/ui/page-skeleton';
import EmptyState from '@/shared/components/EmptyState';

import './ChangelogPage.css';

const SECTION_KINDS = ['added', 'changed', 'fixed'];

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return iso; }
}

export default function ChangelogPage() {
  const { data, isLoading } = useChangelog();
  const { data: versionData } = useVersion();
  const currentVersion = versionData?.version || null;
  const releases = data?.releases || [];

  usePageHeader({
    title: 'Changelog',
    subtitle: 'Every release, every change, in one place.',
  });

  if (isLoading) return <PageSkeleton />;

  if (releases.length === 0) {
    return (
      <EmptyState
        size="lg"
        icon={Sparkles}
        eyebrow="Changelog"
        title="No releases yet"
        description="The first release will appear here once a CHANGELOG.json entry is published."
      />
    );
  }

  return (
    <div className="clp-root page-fade-in">
      <header className="clp-header">
        <div className="clp-eyebrow">Product updates</div>
        <h1 className="clp-title">Changelog</h1>
        <p className="clp-subtitle">
          {releases.length} release{releases.length === 1 ? '' : 's'} · newest first
        </p>
      </header>

      <div className="clp-timeline">
        {releases.map((r) => {
          const isCurrent = r.version === currentVersion;
          const sections = SECTION_KINDS
            .map((k) => ({ key: k, items: r.sections?.[k] || [] }))
            .filter((s) => s.items.length > 0);

          return (
            <article
              key={r.version}
              className={`clp-release${isCurrent ? ' is-current' : ''}`}
            >
              <div className="clp-release-head">
                <div className="clp-version-line">
                  <h2 className="clp-version">v{r.version}</h2>
                  {isCurrent && (
                    <span className="clp-current-badge">Current</span>
                  )}
                </div>
                {r.date && <span className="clp-date">{formatDate(r.date)}</span>}
              </div>

              {r.highlights?.length > 0 && (
                <ul className="clp-highlights">
                  {r.highlights.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              )}

              {sections.length > 0 && (
                <div className="clp-sections">
                  {sections.map((sec) => (
                    <div key={sec.key} className={`clp-section is-${sec.key}`}>
                      <div className="clp-section-label">{sec.key}</div>
                      <ul>
                        {sec.items.map((it, i) => <li key={i}>{it}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
