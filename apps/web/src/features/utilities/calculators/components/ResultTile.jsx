import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { formatValue, rawValue } from '../lib/format.js';

export async function copyToClipboard(text, message = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message);
    return true;
  } catch {
    toast.error('Copy failed');
    return false;
  }
}

function resolveTone(tone, value) {
  if (tone === 'auto') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '';
    return value > 0 ? 'good' : value < 0 ? 'bad' : '';
  }
  return tone || '';
}

/** One result. Click (or Enter) copies the plain value. */
export default function ResultTile({ label, value, kind = 'num', decimals, tone, sub, primary, copy }) {
  const [done, setDone] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const t = resolveTone(tone, value);
  const text = formatValue(value, kind, decimals);

  const onCopy = async () => {
    const raw = copy ?? rawValue(value, kind, decimals);
    if (!raw) return;
    if (await copyToClipboard(raw, `Copied ${raw}`)) {
      setDone(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(false), 1400);
    }
  };

  return (
    <button
      type="button"
      className={`cx-result${primary ? ' is-primary' : ''}${t ? ` t-${t}` : ''}${done ? ' is-copied' : ''}`}
      onClick={onCopy}
      title="Click to copy"
    >
      <span className="cx-r-label">{label}</span>
      <span className="cx-r-val">{text}</span>
      {sub && <span className="cx-r-sub">{sub}</span>}
      <span className="cx-r-copy" aria-hidden>{done ? <Check size={13} /> : <Copy size={13} />}</span>
    </button>
  );
}
