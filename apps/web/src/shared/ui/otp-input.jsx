import { useEffect, useRef, useState } from 'react';

const CSS = `
  .otp-root {
    position: relative;
    display: block;
    width: 100%;
    max-width: 380px;
    margin: 0 auto;
  }
  .otp-root.is-disabled { opacity: .55; }

  .otp-hidden-input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    font-size: 16px;
    color: transparent;
    caret-color: transparent;
    background: transparent;
    border: none;
    outline: none;
    cursor: text;
    z-index: 2;
    padding: 0;
    letter-spacing: 0;
  }
  .otp-hidden-input:disabled { cursor: not-allowed; }

  .otp-boxes {
    display: flex;
    gap: 8px;
    justify-content: center;
    width: 100%;
    pointer-events: none;
  }

  .otp-box {
    position: relative;
    flex: 1 1 0;
    max-width: 54px;
    height: 60px;
    background: rgba(10,13,19,.7);
    border: 1.5px solid rgba(255,255,255,.1);
    border-radius: 12px;
    color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 24px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    transition: border-color .18s ease, background-color .18s ease, box-shadow .18s ease;
    user-select: none;
  }

  .otp-box.is-filled {
    border-color: color-mix(in srgb, var(--accent) 42%, transparent);
    background: color-mix(in srgb, var(--accent) 5%, transparent);
  }

  .otp-box.is-cursor {
    border-color: var(--accent);
    background: rgba(10,13,19,.95);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
  }

  .otp-root.is-focused .otp-box.is-cursor {
    animation: otpCursor 1.4s ease-in-out infinite;
  }

  @keyframes otpCursor {
    0%, 100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent); }
    50%      { box-shadow: 0 0 0 5px color-mix(in srgb, var(--accent) 8%, transparent); }
  }

  @media (max-width: 420px) {
    .otp-box { height: 52px; font-size: 20px; border-radius: 10px; }
    .otp-boxes { gap: 6px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .otp-box,
    .otp-root.is-focused .otp-box.is-cursor {
      transition: none;
      animation: none;
    }
  }
`;

export function OtpInput({
  value = '',
  onChange,
  length = 6,
  disabled = false,
  autoFocus = true,
  className = '',
}) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!autoFocus) return undefined;
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, [autoFocus]);

  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, length);
    onChange?.(digits);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData?.getData('text') || '')
      .replace(/\D/g, '')
      .slice(0, length);
    if (text) onChange?.(text);
  };

  const boxes = Array.from({ length }, (_, i) => value[i] || '');
  const cursorIdx = value.length < length ? value.length : -1;

  return (
    <div
      className={`otp-root ${disabled ? 'is-disabled' : ''} ${focused ? 'is-focused' : ''} ${className}`.trim()}
    >
      <style>{CSS}</style>
      <input
        ref={inputRef}
        className="otp-hidden-input"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        value={value}
        disabled={disabled}
        onChange={handleChange}
        onPaste={handlePaste}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label={`${length}-digit code`}
      />
      <div className="otp-boxes" aria-hidden="true">
        {boxes.map((ch, i) => {
          const isFilled = !!ch;
          const isCursor = i === cursorIdx;
          return (
            <div
              key={i}
              className={`otp-box ${isFilled ? 'is-filled' : ''} ${isCursor ? 'is-cursor' : ''}`.trim()}
            >
              {ch}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default OtpInput;