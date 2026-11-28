/**
 * Prop firm templates.
 *
 * - `tiers`: [{ size, mode, target, daily, total }]
 * - mode:'pct' means percentage values; mode:'usd' means dollar amounts.
 * - daily:null means no daily loss limit in the listed/default configuration.
 * - target:null means no evaluation target (instant/direct-funded) or no single fixed target.
 *
 * Extra rule metadata (phaseTargets, drawdownType, consistency, payoutFrequency, status,
 * notes, sourceUrls) is additive. Rules change often: verify against each firm's site.
 */

const pct = (sizes, target, daily, total) =>
  sizes.map((size) => ({ size, mode: 'pct', target, daily, total }));

const usd = (size, target, total, daily = null) => ({
  size,
  mode: 'usd',
  target,
  daily,
  total,
});

const usdRows = (rows) =>
  rows.map(([size, target, total, daily = null]) => usd(size, target, total, daily));

// Logos live in /public/logos/propfirms/ (see propFirmLogos.js)
const logo = (id) => `/logos/propfirms/${id}.svg`;
const reviewed = '2026-11-28';

export const FOREX_PROPFIRES = [
  {
    id: 'ftmo', name: 'FTMO', type: 'forex', logo: logo('ftmo'), color: '#3B82F6',
    description: 'Two evaluation formats with no overall time limit.',
    plans: [
      {
        id: 'ftmo-2step', name: '2-Step Challenge', evaluation: true,
        minDays: 4, minDaysPerPhase: 4, profitSplit: '80% standard; up to 90%',
        duration: 'No time limit', phaseTargets: [10, 5],
        drawdownType: 'static', dailyLimitType: 'hard', consistency: null,
        tiers: pct([10000, 25000, 50000, 100000, 200000], 10, 5, 10),
        notes: 'Phase 1 target is 10%; Phase 2 target is 5%. Maximum loss is 10% and maximum daily loss is 5%.',
        sourceUrls: [
          'https://ftmo.com/en/ftmo-challenge-2-step/',
          'https://ftmo.com/en/faq/what-is-the-maximum-daily-loss/',
        ],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'ftmo-1step', name: '1-Step Challenge', evaluation: true,
        minDays: 0, profitSplit: '80%–90%', duration: 'No time limit', phaseTargets: [10],
        drawdownType: 'eod-trailing', dailyLimitType: 'hard', consistency: '50% Best Day Rule',
        tiers: pct([10000, 25000, 50000, 100000, 200000], 10, 3, 10),
        notes: '3% daily loss limit; 10% maximum loss with end-of-day trailing mechanics. Best Day Rule applies.',
        sourceUrls: [
          'https://ftmo.com/en/ftmo-challenge-1-step/',
          'https://ftmo.com/en/faq/what-is-the-maximum-loss/',
        ],
        rulesVerifiedAt: reviewed,
      },
    ],
  },
  {
    id: 'fundednext', name: 'FundedNext', type: 'forex', logo: logo('fundednext'), color: '#8B5CF6',
    description: 'Stellar evaluation models plus a direct-to-funded Instant account.',
    plans: [
      {
        id: 'fn-stellar-2', name: 'Stellar 2-Step', evaluation: true,
        minDays: 5, minDaysPerPhase: 5, profitSplit: '80% standard; 90% scale-up; optional 95% add-on',
        duration: 'No time limit', phaseTargets: [8, 5],
        drawdownType: 'static', dailyLimitType: 'hard',
        tiers: pct([6000, 15000, 25000, 50000, 100000, 200000], 8, 5, 10),
        notes: '8% Phase 1 target and 5% Phase 2 target. 5% daily loss and 10% maximum loss. Reward options at checkout can change the initial split and payout timing.',
        sourceUrls: [
          'https://help.fundednext.com/en/articles/8020768-how-much-is-the-reward-share-in-fundednext',
          'https://help.fundednext.com/en/articles/10701694-what-will-be-my-reward-share-from-the-stellar-2-step-account',
        ],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'fn-stellar-1', name: 'Stellar 1-Step', evaluation: true,
        minDays: 2, profitSplit: '80% standard; 90% scale-up; optional 95% add-on',
        duration: 'No time limit', phaseTargets: [10],
        drawdownType: 'static', dailyLimitType: 'hard',
        tiers: pct([6000, 15000, 25000, 50000, 100000, 200000], 10, 3, 6),
        notes: '10% target, 3% daily loss limit and 6% maximum loss. Current new purchases start at 80% reward share.',
        sourceUrls: [
          'https://help.fundednext.com/en/articles/17252927-stellar-1-step-account',
          'https://help.fundednext.com/en/articles/8020768-how-much-is-the-reward-share-in-fundednext',
        ],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'fn-stellar-lite', name: 'Stellar Lite', evaluation: true,
        minDays: 2, minDaysPerPhase: 2, profitSplit: '80% standard; up to 90% scale-up; optional 95% add-on',
        duration: 'No time limit', phaseTargets: [8, 4],
        drawdownType: 'static', dailyLimitType: 'hard',
        tiers: pct([5000, 10000, 25000, 50000, 100000, 200000], 8, 4, 8),
        notes: '8% Phase 1 target and 4% Phase 2 target. Current accounts use 2 minimum trading days per phase; legacy accounts may have different day rules.',
        sourceUrls: [
          'https://help.fundednext.com/en/articles/12673271-usa-client-guide-at-fundednext-cfd-accounts-platforms-rewards',
          'https://help.fundednext.com/en/articles/10701585-how-often-will-i-receive-my-performance-reward',
        ],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'fn-stellar-instant', name: 'Stellar Instant', evaluation: false,
        minDays: 0, profitSplit: '70% initially; 80% from Tier 3',
        duration: 'Direct funded; no evaluation', drawdownType: 'trailing',
        dailyLimitType: 'none',
        tiers: pct([2000, 5000, 10000, 20000], null, null, 6),
        notes: 'No challenge target. 6% trailing maximum loss; no daily loss limit. Reward share is tiered (70% on Tiers 1–2 and 80% from Tier 3).',
        sourceUrls: [
          'https://help.fundednext.com/en/articles/17253243-stellar-instant-account',
          'https://help.fundednext.com/en/articles/11641381-what-will-be-my-performance-reward-from-the-stellar-instant-account',
        ],
        rulesVerifiedAt: reviewed,
      },
    ],
  },
  {
    id: 'fundingpips', name: 'FundingPips', type: 'forex', logo: logo('fundingpips'), color: '#10B981',
    description: 'Six current models, including instant Zero funding.',
    plans: [
      {
        id: 'fp-1step-flex', name: '1 Step Flex', evaluation: true,
        minDays: 0, profitSplit: '80% bi-weekly; up to 100% on-demand',
        duration: 'No time limit', phaseTargets: [12],
        drawdownType: 'static', dailyLimitType: 'hard',
        tiers: pct([5000, 10000, 25000, 50000, 100000], 12, 2, 12),
        dailyOptions: [2, 3],
        notes: '12% target and 12% static max loss. Daily loss option is 2% or 3% depending on the selected configuration. $200K is not listed for this model in the current comparison.',
        sourceUrls: ['https://help.fundingpips.com/hc/en-us/articles/48368490585105-Compare-Account-Models'],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'fp-1step-labs', name: '1 Step Labs', evaluation: true,
        minDays: 0, profitSplit: '85%', duration: 'No time limit', phaseTargets: [5],
        drawdownType: 'eod-trailing', dailyLimitType: 'hard',
        tiers: pct([100000], 5, 1, 3),
        sizeAvailabilityNote: 'The official rule article documents the $100K example; confirm other size availability in checkout before adding tiers.',
        notes: 'The verified example shows 5% target, 1% daily loss limit and 3% end-of-day trailing maximum loss.',
        sourceUrls: ['https://help.fundingpips.com/hc/en-us/articles/48368490585105-Compare-Account-Models'],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'fp-2step-standard', name: '2 Step Standard', evaluation: true,
        minDays: 6, minDaysPerPhase: 3, profitSplit: '60% weekly; 80% bi-weekly; up to 100% on-demand',
        duration: 'No time limit', phaseTargets: [8, 5],
        drawdownType: 'static', dailyLimitType: 'hard',
        tiers: pct([5000, 10000, 25000, 50000, 100000], 8, 3, 10),
        dailyOptions: [3, 5],
        notes: '8% Phase 1 target, 5% Phase 2 target and 10% static max loss. Daily loss setting is selectable (3% or 5%).',
        sourceUrls: ['https://help.fundingpips.com/hc/en-us/articles/48368490585105-Compare-Account-Models'],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'fp-2step-flex', name: '2 Step Flex', evaluation: true,
        minDays: 2, minDaysPerPhase: 1, profitSplit: '80% bi-weekly; 95% with add-on; up to 100% on-demand',
        duration: 'No time limit', phaseTargets: [10, 8],
        drawdownType: 'static', dailyLimitType: 'hard',
        tiers: pct([5000, 10000, 25000, 50000, 100000], 10, 4, 12),
        notes: '10% Phase 1 target, 8% Phase 2 target, 4% daily loss and 12% static max loss. One minimum trading day per phase on the base setup.',
        sourceUrls: ['https://help.fundingpips.com/hc/en-us/articles/48368490585105-Compare-Account-Models'],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'fp-2step-pro', name: '2 Step Pro', evaluation: true,
        minDays: 0, minDaysPerPhase: 0, profitSplit: '80% weekly; up to 100% on-demand',
        duration: 'No time limit', phaseTargets: [6, 6],
        drawdownType: 'static', dailyLimitType: 'hard',
        tiers: pct([5000, 10000, 25000, 50000, 100000, 200000], 6, 3, 6),
        notes: '6% target in each phase, 3% daily loss and 6% static max loss. Current model has no minimum trading days per phase in the comparison table; the 2-day label is intentionally not enforced as a requirement.',
        sourceUrls: ['https://help.fundingpips.com/hc/en-us/articles/48368490585105-Compare-Account-Models'],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'fp-zero', name: 'Zero (Instant Master)', evaluation: false,
        minDays: 7, profitSplit: '95%', duration: 'Direct funded; no evaluation',
        drawdownType: 'trailing', dailyLimitType: 'hard',
        tiers: pct([5000, 10000, 25000, 50000, 100000, 200000], null, 3, 5),
        consistency: '7 profitable days per rolling 30-day period', maxOpenRisk: '1%',
        notes: 'No evaluation target. 5% trailing maximum loss, 3% daily loss limit and 1% maximum open risk.',
        sourceUrls: ['https://help.fundingpips.com/hc/en-us/articles/48368490585105-Compare-Account-Models'],
        rulesVerifiedAt: reviewed,
      },
    ],
  },
  {
    id: 'the5ers', name: 'The5ers', type: 'forex', logo: logo('the5ers'), color: '#F59E0B',
    description: 'High Stakes, Growth and Bootcamp scaling programs.',
    plans: [
      {
        id: '5ers-high-stakes', name: 'High Stakes (2-Step)', evaluation: true,
        minDays: 6, minDaysPerPhase: 3, profitSplit: '80%–100% (scaling)',
        duration: 'No time limit', phaseTargets: [10, 5],
        drawdownType: 'static', dailyLimitType: 'hard',
        tiers: pct([2500, 5000, 10000, 25000, 50000, 100000], 10, 5, 10),
        notes: '10% Phase 1 and 5% Phase 2 targets; 5% daily loss and 10% max loss. Available sizes depend on the current High Stakes version (Classic/New).',
        sourceUrls: [
          'https://the5ers.com/high-stakes/',
          'https://the5ers.com/faqs/how-many-the5ers-accounts-can-i-have/',
        ],
        rulesVerifiedAt: reviewed,
      },
      {
        id: '5ers-pro-growth', name: 'Pro Growth (1-Step)', evaluation: true,
        minDays: 3, profitSplit: '80%–100% (scaling)',
        duration: 'No time limit', phaseTargets: [10],
        drawdownType: 'static', dailyLimitType: 'hard',
        tiers: pct([5000, 10000, 20000], 10, 3, 6),
        notes: 'Growth family account with a 10% target, 3% daily loss and 6% maximum loss. Pro Growth has a minimum of 3 profitable days.',
        sourceUrls: ['https://the5ers.com/high-stakes/'],
        rulesVerifiedAt: reviewed,
      },
      {
        id: '5ers-hyper-growth', name: 'Hyper Growth (1-Step)', evaluation: true,
        minDays: 0, profitSplit: 'up to 100% (scaling)',
        duration: 'No time limit', phaseTargets: [10],
        drawdownType: 'static', dailyLimitType: 'hard',
        tiers: pct([5000, 10000, 20000], 10, 3, 6),
        notes: 'Growth family account with a 10% target, 3% daily loss and 6% maximum loss. Hyper Growth has no minimum profitable-day requirement.',
        sourceUrls: ['https://the5ers.com/high-stakes/'],
        rulesVerifiedAt: reviewed,
      },
      {
        id: '5ers-bootcamp', name: 'Bootcamp (3-Step)', evaluation: true,
        minDays: 0, profitSplit: 'up to 100% (scaling)',
        duration: 'No time limit', phaseTargets: [6, 6, 6],
        drawdownType: 'static', dailyLimitType: 'none',
        tiers: pct([20000, 100000, 250000], 6, null, 5),
        fundedRules: { daily: 3, total: 4, drawdownType: 'static' },
        notes: 'Three 6% evaluation stages. Evaluation max loss is 5%; after funding, the published Pro Trader rules include a 3% daily pause and 4% max loss.',
        sourceUrls: [
          'https://the5ers.com/bootcamp/',
          'https://the5ers.com/faqs/how-many-the5ers-accounts-can-i-have/',
        ],
        rulesVerifiedAt: reviewed,
      },
    ],
  },
  {
    id: 'e8', name: 'E8 Markets', type: 'forex', logo: logo('e8'), color: '#EC4899',
    description: 'Current Classic-market models: E8 One, E8 Pro and E8 Signature.',
    plans: [
      {
        id: 'e8-one', name: 'E8 One (Classic Markets)', evaluation: true,
        minDays: 0, profitSplit: '80%, 90% or 100% configuration',
        duration: 'No time limit; inactivity rule applies', phaseTargets: [6],
        drawdownType: 'dynamic', dailyLimitType: 'hard',
        tiers: pct([5000, 10000, 25000, 50000, 100000, 200000, 400000, 500000], 6, 3, 4),
        consistency: '40% Best Day rule on Performance stage',
        notes: 'Default rules shown: 6% target, 3% daily drawdown and 4% dynamic drawdown. E8 One is customizable at checkout; drawdown and target may change with the chosen configuration.',
        sourceUrls: [
          'https://help.e8markets.com/en/articles/11775980-e8-one',
          'https://help.e8markets.com/en/articles/8880316-what-is-the-custom-account',
        ],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'e8-pro', name: 'E8 Pro (Classic Markets)', evaluation: true,
        minDays: 0, profitSplit: '80% or 100% configuration',
        duration: 'No time limit', phaseTargets: [8],
        drawdownType: 'static', dailyLimitType: 'hard',
        tiers: pct([5000, 10000, 25000, 50000, 100000, 150000, 200000, 400000, 500000], 8, 2.5, 8),
        consistency: 'No best-day rule; performance payout requires 1% profit and 2% daily profit cap',
        payoutFrequency: 'Daily',
        notes: 'Default configuration: 8% target, 2.5% daily drawdown and 8% static drawdown. Payout percentage can be selected at checkout.',
        sourceUrls: [
          'https://help.e8markets.com/en/articles/8880316-what-is-the-custom-account',
          'https://help.e8markets.com/en/articles/13106558-all-product-overviews-e8-one-vs-e8-zero-vs-e8-pro-vs-e8-signature',
        ],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'e8-signature-forex', name: 'E8 Signature (Forex / Classic)', evaluation: true,
        minDays: 0, profitSplit: '80%', duration: 'No time limit', phaseTargets: [6],
        drawdownType: 'eod-dynamic', dailyLimitType: 'none',
        tiers: pct([25000, 50000, 100000, 150000], 6, null, 4),
        consistency: '35% Best Day rule on Performance stage',
        notes: 'E8 Signature uses EOD dynamic drawdown and a 35% best-day rule on Performance accounts. Signature is configurable by market; verify the selected Classic/Forex configuration at checkout.',
        sourceUrls: [
          'https://help.e8markets.com/en/articles/13106558-all-product-overviews-e8-one-vs-e8-zero-vs-e8-pro-vs-e8-signature',
          'https://help.e8markets.com/en/articles/8880316-what-is-the-custom-account',
        ],
        rulesVerifiedAt: reviewed,
      },
    ],
  },
];

