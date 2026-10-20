

import btcIcon from 'cryptocurrency-icons/svg/color/btc.svg?url';
import ethIcon from 'cryptocurrency-icons/svg/color/eth.svg?url';
import solIcon from 'cryptocurrency-icons/svg/color/sol.svg?url';

import flagEu from 'flag-icons/flags/1x1/eu.svg?url';
import flagUs from 'flag-icons/flags/1x1/us.svg?url';
import flagGb from 'flag-icons/flags/1x1/gb.svg?url';
import flagJp from 'flag-icons/flags/1x1/jp.svg?url';
import flagAu from 'flag-icons/flags/1x1/au.svg?url';
import flagCa from 'flag-icons/flags/1x1/ca.svg?url';
import flagCh from 'flag-icons/flags/1x1/ch.svg?url';
import flagNz from 'flag-icons/flags/1x1/nz.svg?url';

import cmeLogo from '@/assets/CME_Group.png';


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

const METAL_BADGES = {
  XAUUSD: { text: 'Au', color: '#F5C56A' },
  XAGUSD: { text: 'Ag', color: '#C7CDD6' },
};


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