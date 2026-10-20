import { Component } from 'react';

/**
 * Error boundary scoped to the admin panel.
 *
 * If AdminLayout or any admin page throws during render, this catches it and
 * shows a specific, actionable error — instead of the page silently going
 * blank or falling through to the app-wide ErrorBoundary.
 *
 * Why we need this in addition to the root ErrorBoundary:
 *   - The root boundary shows a generic "Something broke" for the whole app.
 *   - An admin-scoped one keeps the user oriented (they were in /admin) and
 *     offers a clear "Go to Journal" escape hatch.
 *   - It logs the error to console with full details so prod issues are
 *     debuggable without a local repro.
 */
export default class AdminErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[AdminErrorBoundary] caught render error:', error);
    console.error('[AdminErrorBoundary] component stack:', info?.componentStack);
    this.setState({ info });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleBack = () => {
    window.location.href = '/journal';
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#0A0D13',
          color: '#E7E9EE',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: 640,
            width: '100%',
            background:
              'linear-gradient(180deg, rgba(18,21,28,.82), rgba(12,16,23,.72))',
            border: '1px solid rgba(239,68,68,.35)',
            borderRadius: 16,
            padding: '28px 28px 24px',
            boxShadow: '0 40px 100px -40px rgba(0,0,0,.9)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              color: '#f87171',
              marginBottom: 12,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 10px #ef4444',
              }}
            />
            Admin panel error
          </div>

          <h1
            style={{
              margin: '0 0 8px',
              fontSize: '1.35rem',
              fontWeight: 700,
              letterSpacing: '-.02em',
            }}
          >
            The admin panel crashed while rendering.
          </h1>

          <p
            style={{
              margin: '0 0 20px',
              fontSize: 13,
              lineHeight: 1.7,
              color: '#8892A3',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            Copy the error below if you need help debugging, then reload. The
            issue is isolated to /admin — the rest of the app still works.
          </p>

          <pre
            style={{
              margin: '0 0 20px',
              padding: 14,
              background: 'rgba(0,0,0,.4)',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 10,
              fontSize: 11.5,
              lineHeight: 1.55,
              color: '#fca5a5',
              fontFamily: "'IBM Plex Mono', monospace",
              overflowX: 'auto',
              maxHeight: 240,
            }}
          >
{String(error?.stack || error?.message || error)}
{info?.componentStack ? `\n\nComponent stack:${info.componentStack}` : ''}
          </pre>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                color: '#0D1117',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '.02em',
                cursor: 'pointer',
              }}
            >
              Reload page
            </button>
            <button
              type="button"
              onClick={this.handleBack}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,.14)',
                background: 'rgba(255,255,255,.03)',
                color: '#8892A3',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '.02em',
                cursor: 'pointer',
              }}
            >
              Go to Journal
            </button>
          </div>
        </div>
      </div>
    );
  }
}