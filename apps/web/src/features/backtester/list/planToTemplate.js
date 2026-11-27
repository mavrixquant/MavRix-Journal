/**
 * Helper functions for converting prop firm plan data to session form templates
 */

// Parse profit target string like "10%" or "$3,000" into numeric percentage value
export function parseProfitTarget(str, defaultAmt = 100000) {
  if (!str) return 10;
  if (str.includes('%')) return parseFloat(str);
  // Dollar amount - convert to percentage of default account
  const num = parseFloat(str.replace(/[,$]/g, ''));
  return (num / defaultAmt) * 100;
}

// Convert plan data to form template for SessionFormModal
export function planToTemplate(plan, firm) {
  const isDollarTarget = plan.profitTarget && !plan.profitTarget.includes('%');
  const targetPct = isDollarTarget
    ? parseProfitTarget(plan.profitTarget, plan.accountSizes[0] || 50000)
    : parseProfitTarget(plan.profitTarget);

  const dailyStr = plan.dailyDrawdown;
  const maxStr = plan.maxDrawdown;

  // Parse daily drawdown - could be percentage like "10%" or "None" or "5%"
  let dailyPct = 10;
  if (dailyStr) {
    if (dailyStr.includes('%')) {
      dailyPct = parseFloat(dailyStr);
    } else if (dailyStr === 'None' || dailyStr === 'N/A') {
      dailyPct = 5; // Very low default for "none"
    } else if (!isNaN(parseFloat(dailyStr))) {
      dailyPct = parseFloat(dailyStr);
    }
  }

  // Parse max drawdown - could be percentage like "10%", "Trailing", or a number
  let maxPct = 10;
  if (maxStr) {
    if (maxStr.includes('%')) {
      maxPct = parseFloat(maxStr);
    } else if (maxStr === 'Trailing') {
      maxPct = 10; // Default for trailing
    } else if (!isNaN(parseFloat(maxStr))) {
      maxPct = parseFloat(maxStr);
    }
  }

  return {
    firm: {
      name: firm.name,
      color: firm.color
    },
    plan: {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      accountSizes: plan.accountSizes,
      profitTarget: targetPct,
      dailyDrawdown: dailyPct,
      maxDrawdown: maxPct,
      profitSplit: plan.profitSplit,
      features: plan.features,
      evaluationDuration: plan.evaluationDuration
    }
  };
}