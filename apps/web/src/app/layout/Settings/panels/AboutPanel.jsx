import { Mail, ExternalLink } from 'lucide-react';

import { useVersion } from '@/shared/api/version';
import { useSettingsModal } from '@/app/layout/Settings/SettingsModalContext';
import { useChangelogModal } from '@/features/changelog/ChangelogContext';
import { APP_VERSION } from '@/generated/version';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const MODE = import.meta.env.MODE || 'development';
const SUPPORT_EMAIL = 'support@mavrix.trade';

export default function AboutPanel() {
  const { closeSettings } = useSettingsModal();
  const { openAll } = useChangelogModal();
  const { data: versionData, isLoading } = useVersion();

  const currentRelease = versionData?.version || '—';
  const latestRelease = versionData?.latestRelease;
  const buildVersion = versionData?.buildVersion || APP_VERSION;

  const openChangelog = () => {
    closeSettings();
    openAll();
  };

  return (
    <>
      <section className="settings-section">
        <h4 className="settings-section-title">Application</h4>

        <dl className="settings-kv">
          <dt>Name</dt>
          <dd>Mavrix Journal</dd>

          <dt>Current release</dt>
          <dd>{isLoading ? '…' : currentRelease}</dd>

          {latestRelease?.date && (
            <>
              <dt>Released on</dt>
              <dd>{latestRelease.date}</dd>
            </>
          )}

          <dt>Web build</dt>
          <dd>{APP_VERSION}</dd>

          <dt>API build</dt>
          <dd>{buildVersion}</dd>

          <dt>Environment</dt>
          <dd>{MODE}</dd>

          <dt>API endpoint</dt>
          <dd>{API_BASE}</dd>
        </dl>
      </section>

      <section className="settings-section">
        <h4 className="settings-section-title">Releases</h4>
        <p className="settings-hint">
          Every published release, plus the newest changes. Admins publish
          releases instantly from Admin → Version & Changelog, no rebuild needed.
        </p>

        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Release history</span>
            <span className="settings-options-desc">
              Browse every published release in the full changelog.
            </span>
          </div>
          <button type="button" className="settings-btn" onClick={openChangelog}>
            <ExternalLink size={12} />
            View changelog
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h4 className="settings-section-title">Support</h4>
        <p className="settings-hint">
          Have a question, bug report, or feature request? Reach out.
        </p>

        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Email support</span>
            <span className="settings-options-desc">{SUPPORT_EMAIL}</span>
          </div>
          <a className="settings-btn" href={`mailto:${SUPPORT_EMAIL}`} rel="noopener noreferrer">
            <Mail size={12} />
            Send email
          </a>
        </div>
      </section>

      <section className="settings-section">
        <h4 className="settings-section-title">Legal</h4>

        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Terms of Service</span>
            <span className="settings-options-desc">Placeholder — final document coming soon.</span>
          </div>
          <span className="settings-btn" aria-disabled="true">Coming soon</span>
        </div>

        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Privacy Policy</span>
            <span className="settings-options-desc">Placeholder — final document coming soon.</span>
          </div>
          <span className="settings-btn" aria-disabled="true">Coming soon</span>
        </div>
      </section>
    </>
  );
}