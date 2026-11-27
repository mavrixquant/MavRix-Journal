/**
 * Prop Firm Plan Data Structure
 * Based on research of top Forex and Futures prop trading firms
 */

// Top 5 Forex Prop Firms
export const FOREX_PROPFIRES = [
  {
    id: 'ftmo',
    name: 'FTMO',
    logo: 'FTMO',
    type: 'forex',
    description: 'World\'s most prestigious trading challenge with global recognition.',
    color: '#3B82F6', // blue-500
    plans: [
      {
        id: 'ftmo-1step',
        name: 'FTMO Challenge: 1-Step',
        accountSizes: [50000, 100000, 150000, 200000],
        price: 55,
        currency: 'EUR',
        profitTarget: '10%',
        dailyDrawdown: '5%',
        maxDrawdown: '10%',
        evaluationDuration: 'No time limit',
        profitSplit: '100%',
        features: [
          'One-step evaluation process',
          'Simulated trading environment',
          'Real-money rewards',
          'Up to $200,000 account size'
        ],
        pros: [
          'Well-established brand recognition',
          'Multiple account size options',
          'No time limit on evaluation'
        ],
        cons: [
          'Higher evaluation fee',
          'Strict drawdown rules'
        ]
      },
      {
        id: 'ftmo-2step',
        name: 'FTMO Challenge: 2-Step',
        accountSizes: [50000, 100000, 150000, 200000],
        price: 55,
        currency: 'EUR',
        profitTarget: '10%',
        dailyDrawdown: '5%',
        maxDrawdown: '10%',
        evaluationDuration: 'No time limit',
        profitSplit: '100%',
        features: [
          'Two-step evaluation: Challenge + Verification',
          'Can trade toward Rewards from day one',
          'Simulated trading environment',
          'Up to $200,000 account size'
        ],
        pros: [
          'More flexible for consistent traders',
          'Verification phase adds credibility'
        ],
        cons: [
          'Requires passing two phases',
          'Higher overall fee'
        ]
      },
      {
        id: 'ftmo-free-trial',
        name: 'FTMO Free Trial',
        accountSizes: [50000],
        price: 0,
        currency: 'EUR',
        profitTarget: 'N/A',
        dailyDrawdown: 'N/A',
        maxDrawdown: 'N/A',
        evaluationDuration: 'Unlimited',
        profitSplit: 'N/A',
        features: [
          'Free practice account',
          'Simplified challenge experience',
          'No real rewards',
          'Unlimited trials'
        ],
        pros: [
          'Perfect for beginners',
          'No cost to try'
        ],
        cons: [
          'No funded account',
          'No real money trading'
        ]
      }
    ]
  },
  {
    id: 'myforexfunds',
    name: 'MyForexFunds',
    logo: 'MyForexFunds',
    type: 'forex',
    description: 'Flexible evaluation with Evolution and Accelerated programs.',
    color: '#10B981', // green-500
    plans: [
      {
        id: 'myforexfunds-evolution',
        name: 'Evolution Program',
        accountSizes: [5000, 100000, 300000],
        price: 150,
        currency: 'USD',
        profitTarget: '10%',
        dailyDrawdown: '5%',
        maxDrawdown: '10%',
        evaluationDuration: 'No time limit',
        profitSplit: '70% → 90% (scaling)',
        features: [
          'Up to $300,000 account size',
          '70% starting profit split, up to 90%',
          'One-phase or two-phase options',
          'News trading allowed',
          'Grid and martingale strategies allowed'
        ],
        pros: [
          'High account ceiling',
          'Generous profit split',
          'Strategy flexibility'
        ],
        cons: [
          'One-time fee',
          'Requires consistent performance'
        ]
      },
      {
        id: 'myforexfunds-accelerated',
        name: 'Accelerated Program',
        accountSizes: [2000, 50000],
        price: 99,
        currency: 'USD',
        profitTarget: 'N/A',
        dailyDrawdown: 'N/A',
        maxDrawdown: 'N/A',
        evaluationDuration: 'Immediate',
        profitSplit: '70% fixed',
        features: [
          'Skip the challenge process',
          'No evaluation required',
          'Virtual funded account',
          'Quick start for experienced traders'
        ],
        pros: [
          'Immediate funding',
          'No evaluation phase',
          'Lower barrier to entry'
        ],
        cons: [
          'No live trading',
          'Fixed profit split'
        ]
      }
    ]
  },
  {
    id: 'the5ers',
    name: 'The 5%ers',
    logo: 'The5%ers',
    type: 'forex',
    description: 'Fastest growth plans with excellent payout conditions.',
    color: '#F59E0B', // amber-500
    plans: [
      {
        id: 'the5ers-standard',
        name: 'Standard Plan',
        accountSizes: [50000, 100000],
        price: 179,
        currency: 'USD',
        profitTarget: '10%',
        dailyDrawdown: '3%',
        maxDrawdown: '6%',
        evaluationDuration: 'Unlimited',
        profitSplit: '75%',
        features: [
          '$250 minimum withdrawal',
          '1:100 leverage',
          'Free educational resources',
          '24/7 support',
          'Refund from 3rd payout'
        ],
        pros: [
          'Generous refund policy',
          'High leverage options',
          'Supportive community'
        ],
        cons: [
          'One-time evaluation fee',
          'No refunds after 3 payouts'
        ]
      },
      {
        id: 'the5ers-pro',
        name: 'Pro Trader Plan',
        accountSizes: [50000, 100000],
        price: 179,
        currency: 'USD',
        profitTarget: '10%',
        dailyDrawdown: '3%',
        maxDrawdown: '6%',
        evaluationDuration: 'Unlimited',
        profitSplit: '75%',
        features: [
          'Same as Standard but with bonus features',
          '10% bonus on profits',
          'Priority support',
          'Additional resources for pros'
        ],
        pros: [
          'Bonus incentives',
          'Priority assistance'
        ],
        cons: [
          'Higher price than other options'
        ]
      }
    ]
  },
  {
    id: 'tradervue',
    name: 'TraderVue',
    logo: 'TraderVue',
    type: 'forex',
    description: 'Performance-based rewards system with flexible rules.',
    color: '#8B5CF6', // violet-500
    plans: [
      {
        id: 'tradervue-standard',
        name: 'Standard Challenge',
        accountSizes: [25000, 50000, 100000],
        price: 100,
        currency: 'USD',
        profitTarget: '10%',
        dailyDrawdown: '5%',
        maxDrawdown: '10%',
        evaluationDuration: '60 days',
        profitSplit: '80%',
        features: [
          'Real-time performance tracking',
          'Performance-based rewards',
          'Multiple account sizes',
          'Copy trading between accounts allowed'
        ],
        pros: [
          'Performance-focused',
          'Reasonable evaluation period'
        ],
        cons: [
          'Shorter evaluation window'
        ]
      }
    ]
  },
  {
    id: 'traderaz',
    name: 'TraderAZ',
    logo: 'TraderAZ',
    type: 'forex',
    description: 'Trader-friendly conditions and transparent pricing.',
    color: '#EC4899', // pink-500
    plans: [
      {
        id: 'traderaz-standard',
        name: 'Challenge',
        accountSizes: [25000, 50000, 100000],
        price: 147,
        currency: 'USD',
        profitTarget: '10%',
        dailyDrawdown: '5%',
        maxDrawdown: '10%',
        evaluationDuration: '90 days',
        profitSplit: '90%',
        features: [
          '90% profit split',
          'No reset policy',
          '100% of profits after evaluation',
          'Multiple account sizes'
        ],
        pros: [
          'Highest profit split',
          'No account resets',
          'Generous evaluation window'
        ],
        cons: [
          'One evaluation fee',
          'Strict drawdown rules'
        ]
      }
    ]
  }
];

