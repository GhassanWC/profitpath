/**
 * Deterministic pricing engine.
 *
 * Notation (see docs/01-architecture-analysis.md §5):
 *   U  expected monthly units          F  total fixed monthly cost
 *   D  direct cost per unit            V  per-unit variable cost not tied to price
 *   O  allocated overhead = F / U      f  fee fraction of price (payment + platform + commission + returns)
 *   B  base cost per unit = D + V + O
 *
 *   breakEvenPrice      = B / (1 - f)
 *   priceForMargin(m)   = B / (1 - f - m)
 *   profitPerUnit(p)    = p(1 - f) - D - V - O
 *   contribution(p)     = p(1 - f) - D - V
 *   monthlyProfit(p,U)  = contribution(p) * U - F
 */
import { CostLine, CostModel, PricingResult, Scenario, ScenarioStatus, TargetAnalysis } from './types';
import { businessTypeDef } from './business-types';
import { charmRound, round2, safeDiv } from './money';

export interface UnitEconomics {
  D: number;
  V: number;
  F: number;
  U: number;
  O: number;
  f: number;
  B: number;
}

export function unitEconomics(m: CostModel, overrides: Partial<{ units: number }> = {}): UnitEconomics {
  const U = Math.max(1, overrides.units ?? m.goals.expectedUnits);
  const wastage = clampPct(m.variable.wastagePct);
  const d = m.direct;
  const D =
    d.purchase * (1 + wastage) +
    d.materials * (1 + wastage) +
    d.labor +
    d.shipping +
    d.customs +
    d.packaging +
    d.other;
  const V = m.variable.marketingPerUnit + m.variable.otherPerUnit;
  const fx = m.fixedMonthly;
  const F = fx.rent + fx.software + fx.salaries + fx.storage + fx.equipment + fx.insurance + fx.other;
  const O = F / U;
  const f = Math.min(
    0.95,
    clampPct(m.variable.paymentFeePct) +
      clampPct(m.variable.platformFeePct) +
      clampPct(m.variable.commissionPct) +
      clampPct(m.variable.returnsPct),
  );
  const B = D + V + O;
  return { D, V, F, U, O, f, B };
}

function clampPct(p: number | undefined): number {
  if (!p || !isFinite(p) || p < 0) return 0;
  return p / 100;
}

export function priceForMargin(e: UnitEconomics, margin: number): number {
  const denom = 1 - e.f - margin;
  if (denom <= 0.01) return e.B / 0.01; // margin not reachable; return an extreme price
  return e.B / denom;
}

export function profitPerUnitAt(e: UnitEconomics, price: number): number {
  return price * (1 - e.f) - e.D - e.V - e.O;
}

export function contributionAt(e: UnitEconomics, price: number): number {
  return price * (1 - e.f) - e.D - e.V;
}

export function breakEvenUnitsAt(e: UnitEconomics, price: number): number | null {
  const c = contributionAt(e, price);
  if (c <= 0) return null;
  if (e.F === 0) return 0;
  return Math.ceil(e.F / c);
}

/** Evaluate any price at the model's (or overridden) volume. Used by scenarios and the what-if simulator. */
export function evaluatePrice(
  m: CostModel,
  price: number,
  key: Scenario['key'] = 'custom',
  label = 'Custom',
  opts: { units?: number; status?: ScenarioStatus; note?: string } = {},
): Scenario {
  const e = unitEconomics(m, { units: opts.units });
  const profitPerUnit = profitPerUnitAt(e, price);
  const marginPct = price > 0 ? profitPerUnit / price : 0;
  const monthlyRevenue = price * e.U;
  const monthlyProfit = contributionAt(e, price) * e.U - e.F;
  const band = businessTypeDef(m.meta.businessType).marginBand;
  let status: ScenarioStatus = opts.status ?? 'recommended';
  if (!opts.status) {
    if (profitPerUnit <= 0) status = 'loss';
    else if (marginPct < band.low) status = 'low';
    else if (marginPct > band.high) status = 'premium';
  }
  return {
    key,
    label,
    price: round2(price),
    profitPerUnit: round2(profitPerUnit),
    marginPct,
    monthlyRevenue: round2(monthlyRevenue),
    monthlyProfit: round2(monthlyProfit),
    breakEvenUnits: breakEvenUnitsAt(e, price),
    status,
    note: opts.note ?? '',
  };
}

