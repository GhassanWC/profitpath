import { Injectable } from '@angular/core';
import { CostModel, PricingResult, ProfitRoadmap } from '../engine';

/**
 * The AI boundary. Implementations may REPHRASE and ELABORATE on numbers that the
 * deterministic engine has already computed. They never calculate, never invent data,
 * and never promise outcomes. V1 ships the template provider; a Claude-backed provider
 * (via a Firebase Function) can be swapped in later without touching the UI.
 */
export interface ExplanationProvider {
  explainPrice(model: CostModel, pricing: PricingResult): Promise<string>;
  explainRoadmap(model: CostModel, pricing: PricingResult, roadmap: ProfitRoadmap): Promise<string>;
}

@Injectable({ providedIn: 'root' })
export class TemplateExplanationProvider implements ExplanationProvider {
  async explainPrice(m: CostModel, p: PricingResult): Promise<string> {
    const cur = m.meta.currency;
    const top = p.costBreakdown[0];
    const parts = [
      `Based on the information you provided, one ${p.unitLabel} costs you about ${fmt(p.trueCostPerUnit, cur)} once every direct cost, selling cost and your share of monthly overhead is counted.`,
      top ? `${top.label} is the largest component at ${Math.round(top.share * 100)}% of that.` : '',
      `${p.marginBand.rationale}`,
      `Pricing at ${fmt(p.recommended.price, cur)} is estimated to leave ${fmt(p.recommended.profitPerUnit, cur)} per ${p.unitLabel} (${(p.recommended.marginPct * 100).toFixed(1)}% margin), or roughly ${fmt(p.recommended.monthlyProfit, cur)} a month at ${p.expectedUnits} ${p.unitLabel}s.`,
      p.target.achievableAtRecommended
        ? `That is above your target of ${fmt(p.target.targetMonthlyProfit, cur)}.`
        : `Your target of ${fmt(p.target.targetMonthlyProfit, cur)} would need either ${fmt(p.target.requiredPrice, cur)} per ${p.unitLabel} at your current volume, or about ${p.target.requiredUnitsAtRecommended ?? '—'} ${p.unitLabel}s a month at the recommended price. The roadmap shows ways to close that gap without only raising the price.`,
    ];
    return parts.filter(Boolean).join(' ');
  }

  async explainRoadmap(m: CostModel, _p: PricingResult, r: ProfitRoadmap): Promise<string> {
    const cur = m.meta.currency;
    const first = r.recommendations[0];
    if (!first) return 'We could not find cost or revenue levers large enough to recommend with your current inputs. Try adjusting the what-if simulator to explore options.';
    return `Assuming the inputs you gave hold, the biggest single opportunity is "${first.title}", estimated at ${fmt(first.estimatedMonthlyImpact, cur)} a month. Together, the ${r.recommendations.length} items listed could potentially lift monthly profit from ${fmt(r.current.monthlyProfit, cur)} to around ${fmt(r.optimisedMonthlyProfit, cur)} after allowing for overlap between them. Start with the high-priority items; each one lists the assumption its estimate depends on.`;
  }
}

function fmt(v: number, cur: string): string {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: cur, maximumFractionDigits: v < 100 ? 2 : 0 }).format(v);
  } catch {
    return `${cur} ${v.toFixed(0)}`;
  }
}