// Top 5 Futures Prop Firms
export const FUTURES_PROPFIRES = [
  {
    id: 'topstep-futures',
    name: 'Topstep Futures',
    logo: 'Topstep',
    type: 'futures',
    description: 'Pioneer in funded trading programs with unique evaluation approach.',
    color: '#06B6D4', // cyan-500
    plans: [
      {
        id: 'topstep-simple-shot',
        name: 'Simple Shot',
        accountSizes: [25000, 50000, 100000, 150000],
        price: 49,
        currency: 'USD',
        profitTarget: '$3,000',
        dailyDrawdown: 'None',
        maxDrawdown: 'Trailing',
        evaluationDuration: '1 day minimum',
        profitSplit: '100%',
        features: [
          'Daily payout opportunities',
          'Hit profit target twice for funding',
          'No daily loss limit',
          'Immediate funding after targets'
        ],
        pros: [
          'Low entry cost',
          '100% profit split',
          'Fast funding path'
        ],
        cons: [
          'Requires hitting targets twice',
          'Trailing drawdown can be strict'
        ]
      },
      {
        id: 'topstep-vet',
        name: 'Prop Trading Vet',
        accountSizes: [25000, 50000, 100000, 150000],
        price: 85,
        currency: 'USD',
        profitTarget: '$3,000',
        dailyDrawdown: 'None',
        maxDrawdown: 'Trailing',
        evaluationDuration: 'As little as 5 days',
        profitSplit: '90%',
        features: [
          'Build long-term trading habits',
          'Stack multiple payouts',
          'First payout in 5 days',
          '90% profit split after evaluation'
        ],
        pros: [
          'Structured learning approach',
          'Multiple payout opportunities',
          'Good for developing traders'
        ],
        cons: [
          'Lower profit split than Simple Shot'
        ]
      }
    ]
  },
  {
    id: 'apex-futures',
    name: 'Apex Trader Funding',
    logo: 'Apex',
    type: 'futures',
    description: 'Intraday and EOD evaluation options for futures traders.',
    color: '#F59E0B',
    plans: [
      {
        id: 'apex-intraday-standard',
        name: 'Intraday Trail Standard',
        accountSizes: [25000, 150000],
        price: 24.9,
        currency: 'USD',
        profitTarget: '$3,000',
        dailyDrawdown: 'None',
        maxDrawdown: 'Intraday trailing',
        evaluationDuration: '1 day minimum',
        profitSplit: '100%',
        features: [
          'No daily loss limit',
          'Intraday trailing drawdown',
          '5-day payout frequency'
        ],
        pros: [
          'Very low entry cost',
          '100% profit split',
          'Flexible evaluation'
        ],
        cons: [
          'Requires activation fee later'
        ]
      },
      {
        id: 'apex-eod-standard',
        name: 'EOD Trail Standard',
        accountSizes: [25000, 150000],
        price: 59,
        currency: 'USD',
        profitTarget: '$3,000',
        dailyDrawdown: '$1,000',
        maxDrawdown: 'EOD trailing',
        evaluationDuration: '1 day minimum',
        profitSplit: '100%',
        features: [
          'Daily loss limit of $1,000',
          'End-of-day drawdown calculation',
          'Standard evaluation package'
        ],
        pros: [
          'Clear daily loss limit',
          'EOD evaluation style',
          '100% profit split'
        ],
        cons: [
          'Daily loss limit adds constraint'
        ]
      }
    ]
  },
  {
    id: 'earn2trade',
    name: 'Earn2Trade',
    logo: 'Earn2Trade',
    type: 'futures',
    description: 'Comprehensive evaluation with various account sizes.',
    color: '#10B981',
    plans: [
      {
        id: 'earn2trade-standard',
        name: 'Standard Challenge',
        accountSizes: [25000, 50000, 100000, 200000],
        price: 150,
        currency: 'USD',
        profitTarget: '10%',
        dailyDrawdown: '5%',
        maxDrawdown: '10%',
        evaluationDuration: '45 days',
        profitSplit: '90%',
        features: [
          '45-day evaluation period',
          '90% profit split',
          'Multiple account sizes up to $200K',
          'No strategy restrictions'
        ],
        pros: [
          'Generous profit split',
          'Long evaluation window',
          'Large account options'
        ],
        cons: [
          'Higher evaluation fee',
          'Standard drawdown rules'
        ]
      }
    ]
  },
  {
    id: 'tickticktrader',
    name: 'TickTickTrader',
    logo: 'TickTickTrader',
    type: 'futures',
    description: 'Fast funding with generous profit splits.',
    color: '#8B5CF6',
    plans: [
      {
        id: 'ticktick-standard',
        name: 'Standard Challenge',
        accountSizes: [15000, 30000, 50000],
        price: 127,
        currency: 'USD',
        profitTarget: '10%',
        dailyDrawdown: '5%',
        maxDrawdown: '10%',
        evaluationDuration: '30 days',
        profitSplit: '80%',
        features: [
          '30-day evaluation',
          '80% profit split',
          'Fast funding path'
        ],
        pros: [
          'Reasonable evaluation period',
          'Good profit split',
          'Mid-range pricing'
        ],
        cons: [
          'Limited account sizes'
        ]
      }
    ]
  },
  {
    id: 'mff',
    name: 'MyFundedFutures',
    logo: 'MyFundedFutures',
    type: 'futures',
    description: 'Modern prop firm with flexible evaluation options.',
    color: '#06B6D4',
    plans: [
      {
        id: 'mff-standard',
        name: 'Standard Challenge',
        accountSizes: [25000, 50000, 100000],
        price: 129,
        currency: 'USD',
        profitTarget: '10%',
        dailyDrawdown: '5%',
        maxDrawdown: '10%',
        evaluationDuration: '60 days',
        profitSplit: '80%',
        features: [
          '60-day evaluation window',
          '80% profit split',
          'Simulated funding'
        ],
        pros: [
          'Adequate evaluation time',
          'Standard profit split'
        ],
        cons: [
          'Competitive pricing'
        ]
      }
    ]
  }
];

// Combined prop firms data
export const ALL_PROPIRFIRES = [...FOREX_PROPFIRES, ...FUTURES_PROPFIRES];

// Helper function to get prop firm by ID
export function getPropFirmById(id, type = 'forex' | 'futures') {
  if (type === 'forex') {
    return FOREX_PROPFIRES.find(f => f.id === id);
  }
  return FUTURES_PROPFIRES.find(f => f.id === id);
}

// Helper function to get all plan IDs
export function getAllPlanIds() {
  const ids = [];
  [...FOREX_PROPFIRES, ...FUTURES_PROPFIRES].forEach(f => {
    f.plans.forEach(p => ids.push({ id: p.id, name: p.name, firm: f.name }));
  });
  return ids;
}