// apps/web/src/features/charts/lib/chartConfig.js
//
// Central config for the TradingView chart feature.
//
// The widget is TradingView's official iframe embed
// (https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js).
// We do NOT fetch OHLC data ourselves - TradingView serves bars, indicators,
// drawings, and symbol search from its own backend.
//
// All widget options are documented at:
//   https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

// OANDA:XAUUSD is the most liquid standard spot-gold feed on TradingView.
// Users can change symbol at any time using the widget's own search bar.
export const DEFAULT_SYMBOL = 'OANDA:XAUUSD';

// TradingView interval codes:
//   1 . 5 . 15 . 30 . 60 (min)  .  240 (4h)  .  D . W . M
export const DEFAULT_INTERVAL = '1';

// Chart style codes (TradingView's own enumeration):
//   0 = Bars . 1 = Candles . 2 = Line . 3 = Area . 8 = Heikin Ashi
export const DEFAULT_STYLE = '1';

/* ------------------------------------------------------------------ */
/*  Widget embed configuration                                         */
/* ------------------------------------------------------------------ */

// Everything below is passed verbatim as the widget config JSON.
// Keys here are the exact names TradingView expects - do not rename.
export const TV_WIDGET_CONFIG = {
  autosize: true,
  timezone: 'America/New_York',
  theme: 'dark',
  locale: 'en',

  // Let the user swap symbols freely via the widget's built-in search.
  allow_symbol_change: true,

  // Keep the drawing-tools sidebar visible (110+ tools available).
  hide_side_toolbar: false,

  // Keep the top toolbar visible (interval + chart-type + indicator buttons).
  hide_top_toolbar: false,

  // Show the date-range selector (session pills + custom range calendar).
  withdateranges: true,

  // Show the details panel (symbol description, contract size, etc.).
  details: true,

  // Hide the news / hotlist / economic-calendar tabs - this is a chart
  // page, not a research hub.
  hotlist: false,
  calendar: false,

  // Enable right-click -> Save image.
  save_image: true,

  // No publishing button.
  enable_publishing: false,

  // Empty studies array - no indicators pre-loaded. Users add their own.
  studies: [],

  // Match Mavrix's dark toolbar surface.
  toolbar_bg: '#0F121A',

  // Required by the embed to correctly identify the host.
  support_host: 'https://www.tradingview.com',
};

/* ------------------------------------------------------------------ */
/*  Embed script                                                       */
/* ------------------------------------------------------------------ */

export const TV_SCRIPT_SRC =
  'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';

// Class names the widget script looks for when it self-mounts.
export const TV_CONTAINER_CLASS = 'tradingview-widget-container';
export const TV_INNER_CLASS = 'tradingview-widget-container__widget';