export function computePricing(m: CostModel): PricingResult {
  const def = businessTypeDef(m.meta.businessType);
  const e = unitEconomics(m);
  const warnings: string[] = [];

  const breakEvenPrice = e.B / (1 - e.f);
  const variableBreakEvenPrice = (e.D + e.V) / (1 - e.f);

  // Margin targets
  const band = { ...def.marginBand };
  const desired = m.goals.desiredMarginPct && m.goals.desiredMarginPct > 0 ? m.goals.desiredMarginPct / 100 : undefined;
  const midTarget = desired ?? band.mid;
  if (desired !== undefined) {
    band.rationale = `You asked for a ${Math.round(desired * 100)}% margin. For reference, ${def.shortLabel.toLowerCase()} businesses typically run ${pct(def.marginBand.low)}–${pct(def.marginBand.high)}.`;
  }
  const lowTarget = Math.max(def.floorMargin, Math.min(band.low, midTarget - 0.05));
  const highTarget = Math.max(midTarget + 0.05, band.high);

  // Raw prices, then charm-round upward so the rounded price still meets the target.
  const minimumPrice = charmRound(Math.max(priceForMargin(e, lowTarget), breakEvenPrice * 1.03));
  let recommendedPrice = charmRound(priceForMargin(e, midTarget));
  let premiumPrice = charmRound(priceForMargin(e, highTarget));
  if (recommendedPrice <= minimumPrice) recommendedPrice = charmRound(minimumPrice * 1.05 + 0.01);
  if (premiumPrice <= recommendedPrice) premiumPrice = charmRound(recommendedPrice * 1.08 + 0.01);

  const minimum = evaluatePrice(m, minimumPrice, 'minimum', 'Minimum', {
    status: 'low',
    note: 'Covers every cost with a thin safety margin. Little room for surprises.',
  });
  const recommended = evaluatePrice(m, recommendedPrice, 'recommended', 'Recommended', {
    status: 'recommended',
    note: `Targets a ${pct(midTarget)} net margin — ${desired !== undefined ? 'your requested margin' : `the midpoint for ${def.shortLabel.toLowerCase()} businesses`}.`,
  });
  const premium = evaluatePrice(m, premiumPrice, 'premium', 'Premium', {
    status: 'premium',
    note: 'Higher margin per sale, but you will likely need stronger positioning or fewer, better customers.',
  });

  const trueCostPerUnit = e.B + recommended.price * e.f;

  // Target profit analysis at expected units
  const T = Math.max(0, m.goals.targetMonthlyProfit || 0);
  const requiredProfitPerUnit = T / e.U;
  const requiredPrice = (e.D + e.V + e.O + requiredProfitPerUnit) / (1 - e.f);
  const requiredMarginPct = requiredPrice > 0 ? requiredProfitPerUnit / requiredPrice : 0;
  const contribRec = contributionAt(e, recommended.price);
  const requiredUnitsAtRecommended = contribRec > 0 ? Math.ceil((T + e.F) / contribRec) : null;
  const gapAtRecommended = recommended.monthlyProfit - T;
  const target: TargetAnalysis = {
    targetMonthlyProfit: T,
    requiredProfitPerUnit: round2(requiredProfitPerUnit),
    requiredPrice: round2(requiredPrice),
    requiredMarginPct,
    requiredUnitsAtRecommended,
    gapAtRecommended: round2(gapAtRecommended),
    achievableAtRecommended: gapAtRecommended >= 0,
  };

  // Cost breakdown at recommended price
  const wastage = clampPct(m.variable.wastagePct);
  const lines: CostLine[] = [];
  const push = (key: string, label: string, amount: number, group: CostLine['group']) => {
    if (amount > 0.004) lines.push({ key, label, amount: round2(amount), share: 0, group });
  };
  push('purchase', 'Purchase cost', m.direct.purchase * (1 + wastage), 'direct');
  push('materials', 'Materials', m.direct.materials * (1 + wastage), 'direct');
  push('labor', 'Labour', m.direct.labor, 'direct');
  push('shipping', 'Shipping', m.direct.shipping, 'direct');
  push('customs', 'Customs & duties', m.direct.customs, 'direct');
  push('packaging', 'Packaging', m.direct.packaging, 'direct');
  push('otherDirect', 'Other direct costs', m.direct.other, 'direct');
  push('marketing', 'Marketing / acquisition', m.variable.marketingPerUnit, 'variable');
  push('otherVariable', 'Other variable costs', m.variable.otherPerUnit, 'variable');
  push('overhead', 'Allocated monthly overhead', e.O, 'overhead');
  push('paymentFees', 'Payment fees', recommended.price * clampPct(m.variable.paymentFeePct), 'fees');
  push('platformFees', 'Platform / marketplace fees', recommended.price * clampPct(m.variable.platformFeePct), 'fees');
  push('commission', 'Commission', recommended.price * clampPct(m.variable.commissionPct), 'fees');
  push('returns', 'Returns & refunds', recommended.price * clampPct(m.variable.returnsPct), 'fees');
  const total = lines.reduce((s, l) => s + l.amount, 0) || 1;
  lines.forEach((l) => (l.share = l.amount / total));
  lines.sort((a, b) => b.amount - a.amount);

  // Warnings (conservative, plain language)
  if (e.O / e.B > 0.4) warnings.push(`Fixed costs are ${pct(e.O / e.B)} of your cost per ${def.unitLabel}. Your price depends heavily on actually selling ${e.U} ${def.unitLabelPlural} a month.`);
  if (e.f > 0.2) warnings.push(`Percentage fees take ${pct(e.f)} of every sale before you see any profit.`);
  if (!target.achievableAtRecommended && T > 0) warnings.push(`At the recommended price and ${e.U} ${def.unitLabelPlural}/month you would be about ${Math.round(-gapAtRecommended)} ${m.meta.currency} short of your ${T} ${m.meta.currency} target. See the target panel and roadmap.`);
  if (desired !== undefined && desired > def.marginBand.high + 0.1) warnings.push(`A ${pct(desired)} margin is well above the typical ${pct(def.marginBand.low)}–${pct(def.marginBand.high)} for this business type; expect a harder sell.`);

  return {
    currency: m.meta.currency,
    unitLabel: def.unitLabel,
    expectedUnits: e.U,
    unitDirectCost: round2(e.D),
    unitVariableCost: round2(e.V),
    allocatedOverhead: round2(e.O),
    fixedMonthly: round2(e.F),
    feeFraction: e.f,
    baseCostPerUnit: round2(e.B),
    breakEvenPrice: round2(breakEvenPrice),
    variableBreakEvenPrice: round2(variableBreakEvenPrice),
    trueCostPerUnit: round2(trueCostPerUnit),
    marginBand: { low: lowTarget, mid: midTarget, high: highTarget, rationale: band.rationale },
    scenarios: { minimum, recommended, premium },
    recommended,
    target,
    costBreakdown: lines,
    warnings,
  };
}

