/**
 * Rule-based Profit Roadmap engine.
 * Every recommendation's impact is computed from the user's own numbers with a stated,
 * conservative assumption. Copy is templated; an LLM may later rephrase it but never
 * computes anything. See ExplanationProvider in core/ai.
 */
import { CostModel, Difficulty, PricingResult, Priority, ProfitRoadmap, RecCategory, Recommendation } from './types';
import { businessTypeDef } from './business-types';
import { contributionAt, unitEconomics, UnitEconomics } from './pricing';
import { formatMoney, formatPct, round2 } from './money';

export const ROADMAP_ASSUMPTIONS = {
  supplierReductionPct: 0.05,
  materialsReductionPct: 0.07,
  shippingReductionPct: 0.15,
  cacReductionPct: 0.3,
  feeShiftShare: 0.3, // share of volume moved to a lower-fee channel
  feeShiftSavingPts: 3, // percentage points saved on that share
  priceTestIncrease: 0.05,
  priceTestVolumeLoss: 0.08,
  volumeIncrease: 0.2,
  upsellAttachRate: 0.25,
  upsellPriceShare: 0.1,
  upsellMargin: 0.5,
  repeatUplift: 0.1,
  overheadReduction: 0.1,
  laborEfficiency: 0.15,
  returnsReduction: 0.33,
  interactionDiscount: 0.15,
};

interface Ctx {
  m: CostModel;
  p: PricingResult;
  e: UnitEconomics;
  price: number;
  cur: string;
  unit: string;
  units: string;
  monthlyProfit: number;
}

interface Rule {
  id: string;
  category: RecCategory;
  difficulty: Difficulty;
  applies: (c: Ctx) => boolean;
  build: (c: Ctx) => Omit<Recommendation, 'id' | 'category' | 'difficulty' | 'priority'>;
}

const A = ROADMAP_ASSUMPTIONS;
const money = (v: number, cur: string) => formatMoney(v, cur, { decimals: v < 100 ? 2 : 0 });