export const FUTURES_PROPFIRES = [
  {
    id: 'topstep', name: 'Topstep', type: 'futures', logo: logo('topstep'), color: '#06B6D4',
    description: 'Trading Combine with three standard account sizes.',
    plans: [
      {
        id: 'topstep-combine', name: 'Trading Combine', evaluation: true,
        minDays: 2, profitSplit: '90%', duration: 'No time limit',
        drawdownType: 'trailing', dailyLimitType: 'soft-or-optional',
        consistency: '55% Best Day consistency target',
        tiers: usdRows([
          [50000, 3000, 2000, 1000],
          [100000, 6000, 3000, 2000],
          [150000, 9000, 4500, 3000],
        ]),
        notes: 'Profit target, Maximum Loss Limit and standard Daily Loss Limit are account-size dependent. Confirm whether DLL is enabled in the selected Trading Combine configuration.',
        sourceUrls: ['https://help.topstep.com/en/articles/8284204-trading-combine-parameters'],
        rulesVerifiedAt: reviewed,
      },
    ],
  },
  {
    id: 'apex', name: 'Apex Trader Funding', type: 'futures', logo: logo('apex'), color: '#F59E0B',
    description: 'Evaluation choices with End-of-Day or Intraday trailing drawdown.',
    plans: [
      {
        id: 'apex-eod', name: 'EOD Evaluation', evaluation: true,
        minDays: 0, profitSplit: '100% first $25K paid; then 90% (verify current payout policy)',
        duration: '30 calendar days per evaluation cycle',
        drawdownType: 'eod-trailing', dailyLimitType: 'soft',
        tiers: usdRows([
          [25000, 1500, 1000, 500],
          [50000, 3000, 2000, 1000],
          [100000, 6000, 3000, 1500],
          [150000, 9000, 4000, 2000],
        ]),
        notes: 'EOD trailing drawdown; daily loss limit values shown for the current EOD evaluation. Evaluation has no minimum trading-day requirement.',
        sourceUrls: ['https://support.apextraderfunding.com/hc/en-us/articles/40516642166555-EOD-Evaluation-Accounts'],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'apex-intraday', name: 'Intraday Evaluation', evaluation: true,
        minDays: 0, profitSplit: '100% first $25K paid; then 90% (verify current payout policy)',
        duration: '30 calendar days per evaluation cycle',
        drawdownType: 'intraday-trailing', dailyLimitType: 'none',
        tiers: usdRows([
          [25000, 1500, 1000, null],
          [50000, 3000, 2000, null],
          [100000, 6000, 3000, null],
          [150000, 9000, 4000, null],
        ]),
        notes: 'Intraday trailing drawdown is enforced in real time. This evaluation model does not list a separate daily loss limit.',
        sourceUrls: ['https://support.apextraderfunding.com/hc/en-us/articles/40516642166555-Intraday-Evaluation-Accounts'],
        rulesVerifiedAt: reviewed,
      },
    ],
  },
  {
    id: 'tpt', name: 'Take Profit Trader', type: 'futures', logo: logo('tpt'), color: '#10B981',
    description: 'Three current Test account drawdown options: Intraday, Classic and EOD.',
    plans: [
      {
        id: 'tpt-intraday', name: 'Intraday Test', evaluation: true,
        minDays: 3, profitSplit: '80% PRO / 90% PRO+', duration: 'No time limit',
        drawdownType: 'intraday-trailing', dailyLimitType: 'none', consistency: '50% during Test only',
        tiers: usdRows([
          [25000, 1500, 1000, null],
          [50000, 3000, 2000, null],
          [150000, 9000, 4500, null],
        ]),
        notes: 'Intraday trailing max loss. No daily loss limit. The 50% consistency rule is for the evaluation stage; PRO and PRO+ payout splits differ.',
        sourceUrls: ['https://takeprofittrader.com/blog/plans'],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'tpt-classic', name: 'Classic Test', evaluation: true,
        minDays: 3, profitSplit: '80% PRO / 90% PRO+', duration: 'No time limit',
        drawdownType: 'varies-by-stage', dailyLimitType: 'none', consistency: '50% during Test only',
        tiers: usdRows([
          [25000, 1500, 1000, null],
          [50000, 3000, 2000, null],
          [150000, 9000, 4500, null],
        ]),
        notes: 'Classic uses EOD drawdown on Test and PRO+ stages, with intraday drawdown on PRO. No daily loss limit is listed.',
        sourceUrls: ['https://takeprofittrader.com/blog/plans'],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'tpt-eod', name: 'EOD Test', evaluation: true,
        minDays: 3, profitSplit: '80% PRO / 90% PRO+', duration: 'No time limit',
        drawdownType: 'eod-trailing', dailyLimitType: 'soft', consistency: '50% during Test only',
        tiers: usdRows([
          [25000, 1500, 1000, 500],
          [50000, 3000, 2000, 1000],
          [150000, 9000, 4500, 2500],
        ]),
        notes: 'EOD drawdown throughout the account lifecycle. Daily loss limits are $500 / $1,000 / $2,500 by account size. Current new account sizes are $25K, $50K and $150K.',
        sourceUrls: ['https://takeprofittrader.com/blog/plans'],
        rulesVerifiedAt: reviewed,
      },
    ],
  },
  {
    id: 'mff', name: 'MyFundedFutures', type: 'futures', logo: logo('mff'), color: '#8B5CF6',
    description: 'Builder, Rapid, Rapid EOD and Pro evaluation paths.',
    plans: [
      {
        id: 'mff-builder', name: 'Builder', evaluation: true,
        minDays: 1, profitSplit: '80%', duration: 'No time limit',
        drawdownType: 'eod-trailing', dailyLimitType: 'soft', consistency: 'None in evaluation; 50% in Sim-Funded',
        tiers: usdRows([
          [25000, 1500, 1000, 600],
          [50000, 3000, 2000, 1000],
          [100000, 6000, 3000, 1750],
          [150000, 9000, 4500, 2500],
        ]),
        payoutFrequency: 'Every 48 hours (funded eligibility rules apply)',
        notes: 'One minimum trading day. Daily loss limit is a soft pause. EOD trailing max loss; no evaluation consistency rule.',
        sourceUrls: ['https://help.myfundedfutures.com/en/articles/11802636-traders-evaluation-simplified'],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'mff-rapid', name: 'Rapid (Intraday)', evaluation: true,
        minDays: 2, profitSplit: '90%', duration: 'No time limit',
        drawdownType: 'eod-trailing', dailyLimitType: 'none', consistency: '50% in evaluation only',
        tiers: usdRows([
          [25000, 1500, 1000, null],
          [50000, 3000, 2000, null],
          [100000, 6000, 3000, null],
          [150000, 9000, 4500, null],
        ]),
        payoutFrequency: 'Daily (funded eligibility and buffer apply)',
        notes: 'Two minimum trading days. No daily loss limit. The evaluation max loss is listed in the current official rules as EOD; do not confuse the plan name with the drawdown calculation.',
        sourceUrls: ['https://help.myfundedfutures.com/en/articles/11802636-traders-evaluation-simplified'],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'mff-rapid-eod', name: 'Rapid EOD', evaluation: true,
        minDays: 4, profitSplit: '90%', duration: 'No time limit',
        drawdownType: 'eod-trailing', dailyLimitType: 'none', consistency: '30% in evaluation only',
        tiers: usdRows([
          [25000, 1500, 1000, null],
          [50000, 3000, 2000, null],
        ]),
        payoutFrequency: 'Daily (funded eligibility and buffer apply)',
        notes: 'Four minimum trading days. Seven-day inactivity rule is listed for this plan. Evaluation consistency is 30%.',
        sourceUrls: ['https://help.myfundedfutures.com/en/articles/11802636-traders-evaluation-simplified'],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'mff-pro', name: 'Pro', evaluation: true,
        minDays: 2, profitSplit: '80%', duration: 'No time limit',
        drawdownType: 'eod-trailing', dailyLimitType: 'none', consistency: '50% in evaluation; no funded consistency',
        tiers: usdRows([
          [50000, 3000, 2000, null],
          [100000, 6000, 3000, null],
          [150000, 9000, 4500, null],
        ]),
        payoutFrequency: '14-day payout cycle (subject to current payout policy)',
        notes: 'Two minimum trading days. The optional One-Day add-on changes the $50K target to $4,000; the default target is $3,000.',
        sourceUrls: [
          'https://help.myfundedfutures.com/en/articles/11802636-traders-evaluation-simplified',
          'https://help.myfundedfutures.com/en/articles/11994562-consistency-rule-at-myfundedfutures',
        ],
        rulesVerifiedAt: reviewed,
      },
    ],
  },
  {
    id: 'tradeify', name: 'Tradeify', type: 'futures', logo: logo('tradeify'), color: '#EC4899',
    description: 'Growth and Select evaluations plus Lightning direct funding.',
    plans: [
      {
        id: 'tradeify-growth', name: 'Growth Evaluation', evaluation: true,
        minDays: 1, profitSplit: '90%', duration: 'No time limit',
        drawdownType: 'eod-trailing', dailyLimitType: 'soft', consistency: 'No evaluation consistency; 35% in funded stage',
        tiers: usdRows([
          [25000, 1500, 1000, 600],
          [50000, 3000, 2000, 1250],
          [100000, 6000, 3500, 2500],
          [150000, 9000, 5000, 3750],
        ]),
        notes: 'One-day pass is possible. Daily loss limits are soft pauses. The $25K–$150K evaluation targets and drawdowns are size-specific.',
        sourceUrls: ['https://help.tradeify.co/en/articles/10495915-growth-evaluation-accounts'],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'tradeify-select', name: 'Select Evaluation', evaluation: true,
        minDays: 3, profitSplit: '90%', duration: 'No time limit',
        drawdownType: 'eod-trailing', dailyLimitType: 'none',
        consistency: '40% default; 30% option; 50% add-on',
        tiers: usdRows([
          [25000, 1500, 1000, null],
          [50000, 3000, 2000, null],
          [100000, 6000, 3000, null],
          [150000, 9000, 4500, null],
          [300000, 14000, 8000, 4000],
        ]),
        fundedOptions: ['Select Flex (5 winning days; no DLL)', 'Select Daily (daily payout eligibility; DLL and buffer apply)'],
        notes: '40% consistency requires at least 3 days; 30% requires 4 days. The 50% add-on can shorten the pass path. The permanent $300K size has a $14K target, $8K EOD max loss and $4K evaluation DLL.',
        sourceUrls: [
          'https://help.tradeify.co/en/articles/12853921-select-evaluation-accounts',
          'https://help.tradeify.co/en/articles/17845238-300k-select-account-permanent-plan',
        ],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'tradeify-lightning', name: 'Lightning Funded', evaluation: false,
        minDays: 0, profitSplit: '90%', duration: 'Direct funded; no evaluation',
        drawdownType: 'eod-trailing', dailyLimitType: 'soft',
        tiers: usdRows([
          [25000, null, 1000, null],
          [50000, null, 2000, 1250],
          [100000, null, 3500, 2250],
          [150000, null, 5250, 3000],
        ]),
        consistency: '20% first payout; 25% second; 30% third onward',
        payoutGoals: {
          first: { 25000: 1500, 50000: 3000, 100000: 6000, 150000: 9000 },
          later: { 25000: 1000, 50000: 2000, 100000: 3500, 150000: 4500 },
        },
        notes: 'Instant simulated funding. Current $100K Lightning risk limits changed for purchases on/after Nov 23, 2026: $3,500 trailing drawdown and $2,250 soft DLL. Payout goals are separate from withdrawal caps.',
        sourceUrls: [
          'https://help.tradeify.co/en/articles/10495938-lightning-funded-accounts',
          'https://help.tradeify.co/en/articles/10495932-lightning-funded-account-payout-policy',
        ],
        rulesVerifiedAt: reviewed,
      },
    ],
  },
  {
    id: 'lucid', name: 'Lucid Trading', type: 'futures', logo: logo('lucid'), color: '#22C55E',
    description: 'LucidFlex, LucidDaily, LucidPro, LucidDirect and invite-only LucidMaxx.',
    plans: [
      {
        id: 'lucid-flex', name: 'LucidFlex Evaluation', evaluation: true,
        minDays: 3, profitSplit: '90%', duration: 'No time limit',
        drawdownType: 'selectable-eod-or-intraday-trailing', dailyLimitType: 'optional-soft',
        consistency: '40% default; 50% with add-on',
        tiers: usdRows([
          [25000, 1250, 1000, null],
          [50000, 3000, 2000, null],
          [100000, 6000, 3000, null],
          [150000, 9000, 4500, null],
        ]),
        notes: 'Optional daily loss limit can be enabled at checkout. 40% consistency is default; a 50% add-on allows a two-day pass. Funded account has no consistency rule and 90/10 split.',
        sourceUrls: [
          'https://support.lucidtrading.com/en/articles/12945790-lucidflex-evaluation-account',
          'https://support.lucidtrading.com/en/articles/12945795-lucidflex-funded-account',
        ],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'lucid-daily', name: 'LucidDaily Evaluation', evaluation: true,
        minDays: 2, profitSplit: '90%', duration: 'No time limit',
        drawdownType: 'selectable-eod-or-intraday-trailing', dailyLimitType: 'none',
        consistency: '50% in evaluation; none in funded stage',
        tiers: usdRows([
          [25000, 1250, 1000, null],
          [50000, 3000, 2000, null],
          [100000, 6000, 3000, null],
          [150000, 9000, 4500, null],
        ]),
        payoutFrequency: 'Daily once eligible in funded stage',
        notes: '50% evaluation consistency has a built-in cushion and can be passed in two days. Drawdown can be selected as Intraday or EOD at checkout. Funded model has no consistency rule and a 90/10 split.',
        sourceUrls: [
          'https://support.lucidtrading.com/en/articles/15996664-luciddaily-evaluation',
          'https://support.lucidtrading.com/en/articles/15997244-luciddaily-funded-account',
        ],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'lucid-pro', name: 'LucidPro Evaluation', evaluation: true,
        minDays: 1, profitSplit: '90%', duration: 'No time limit',
        drawdownType: 'trailing', dailyLimitType: 'optional-soft',
        consistency: null,
        tiers: usdRows([
          [25000, 1250, 1000, null],
          [50000, 3000, 2000, 1200],
          [100000, 6000, 3000, 1800],
          [150000, 9000, 4500, 2700],
        ]),
        dailyOptions: ['DLL On (soft pause)', 'DLL Off'],
        notes: 'One-day pass is possible. Optional DLL can be switched on/off at purchase; when enabled, limits are $1,200 / $1,800 / $2,700 for $50K / $100K / $150K (none on $25K).',
        sourceUrls: [
          'https://support.lucidtrading.com/en/articles/12890029-lucidpro-evaluation-account',
          'https://support.lucidtrading.com/en/articles/16226068-lucidpro-customization',
        ],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'lucid-direct', name: 'LucidDirect (Straight-to-Funded)', evaluation: false,
        minDays: 0, profitSplit: '90%', duration: 'Direct funded; no evaluation',
        drawdownType: 'eod-trailing', dailyLimitType: 'soft-with-scaling',
        tiers: usdRows([
          [25000, null, 1000, null],
          [50000, null, 2000, 1200],
          [100000, null, 3500, 2100],
          [150000, null, 5000, 3000],
        ]),
        notes: 'No evaluation phase. EOD trailing max loss. Fixed DLL becomes a scaling DLL equal to 60% of peak EOD profit after the initial trail balance is reached. No simulated payout caps.',
        sourceUrls: [
          'https://support.lucidtrading.com/en/articles/12890148-luciddirect-funded-account',
          'https://support.lucidtrading.com/en/articles/12890185-luciddirect-daily-loss-limit',
          'https://support.lucidtrading.com/en/articles/12890192-luciddirect-drawdown',
        ],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'lucid-maxx', name: 'LucidMaxx (Invite Only)', evaluation: true,
        status: 'invite-only', selectable: false,
        minDays: 3, profitSplit: '90/10 on live starting balance and eligible bonus',
        duration: 'Invite-only access', drawdownType: 'eod-trailing', dailyLimitType: 'none',
        consistency: '40% in Step 1; none in Step 2',
        tiers: usdRows([
          [25000, 1250, 1000, null],
          [50000, 3000, 2000, null],
          [100000, 6000, 3000, null],
          [150000, 9000, 4500, null],
        ]),
        stage2Tiers: usdRows([
          [25000, 1000, 1000, null],
          [50000, 2000, 2000, null],
          [100000, 3000, 3000, null],
          [150000, 4500, 4500, null],
        ]),
        notes: 'Not purchasable by the general public. Status is earned by demonstrated performance; the two-stage route leads directly to live capital.',
        sourceUrls: ['https://support.lucidtrading.com/en/articles/17327076-new-lucidmaxx-program'],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'lucid-black-legacy', name: 'LucidBlack (Legacy)', evaluation: false,
        status: 'legacy', selectable: false, minDays: 0,
        profitSplit: 'Legacy account terms', duration: 'Legacy / not currently offered',
        drawdownType: null, dailyLimitType: 'account-specific', tiers: [],
        notes: 'Listed in Lucid Trading’s support centre as a legacy program. Not included as a selectable new purchase because current public rules are not offered as a new plan.',
        sourceUrls: ['https://support.lucidtrading.com/en/'],
        rulesVerifiedAt: reviewed,
      },
    ],
  },
  {
    id: 'e8-futures', name: 'E8 Markets', type: 'futures', logo: logo('e8'), color: '#EC4899',
    description: 'Futures-specific E8 Zero and E8 Signature models.',
    plans: [
      {
        id: 'e8-zero', name: 'E8 Zero (Futures)', evaluation: true,
        minDays: 0, profitSplit: '80% or 100% configuration',
        duration: 'No time limit', drawdownType: 'eod-dynamic', dailyLimitType: 'none',
        tiers: pct([50000, 100000, 200000], null, null, null),
        consistency: '40% Best Day in Challenge; none in Performance',
        payoutFrequency: 'Performance-stage payout rules; maximum 5 payouts per account',
        notes: 'Futures-only, single-phase challenge. Zero Starter and Zero Max are separate configurations; the official custom-account page does not expose one shared target/drawdown value for both, so those fields are intentionally left unset rather than guessed.',
        sourceUrls: [
          'https://help.e8markets.com/en/articles/13106558-all-product-overviews-e8-one-vs-e8-zero-vs-e8-pro-vs-e8-signature',
          'https://help.e8markets.com/en/articles/8880316-what-is-the-custom-account',
        ],
        rulesVerifiedAt: reviewed,
      },
      {
        id: 'e8-signature-futures', name: 'E8 Signature (Futures)', evaluation: true,
        minDays: 0, profitSplit: '80%', duration: 'No time limit',
        drawdownType: 'eod-dynamic', dailyLimitType: 'soft-pause-on-performance',
        tiers: usdRows([
          [25000, 1500, 1000, null],
          [50000, 3000, 2000, null],
          [100000, 6000, 3000, null],
          [150000, 9000, 4500, null],
        ]),
        consistency: 'No Challenge best-day rule; 35% Best Day on Performance stage',
        notes: 'Futures model uses EOD dynamic drawdown. A Daily Pause is listed for SimFi Performance accounts only; it is not represented as an evaluation DLL here.',
        sourceUrls: [
          'https://help.e8markets.com/en/articles/13106558-all-product-overviews-e8-one-vs-e8-zero-vs-e8-pro-vs-e8-signature',
          'https://help.e8markets.com/en/articles/8880316-what-is-the-custom-account',
        ],
        rulesVerifiedAt: reviewed,
      },
    ],
  },
];

export const ALL_PROPFIRES = [...FOREX_PROPFIRES, ...FUTURES_PROPFIRES];

export function getPropFirmById(id) {
  return ALL_PROPFIRES.find((firm) => firm.id === id);
}

export function getSelectablePropFirms(type) {
  return ALL_PROPFIRES
    .filter((firm) => !type || firm.type === type)
    .map((firm) => ({
      ...firm,
      plans: firm.plans.filter((plan) => plan.selectable !== false && plan.status !== 'legacy'),
    }));
}