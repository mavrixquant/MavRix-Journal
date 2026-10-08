// apps/web/src/features/charts/components/QuoteHeader.jsx
//
// Thin live-price strip above the chart, with per-symbol icon.

import { useMarketQuote } from '@/shared/api/marketData';
import SymbolIcon from './SymbolIcon';

function fmtPrice(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function fmtVolume(n) {
  if (n == null || Number.isNaN(n)) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

export default function QuoteHeader({ symbol, displayName }) {
  const { data, isLoading } = useMarketQuote(symbol, { enabled: !!symbol });

  if (isLoading && !data) {
    return (
      <div className="qh-root">
        <div className="qh-main">
          <SymbolIcon symbol={symbol} size={22} />
          <span className="qh-code">{symbol}</span>
          <span className="qh-name">{displayName}</span>
        </div>
        <div className="qh-loading">
          <span className="qh-pulse" />
          <span>Loading quote…</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="qh-root">
        <div className="qh-main">
          <SymbolIcon symbol={symbol} size={22} />
          <span className="qh-code">{symbol}</span>
          <span className="qh-name">{displayName}</span>
        </div>
      </div>
    );
  }

  const up = (data.change ?? 0) >= 0;
  const changeColor = up ? 'is-up' : 'is-down';
  const arrow = up ? '▲' : '▼';

  return (
    <div className="qh-root">
      <div className="qh-main">
        <SymbolIcon symbol={symbol} size={22} />
        <span className="qh-code">{symbol}</span>
        <span className="qh-name">{displayName}</span>
      </div>

      <div className="qh-price-block">
        <span className={`qh-price ${changeColor}`}>{fmtPrice(data.price)}</span>
        <span className={`qh-change ${changeColor}`}>
          {arrow} {fmtPrice(Math.abs(data.change ?? 0))}
          {'  '}
          ({data.changePct != null ? `${data.changePct >= 0 ? '+' : ''}${data.changePct.toFixed(2)}%` : '—'})
        </span>
      </div>

      <div className="qh-stats">
        <span><em>H</em> {fmtPrice(data.dayHigh)}</span>
        <span><em>L</em> {fmtPrice(data.dayLow)}</span>
        <span><em>Vol</em> {fmtVolume(data.volume)}</span>
        <span className="qh-market-state">{data.marketState || '—'}</span>
        <span className="qh-delayed">15m delayed</span>
      </div>
    </div>
  );
}