// Small inline SVG icons for tools / chart types that lucide doesn't cover reliably.
import { MousePointer2, Minus, MoveUpRight, Square, Ruler, TrendingUp } from 'lucide-react';

const S = { width: 15, height: 15, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' };

function TrendIcon() {
  return (
    <svg {...S} aria-hidden>
      <path d="M3 12.5 13 3.5" />
      <circle cx="3" cy="12.5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="13" cy="3.5" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
function FibIcon() {
  return (
    <svg {...S} aria-hidden>
      <path d="M2 3h12M2 6.5h12M2 10h12M2 13.5h12" />
      <path d="M4 13.5 12 3" strokeDasharray="1.5 2" />
    </svg>
  );
}
function RiskRewardIcon() {
  return (
    <svg {...S} aria-hidden>
      <rect x="3" y="2.5" width="10" height="5" rx="1" fill="rgba(53,196,161,.25)" stroke="#35C4A1" />
      <rect x="3" y="7.5" width="10" height="3.5" rx="1" fill="rgba(255,92,92,.25)" stroke="#FF5C5C" />
      <path d="M2 7.5h12" />
    </svg>
  );
}

export function ToolIcon({ id }) {
  switch (id) {
    case 'cursor': return <MousePointer2 size={15} />;
    case 'hline': return <Minus size={15} />;
    case 'trend': return <TrendIcon />;
    case 'ray': return <MoveUpRight size={15} />;
    case 'rect': return <Square size={14} />;
    case 'fib': return <FibIcon />;
    case 'rr': return <RiskRewardIcon />;
    case 'measure': return <Ruler size={15} />;
    default: return <TrendingUp size={15} />;
  }
}

export const CHART_TYPES = [
  { id: 'candles', label: 'Candles' },
  { id: 'hollow', label: 'Hollow candles' },
  { id: 'ha', label: 'Heikin Ashi' },
  { id: 'bars', label: 'OHLC bars' },
  { id: 'line', label: 'Line' },
  { id: 'area', label: 'Area' },
];

export function TypeIcon({ id }) {
  switch (id) {
    case 'bars':
      return (<svg {...S} aria-hidden><path d="M5 2v12M3 5h2M5 11h2M11 3v11M9 6h2M11 12h2" /></svg>);
    case 'line':
      return (<svg {...S} aria-hidden><path d="M2 12 6 7l3 3 5-7" /></svg>);
    case 'area':
      return (<svg {...S} aria-hidden><path d="M2 12 6 7l3 3 5-7v10H2z" fill="currentColor" fillOpacity=".2" /><path d="M2 12 6 7l3 3 5-7" /></svg>);
    case 'hollow':
      return (<svg {...S} aria-hidden><path d="M5 2v2M5 11v3M11 4v2M11 12v2" /><rect x="3.5" y="4" width="3" height="7" rx=".6" /><rect x="9.5" y="6" width="3" height="6" rx=".6" fill="currentColor" fillOpacity=".5" /></svg>);
    case 'ha':
      return (<svg {...S} aria-hidden><path d="M5 2v1.5M5 11.5V14M11 3v1.5M11 12v2" /><rect x="3.5" y="3.5" width="3" height="8" rx=".6" fill="currentColor" fillOpacity=".5" /><rect x="9.5" y="4.5" width="3" height="7.5" rx=".6" fill="currentColor" fillOpacity=".5" /></svg>);
    default:
      return (<svg {...S} aria-hidden><path d="M5 2v2M5 11v3M11 3v2M11 12v2" /><rect x="3.5" y="4" width="3" height="7" rx=".6" fill="currentColor" fillOpacity=".5" /><rect x="9.5" y="5" width="3" height="7" rx=".6" fill="currentColor" fillOpacity=".5" /></svg>);
  }
}
