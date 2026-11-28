import { FOREX_PROPFIRES, FUTURES_PROPFIRES } from '@/features/sessions/propfirm-mode/propFirmsData';

/**
 * Firms with only the plans a user can actually pick (no legacy, invite-only or tier-less plans).
 * Lives here so it works with any version of propFirmsData.js that exports the two firm lists.
 */
export function getSelectablePropFirms(type) {
  const all = type === 'forex' ? FOREX_PROPFIRES
    : type === 'futures' ? FUTURES_PROPFIRES
    : [...FOREX_PROPFIRES, ...FUTURES_PROPFIRES];
  return all
    .map((firm) => ({
      ...firm,
      plans: firm.plans.filter((p) => p.selectable !== false && p.status !== 'legacy' && p.tiers?.length),
    }))
    .filter((firm) => firm.plans.length > 0);
}