/** What-if: apply overrides to a model and return a fresh model (immutable). */
export interface WhatIfOverrides {
  price?: number;
  units?: number;
  purchase?: number;
  materials?: number;
  labor?: number;
  shipping?: number;
  marketingPerUnit?: number;
  fixedMonthlyTotal?: number;
  platformFeePct?: number;
}

export function applyWhatIf(m: CostModel, o: WhatIfOverrides): CostModel {
  const next: CostModel = JSON.parse(JSON.stringify(m));
  if (o.units !== undefined) next.goals.expectedUnits = Math.max(1, o.units);
  if (o.purchase !== undefined) next.direct.purchase = Math.max(0, o.purchase);
  if (o.materials !== undefined) next.direct.materials = Math.max(0, o.materials);
  if (o.labor !== undefined) next.direct.labor = Math.max(0, o.labor);
  if (o.shipping !== undefined) next.direct.shipping = Math.max(0, o.shipping);
  if (o.marketingPerUnit !== undefined) next.variable.marketingPerUnit = Math.max(0, o.marketingPerUnit);
  if (o.platformFeePct !== undefined) next.variable.platformFeePct = Math.max(0, o.platformFeePct);
  if (o.fixedMonthlyTotal !== undefined) {
    const e = unitEconomics(m);
    const scale = e.F > 0 ? Math.max(0, o.fixedMonthlyTotal) / e.F : 0;
    const fx = next.fixedMonthly;
    if (e.F > 0) {
      (Object.keys(fx) as (keyof typeof fx)[]).forEach((k) => (fx[k] = fx[k] * scale));
    } else {
      fx.other = Math.max(0, o.fixedMonthlyTotal);
    }
  }
  return next;
}

function pct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
