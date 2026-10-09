// apps/web/src/shared/symbols/symbolIcons.js
//
// Maps each catalog symbol to an icon spec.
//
// Three icon "kinds" the renderer understands:
//   { kind: 'single', src }                       → one square image
//   { kind: 'dual', left, right }                 → two overlapping squares (forex)
//   { kind: 'badge', text, color, borderColor }   → colored circle + 2-letter label
//
// Sources:
//   cryptocurrency-icons  → node_modules/cryptocurrency-icons/svg/color/*.svg
//   flag-icons            → node_modules/flag-icons/flags/1x1/*.svg
//   CME_Group.png         → apps/web/src/assets/CME_Group.png
//
// This module is consumed by:
//   - features/charts/components/QuoteHeader.jsx
//   - features/charts/components/WatchlistSidebar.jsx
//   - shared/trade-logs/AddTradeModal.jsx (via shared/symbols/SymbolSelect)

/* ------------------------------------------------------------------ */
/*  Static imports (Vite bundles these as asset URLs)                 */
/* ------------------------------------------------------------------ */

// --- Crypto ---
import btcIcon from 'cryptocurrency-icons/svg/color/btc.svg?url';
import ethIcon from 'cryptocurrency-icons/svg/color/eth.svg?url';
import solIcon from 'cryptocurrency-icons/svg/color/sol.svg?url';

// --- Forex flags (1x1 square) ---
import flagEu from 'flag-icons/flags/1x1/eu.svg?url';
import flagUs from 'flag-icons/flags/1x1/us.svg?url';
import flagGb from 'flag-icons/flags/1x1/gb.svg?url';
import flagJp from 'flag-icons/flags/1x1/jp.svg?url';
import flagAu from 'flag-icons/flags/1x1/au.svg?url';
import flagCa from 'flag-icons/flags/1x1/ca.svg?url';
import flagCh from 'flag-icons/flags/1x1/ch.svg?url';
import flagNz from 'flag-icons/flags/1x1/nz.svg?url';

// --- Futures / Commodities ---
import cmeLogo from '@/assets/CME_Group.png';

/* ------------------------------------------------------------------ */
/*  Symbol → icon mappings                                            */
/* ------------------------------------------------------------------ */

// Every CME-family contract shares the CME Group logo.
//   - Equity index: NQ, MNQ, ES, MES, YM, MYM  (CME / CBOT)
//   - Metals:       GC, MGC                    (COMEX)
//   - Energy:       CL, MCL                    (NYMEX)
const CME_SYMBOLS = new Set([
  'NQ', 'MNQ', 'ES', 'MES', 'YM', 'MYM',
  'GC', 'MGC',
  'CL', 'MCL',
]);

const CRYPTO_ICONS = {
  BTCUSD: btcIcon,
  ETHUSD: ethIcon,
  SOLUSD: solIcon,
};

// Forex pair → [left flag, right flag] in the convention base/quote.
const FOREX_FLAGS = {
  EURUSD: [flagEu, flagUs],
  GBPUSD: [flagGb, flagUs],
  USDJPY: [flagUs, flagJp],
  AUDUSD: [flagAu, flagUs],
  USDCAD: [flagUs, flagCa],
  USDCHF: [flagUs, flagCh],
  NZDUSD: [flagNz, flagUs],
  EURGBP: [flagEu, flagGb],
  EURJPY: [flagEu, flagJp],
  GBPJPY: [flagGb, flagJp],
};

// Spot metals have no exchange mark — use a colored badge.
const METAL_BADGES = {
  XAUUSD: { text: 'Au', color: '#F5C56A' },
  XAGUSD: { text: 'Ag', color: '#C7CDD6' },
};

/* ------------------------------------------------------------------ */
/*  Public resolver                                                   */
/* ------------------------------------------------------------------ */

/**
 * @param {string} symbol  — e.g. "NQ", "EURUSD", "BTCUSD"
 * @returns {object|null}  — icon spec, or null if nothing matches
 */
export function getIconSpec(symbol) {
  const code = String(symbol || '').trim().toUpperCase();
  if (!code) return null;

  if (CME_SYMBOLS.has(code)) {
    return { kind: 'single', src: cmeLogo, alt: 'CME' };
  }

  if (CRYPTO_ICONS[code]) {
    return { kind: 'single', src: CRYPTO_ICONS[code], alt: code };
  }

  const flags = FOREX_FLAGS[code];
  if (flags) {
    return { kind: 'dual', left: flags[0], right: flags[1], alt: code };
  }

  const badge = METAL_BADGES[code];
  if (badge) {
    return {
      kind: 'badge',
      text: badge.text,
      color: badge.color,
      alt: code,
    };
  }

  return null;
}