const RULES: Rule[] = [
  {
    id: 'supplier_cost',
    category: 'reduce_costs',
    difficulty: 'medium',
    applies: (c) => c.m.direct.purchase > 0 && c.m.direct.purchase / c.p.trueCostPerUnit >= 0.3,
    build: (c) => {
      const share = c.m.direct.purchase / c.p.trueCostPerUnit;
      const saving = c.m.direct.purchase * A.supplierReductionPct;
      const target = c.m.direct.purchase - saving;
      return {
        title: `Find a supplier below ${money(target, c.cur)} per ${c.unit}`,
        why: `Purchase cost is ${formatPct(share, 0)} of your true cost per ${c.unit} — the single biggest lever you have. Every ${c.cur} saved here goes straight to profit.`,
        action: 'Request quotes from 3–5 suppliers for your volume. Compare landed cost (price + shipping + duties), minimum order quantity, warranty and payment terms — not just the unit price.',
        estimatedMonthlyImpact: round2(saving * c.e.U),
        assumptions: [`A ${formatPct(A.supplierReductionPct, 0)} lower purchase price is achievable at your volume (conservative for most categories).`, `Volume stays at ${c.e.U} ${c.units}/month.`],
      };
    },
  },
  {
    id: 'materials_cost',
    category: 'reduce_costs',
    difficulty: 'medium',
    applies: (c) => c.m.direct.materials > 0 && c.m.direct.materials / c.p.trueCostPerUnit >= 0.25,
    build: (c) => {
      const saving = c.m.direct.materials * A.materialsReductionPct;
      return {
        title: `Cut materials cost by ~${formatPct(A.materialsReductionPct, 0)} through bulk buying`,
        why: `Materials are ${formatPct(c.m.direct.materials / c.p.trueCostPerUnit, 0)} of your cost per ${c.unit}. Buying in larger quantities or from a wholesaler usually brings this down.`,
        action: 'Price your three most expensive ingredients or materials at wholesale quantities. Check whether a slightly cheaper grade would be noticed by customers.',
        estimatedMonthlyImpact: round2(saving * c.e.U),
        assumptions: [`Materials cost drops by ${formatPct(A.materialsReductionPct, 0)} at wholesale quantities.`, 'No change in quality or sales volume.'],
      };
    },
  },
  {
    id: 'shipping_cost',
    category: 'reduce_costs',
    difficulty: 'easy',
    applies: (c) => c.m.direct.shipping > 0 && c.m.direct.shipping / c.p.trueCostPerUnit >= 0.06,
    build: (c) => {
      const saving = c.m.direct.shipping * A.shippingReductionPct;
      return {
        title: `Reduce shipping from ${money(c.m.direct.shipping, c.cur)} to about ${money(c.m.direct.shipping - saving, c.cur)} per ${c.unit}`,
        why: `Shipping is ${formatPct(c.m.direct.shipping / c.p.trueCostPerUnit, 0)} of your cost per ${c.unit}. Consolidated shipments and negotiated courier rates typically cut this.`,
        action: 'Get quotes from two freight forwarders or couriers for consolidated monthly shipments. Ask about volume-based rates once you reach a steady order count.',
        estimatedMonthlyImpact: round2(saving * c.e.U),
        assumptions: [`${formatPct(A.shippingReductionPct, 0)} lower shipping through consolidation or negotiated rates.`],
      };
    },
  },
  {
    id: 'cac',
    category: 'reduce_cac',
    difficulty: 'medium',
    applies: (c) =>
      c.m.variable.marketingPerUnit > 0 &&
      (c.m.variable.marketingPerUnit / c.price >= 0.02 || c.m.variable.marketingPerUnit / Math.max(1, c.p.recommended.profitPerUnit) >= 0.1),
    build: (c) => {
      const cur = c.m.variable.marketingPerUnit;
      const saving = cur * A.cacReductionPct;
      return {
        title: `Bring acquisition cost from ${money(cur, c.cur)} to ~${money(cur - saving, c.cur)} per ${c.unit}`,
        why: `You spend ${formatPct(cur / c.price, 1)} of every sale on acquiring the customer. Channels like referrals, organic content, WhatsApp broadcast lists and email cost far less per sale than paid ads.`,
        action: 'Launch a referral offer for existing customers, post consistently on one organic channel, and retarget past visitors instead of cold audiences. Track cost per sale weekly.',
        estimatedMonthlyImpact: round2(saving * c.e.U),
        assumptions: [`Acquisition cost per ${c.unit} falls by ${formatPct(A.cacReductionPct, 0)} within 2–3 months.`, 'Sales volume is unchanged.'],
      };
    },
  },
  {
    id: 'platform_fees',
    category: 'reduce_costs',
    difficulty: 'medium',
    applies: (c) => c.m.variable.platformFeePct >= 8,
    build: (c) => {
      const saving = c.price * (A.feeShiftSavingPts / 100) * A.feeShiftShare;
      return {
        title: `Move ${formatPct(A.feeShiftShare, 0)} of sales to a lower-fee channel`,
        why: `Platform fees of ${c.m.variable.platformFeePct}% take ${money(c.price * (c.m.variable.platformFeePct / 100), c.cur)} from every ${c.unit}. Direct channels (your own store, WhatsApp) keep most of that.`,
        action: 'Add a "reorder directly" card or WhatsApp link in every delivery. Offer a small direct-order incentive that is still cheaper than the platform fee.',
        estimatedMonthlyImpact: round2(saving * c.e.U),
        assumptions: [`${formatPct(A.feeShiftShare, 0)} of volume moves to a channel with fees ${A.feeShiftSavingPts} points lower.`, 'Total volume is unchanged.'],
      };
    },
  },
  {
    id: 'price_test',
    category: 'increase_revenue',
    difficulty: 'easy',
    applies: (c) => {
      const newPrice = c.price * (1 + A.priceTestIncrease);
      const newUnits = c.e.U * (1 - A.priceTestVolumeLoss);
      const newProfit = contributionAt(c.e, newPrice) * newUnits - c.e.F;
      return newProfit - c.monthlyProfit > Math.max(20, c.monthlyProfit * 0.03) && c.p.recommended.marginPct < c.p.marginBand.high;
    },
    build: (c) => {
      const newPrice = c.price * (1 + A.priceTestIncrease);
      const newUnits = c.e.U * (1 - A.priceTestVolumeLoss);
      const newProfit = contributionAt(c.e, newPrice) * newUnits - c.e.F;
      return {
        title: `Test a ${formatPct(A.priceTestIncrease, 0)} higher price (${money(newPrice, c.cur)})`,
        why: `Your recommended margin (${formatPct(c.p.recommended.marginPct, 1)}) is below the top of the typical range for ${businessTypeDef(c.m.meta.businessType).shortLabel.toLowerCase()} businesses (${formatPct(c.p.marginBand.high, 0)}). Even if a few customers drop off, the higher price is likely to earn more.`,
        action: 'Run the higher price for 2–4 weeks on new customers only. Keep the offer identical and watch conversion, not just complaints. Keep it if profit rises.',
        estimatedMonthlyImpact: round2(newProfit - c.monthlyProfit),
        assumptions: [`A ${formatPct(A.priceTestIncrease, 0)} price rise loses ${formatPct(A.priceTestVolumeLoss, 0)} of volume (a cautious elasticity assumption).`],
      };
    },
  },
  {
    id: 'upsell',
    category: 'increase_value',
    difficulty: 'easy',
    applies: (c) => c.price > 0,
    build: (c) => {
      const addon = c.price * A.upsellPriceShare;
      const perUnit = addon * A.upsellMargin * A.upsellAttachRate;
      const t = c.m.meta.businessType;
      const example =
        t === 'resell' || t === 'import' ? 'accessories, cases, protection plans or extended warranty' :
        t === 'service' || t === 'freelance' ? 'an express-delivery option, extra deliverables or a maintenance package' :
        t === 'food' ? 'drinks, sides or a "party size" option' :
        t === 'handmade' ? 'gift wrapping, personalisation or a matching item' :
        t === 'digital' ? 'a workbook, template pack or 1:1 session' :
        t === 'saas' ? 'a higher tier, add-on seats or onboarding' : 'a matching add-on';
      return {
        title: `Add an upsell worth ~${money(addon, c.cur)} (${example})`,
        why: `Selling something extra to a customer you already have costs almost nothing to acquire. A modest add-on with a healthy margin lifts profit per ${c.unit} without touching your core price.`,
        action: `Design one add-on at roughly ${formatPct(A.upsellPriceShare, 0)} of your price and offer it at the moment of purchase. Measure the attach rate for a month.`,
        estimatedMonthlyImpact: round2(perUnit * c.e.U),
        assumptions: [`${formatPct(A.upsellAttachRate, 0)} of customers take the add-on.`, `The add-on carries a ${formatPct(A.upsellMargin, 0)} margin.`],
      };
    },
  },
  {
    id: 'repeat',
    category: 'increase_value',
    difficulty: 'medium',
    applies: (c) => businessTypeDef(c.m.meta.businessType).repeatable && contributionAt(c.e, c.price) > 0,
    build: (c) => {
      const extraUnits = c.e.U * A.repeatUplift;
      // Repeat orders carry no acquisition cost, so contribution excludes marketingPerUnit.
      const contribNoCac = (c.price * (1 - c.e.f) - c.e.D - c.m.variable.otherPerUnit) * extraUnits;
      return {
        title: `Win ${formatPct(A.repeatUplift, 0)} more volume from repeat customers`,
        why: `Repeat ${c.units} have no acquisition cost, so each one earns about ${money(c.price * (1 - c.e.f) - c.e.D - c.m.variable.otherPerUnit, c.cur)} — more than a new sale.`,
        action: 'Collect every customer’s contact at purchase, follow up 2–4 weeks later with a reorder reminder or a loyalty perk, and make reordering a one-tap action.',
        estimatedMonthlyImpact: round2(contribNoCac),
        assumptions: [`Repeat purchases add ${formatPct(A.repeatUplift, 0)} to monthly volume.`, 'Repeat orders carry no marketing cost.'],
      };
    },
  },
  {
    id: 'volume',
    category: 'increase_revenue',
    difficulty: 'hard',
    applies: (c) => contributionAt(c.e, c.price) > 0 && c.e.O / c.p.baseCostPerUnit >= 0.1,
    build: (c) => {
      const extra = c.e.U * A.volumeIncrease;
      return {
        title: `Grow to ${Math.round(c.e.U + extra)} ${c.units}/month`,
        why: `Fixed costs are ${formatPct(c.e.O / c.p.baseCostPerUnit, 0)} of your cost per ${c.unit}. Every extra ${c.unit} spreads them thinner and earns the full contribution of ${money(contributionAt(c.e, c.price), c.cur)}.`,
        action: 'Pick one channel you are not using yet and commit to it for 60 days. Set a weekly target of new enquiries, not sales, and track conversion.',
        estimatedMonthlyImpact: round2(contributionAt(c.e, c.price) * extra),
        assumptions: [`Volume grows ${formatPct(A.volumeIncrease, 0)} at the same price and acquisition cost.`, 'Fixed costs do not increase.'],
      };
    },
  },
  {
    id: 'overhead',
    category: 'reduce_costs',
    difficulty: 'easy',
    applies: (c) => c.e.F > 0 && c.e.O / c.p.baseCostPerUnit >= 0.2,
    build: (c) => ({
      title: `Trim monthly fixed costs by ${formatPct(A.overheadReduction, 0)} (~${money(c.e.F * A.overheadReduction, c.cur)})`,
      why: `Fixed costs of ${money(c.e.F, c.cur)}/month add ${money(c.e.O, c.cur)} to every ${c.unit} at your expected volume. Unused subscriptions, oversized space and idle tools are the usual culprits.`,
      action: 'List every recurring charge and cancel or downgrade anything not used in the last 30 days. Renegotiate rent or move to shared space if you are below capacity.',
      estimatedMonthlyImpact: round2(c.e.F * A.overheadReduction),
      assumptions: [`${formatPct(A.overheadReduction, 0)} of fixed costs can be removed without affecting sales.`],
    }),
  },
  {
    id: 'labor_efficiency',
    category: 'reduce_costs',
    difficulty: 'medium',
    applies: (c) => c.m.direct.labor > 0 && c.m.direct.labor / c.p.trueCostPerUnit >= 0.35,
    build: (c) => ({
      title: `Save ${formatPct(A.laborEfficiency, 0)} of the time each ${c.unit} takes`,
      why: `Your time is ${formatPct(c.m.direct.labor / c.p.trueCostPerUnit, 0)} of the cost per ${c.unit}. Templates, batching and checklists usually recover this much without lowering quality.`,
      action: 'Time your next five jobs. Batch similar tasks, build templates or presets for repeated steps, and stop doing anything the customer does not notice.',
      estimatedMonthlyImpact: round2(c.m.direct.labor * A.laborEfficiency * c.e.U),
      assumptions: [`Time per ${c.unit} falls by ${formatPct(A.laborEfficiency, 0)}; the freed hours are used for more ${c.units} or other paid work.`],
    }),
  },
  {
    id: 'waste',
    category: 'reduce_costs',
    difficulty: 'easy',
    applies: (c) => c.m.variable.wastagePct >= 5 && c.m.direct.materials + c.m.direct.purchase > 0,
    build: (c) => {
      const base = c.m.direct.materials + c.m.direct.purchase;
      const saving = base * (c.m.variable.wastagePct / 100) * 0.5;
      return {
        title: `Halve waste from ${c.m.variable.wastagePct}% to ${c.m.variable.wastagePct / 2}%`,
        why: `Waste adds ${money(base * (c.m.variable.wastagePct / 100), c.cur)} to every ${c.unit}. Better forecasting and portion control usually halve it.`,
        action: 'Track what is thrown away for two weeks, then adjust batch sizes, pre-orders and storage to match real demand.',
        estimatedMonthlyImpact: round2(saving * c.e.U),
        assumptions: ['Waste is halved with no change in sales.'],
      };
    },
  },
  {
    id: 'returns',
    category: 'reduce_costs',
    difficulty: 'medium',
    applies: (c) => c.m.variable.returnsPct >= 3,
    build: (c) => {
      const saving = c.price * (c.m.variable.returnsPct / 100) * A.returnsReduction;
      return {
        title: `Cut returns and refunds by a third`,
        why: `Returns of ${c.m.variable.returnsPct}% cost ${money(c.price * (c.m.variable.returnsPct / 100), c.cur)} per ${c.unit}. Clearer descriptions, better packaging and quality checks reduce them.`,
        action: 'Read every refund reason for a month. Fix the top two causes: usually mismatched expectations or shipping damage.',
        estimatedMonthlyImpact: round2(saving * c.e.U),
        assumptions: [`Return rate falls by ${formatPct(A.returnsReduction, 0)}.`],
      };
    },
  },
];

