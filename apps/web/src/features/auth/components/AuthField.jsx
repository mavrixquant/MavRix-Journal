import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const S = {
  wrap: { position: 'relative', marginBottom: 14 },
  icon: {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#545E6E',
    pointerEvents: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color .2s ease',
  },
  trail: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 30,
    height: 30,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    color: '#545E6E',
    cursor: 'pointer',
    borderRadius: 6,
    transition: 'all .2s',
  },
  error: {
    marginTop: 6,
    marginLeft: 4,
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
    fontSize: 11,
    color: '#fca5a5',
    letterSpacing: '.01em',
  },
};

const AuthField = forwardRef(function AuthField(
  {
    icon: Icon,
    type = 'text',
    placeholder,
    error,
    autoComplete,
    ...rest
  },
  ref
) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';
  const realType = isPassword && reveal ? 'text' : type;

  return (
    <div style={S.wrap}>
      {Icon && (
        <span style={S.icon} aria-hidden>
          <Icon size={16} />
        </span>
      )}

      <input
        ref={ref}
        type={realType}
        placeholder={placeholder}
        autoComplete={autoComplete}
        data-invalid={error ? 'true' : undefined}
        className={`auth-form-input ${Icon ? 'has-icon' : ''} ${isPassword ? 'has-trail' : ''}`}
        {...rest}
      />

      {isPassword && (
        <button
          type="button"
          tabIndex={-1}
          style={S.trail}
          onClick={() => setReveal((v) => !v)}
          aria-label={reveal ? 'Hide password' : 'Show password'}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--accent)';
            e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 8%, transparent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#545E6E';
            e.currentTarget.style.background = 'none';
          }}
        >
          {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}

      {error && <p style={S.error}>{error}</p>}
    </div>
  );
});

export default AuthField;