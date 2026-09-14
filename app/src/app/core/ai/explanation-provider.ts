import { Injectable } from '@angular/core';
import { CostModel, PricingResult, ProfitRoadmap } from '../engine';
import { DEFAULT_LOCALE, MESSAGES, createTranslator } from '../i18n';

/**
 * The AI boundary. Implementations may REPHRASE and ELABORATE on numbers that the
 * deterministic engine has already computed. They never calculate, never invent data,
 * and never promise outcomes. V1 ships the template provider; a Claude-backed provider
 * (via a Firebase Function) can be swapped in later without touching the UI.
 *
 * Unlike the engine, this lives outside `core/engine`, so it reads its sentences
 * straight from the i18n catalogue rather than carrying English literals plus a
 * translated twin. One source of copy, every locale.
 */
export interface ExplanationProvider {
  explainPrice(model: CostModel, pricing: PricingResult, locale?: string): Promise<string>;
  explainRoadmap(model: CostModel, pricing: PricingResult, roadmap: ProfitRoadmap, locale?: string): Promise<string>;
}

@Injectable({ providedIn: 'root' })
export class TemplateExplanationProvider implements ExplanationProvider {
  async explainPrice(m: CostModel, p: PricingResult, locale = DEFAULT_LOCALE): Promise<string> {
    const t = createTranslator(locale, MESSAGES, m.meta.currency).t;
    const cur = m.meta.currency;
    const unit = `unit.${m.meta.businessType}.one`;
    const units = `unit.${m.meta.businessType}.other`;
    const top = p.costBreakdown[0];

    const parts = [
      t('explain.price.cost', { cur, unit, cost: p.trueCostPerUnit }),
      top ? t('explain.price.topLine', { label: t([`costLine.${top.key}`], {}), share: top.share }) : '',
      p.marginBand.rationaleI18n ? t(p.marginBand.rationaleI18n.key, p.marginBand.rationaleI18n.params) : p.marginBand.rationale,
      t('explain.price.outcome', {
        cur,
        unit,
        units,
        price: p.recommended.price,
        profit: p.recommended.profitPerUnit,
        margin: p.recommended.marginPct,
        monthly: p.recommended.monthlyProfit,
        count: p.expectedUnits,
      }),
      p.target.achievableAtRecommended
        ? t('explain.price.targetMet', { cur, target: p.target.targetMonthlyProfit })
        : t('explain.price.targetShort', {
            cur,
            unit,
            units,
            target: p.target.targetMonthlyProfit,
            required: p.target.requiredPrice,
            requiredUnits: p.target.requiredUnitsAtRecommended ?? '—',
          }),
    ];
    return parts.filter(Boolean).join(' ');
  }

  async explainRoadmap(m: CostModel, _p: PricingResult, r: ProfitRoadmap, locale = DEFAULT_LOCALE): Promise<string> {
    const t = createTranslator(locale, MESSAGES, m.meta.currency).t;
    const cur = m.meta.currency;
    const first = r.recommendations[0];
    if (!first) return t('explain.roadmap.none');
    const title = first.i18n ? t(first.i18n.title.key, first.i18n.title.params) : first.title;
    return t('explain.roadmap.summary', {
      cur,
      title,
      impact: first.estimatedMonthlyImpact,
      count: r.recommendations.length,
      current: r.current.monthlyProfit,
      optimised: r.optimisedMonthlyProfit,
    });
  }
}