const DIFFICULTY_WEIGHT: Record<Difficulty, number> = { easy: 1, medium: 1.4, hard: 2 };

export function buildRoadmap(m: CostModel, p: PricingResult, opts: { completedIds?: string[]; maxItems?: number } = {}): ProfitRoadmap {
  const e = unitEconomics(m);
  const def = businessTypeDef(m.meta.businessType);
  const price = p.recommended.price;
  const ctx: Ctx = { m, p, e, price, cur: m.meta.currency, unit: def.unitLabel, units: def.unitLabelPlural, monthlyProfit: p.recommended.monthlyProfit };

  const recs: Recommendation[] = [];
  for (const rule of RULES) {
    let applies = false;
    try {
      applies = rule.applies(ctx);
    } catch {
      applies = false;
    }
    if (!applies) continue;
    const built = rule.build(ctx);
    if (!isFinite(built.estimatedMonthlyImpact) || built.estimatedMonthlyImpact <= 0) continue;
    recs.push({ id: rule.id, category: rule.category, difficulty: rule.difficulty, priority: 'low', ...built, done: opts.completedIds?.includes(rule.id) ?? false });
  }

  // Priority: impact per unit of difficulty, then bucketed relative to current profit.
  const scored = recs
    .map((r) => ({ r, score: r.estimatedMonthlyImpact / DIFFICULTY_WEIGHT[r.difficulty] }))
    .sort((a, b) => b.score - a.score);
  const reference = Math.max(Math.abs(ctx.monthlyProfit), 1);
  for (const { r } of scored) {
    const rel = r.estimatedMonthlyImpact / reference;
    r.priority = rel >= 0.12 ? 'high' : rel >= 0.05 ? 'medium' : 'low';
  }
  const top = scored.slice(0, opts.maxItems ?? 7).map((s) => s.r);
  // Ensure at least one high priority when there is anything at all
  if (top.length && !top.some((r) => r.priority === 'high')) top[0].priority = 'high';

  const sumOfImpacts = round2(top.reduce((s, r) => s + r.estimatedMonthlyImpact, 0));
  const optimised = round2(ctx.monthlyProfit + sumOfImpacts * (1 - A.interactionDiscount));

  return {
    current: {
      price,
      trueCostPerUnit: p.trueCostPerUnit,
      profitPerUnit: p.recommended.profitPerUnit,
      units: e.U,
      monthlyProfit: ctx.monthlyProfit,
      marginPct: p.recommended.marginPct,
    },
    recommendations: top,
    sumOfImpacts,
    interactionDiscountPct: A.interactionDiscount,
    optimisedMonthlyProfit: optimised,
    targetReached: m.goals.targetMonthlyProfit > 0 ? optimised >= m.goals.targetMonthlyProfit : true,
    disclaimer: 'These are estimates based on the numbers you provided and the assumptions listed under each item. They are not predictions or guarantees. Improvements interact, so the combined effect is usually smaller than the sum of the parts.',
  };
}

export const CATEGORY_META: Record<RecCategory, { label: string; icon: string; blurb: string }> = {
  reduce_costs: { label: 'Reduce costs', icon: '💰', blurb: 'Every unit of cost removed is a unit of profit gained — no extra sales needed.' },
  increase_revenue: { label: 'Increase revenue', icon: '📈', blurb: 'Better pricing and more volume, tested carefully.' },
  reduce_cac: { label: 'Reduce acquisition cost', icon: '📣', blurb: 'Pay less to win each customer.' },
  increase_value: { label: 'Increase customer value', icon: '🔄', blurb: 'Earn more from the customers you already have.' },
};

export function priorityLabel(p: Priority): string {
  return p === 'high' ? 'HIGH' : p === 'medium' ? 'MEDIUM' : 'LOW';
}
