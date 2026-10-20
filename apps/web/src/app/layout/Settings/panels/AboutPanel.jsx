
import { Mail } from 'lucide-react';

const APP_VERSION = '0.1.0';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:4000';

const MODE = import.meta.env.MODE || 'development';

const SUPPORT_EMAIL = 'support@mavrixjournal.com';

export default function AboutPanel() {
  return (
    <>
      <section className="settings-section">
        <h4 className="settings-section-title">Application</h4>

        <dl className="settings-kv">
          <dt>Name</dt>
          <dd>Mavrix Journal</dd>

          <dt>Version</dt>
          <dd>{APP_VERSION}</dd>

          <dt>Environment</dt>
          <dd>{MODE}</dd>

          <dt>API endpoint</dt>
          <dd>{API_BASE}</dd>
        </dl>
      </section>

      <section className="settings-section">
        <h4 className="settings-section-title">Support</h4>
        <p className="settings-hint">
          Have a question, bug report, or feature request? Reach out.
        </p>

        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Email support</span>
            <span className="settings-options-desc">
              {SUPPORT_EMAIL}
            </span>
          </div>
          <a
            className="settings-btn"
            href={`mailto:${SUPPORT_EMAIL}`}
            rel="noopener noreferrer"
          >
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
            <span className="settings-options-desc">
              Placeholder — final document coming soon.
            </span>
          </div>
          <span className="settings-btn" aria-disabled="true">
            Coming soon
          </span>
        </div>

        <div className="settings-options-row">
          <div className="settings-options-text">
            <span className="settings-options-label">Privacy Policy</span>
            <span className="settings-options-desc">
              Placeholder — final document coming soon.
            </span>
          </div>
          <span className="settings-btn" aria-disabled="true">
            Coming soon
          </span>
        </div>
      </section>
    </>
  );
}