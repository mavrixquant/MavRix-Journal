/**
 * Logo files for each firm id. Save them in public/logos/propfirms/ under these exact names.
 * kind: 'wide'   = horizontal wordmark, shown at its natural width
 *       'square' = profile-style icon, shown as a rounded square
 */
const L = (file, kind = 'wide') => ({ src: `/logos/propfirms/${file}`, kind });

export const FIRM_LOGOS = {
  ftmo: L('ftmo.svg'),
  fundednext: L('fundednext.jpg', 'square'),
  fundingpips: L('fundingpips.jpg', 'square'),
  the5ers: L('the5ers.jpg', 'square'),
  e8: L('e8.png'),
  'e8-futures': L('e8.png'),
  topstep: L('topstep.svg'),
  apex: L('apex.svg'),
  tpt: L('tpt.svg'),
  mff: L('mff.svg'),
  tradeify: L('tradeify.svg'),
  lucid: L('lucid.webp'),
};