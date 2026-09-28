// apps/web/src/app/ErrorBoundary.jsx
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
    this.setState({ info });
  }

  handleReload = () => {
    window.location.reload();
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
            Runtime error
          </div>

          <h1
            style={{
              margin: '0 0 8px',
              fontSize: '1.35rem',
              fontWeight: 700,
              letterSpacing: '-.02em',
            }}
          >
            Something broke while rendering.
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
            This usually means a lazy-loaded chunk failed to load, or a module
            threw at import time. The exact error is below — copy it if you need
            help debugging.
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

          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #F59E0B, #FDE68A)',
              color: '#0D1117',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '.02em',
              cursor: 'pointer',
              boxShadow:
                '0 10px 30px -8px rgba(245,158,11,.55), inset 0 1px 0 rgba(255,255,255,.4)',
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}