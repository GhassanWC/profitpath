/**
 * Engine tests. Runs with plain node (no Angular, no Jasmine needed):
 *   npx tsc -p tsconfig.engine.json && node dist-engine/engine.spec.js
 * Also compatible with Karma/Jasmine via the describe/it shims below.
 */
import { computePricing, evaluatePrice, applyWhatIf, unitEconomics } from './pricing';
import { normalizeAnswers } from './normalize';
import { detectBusinessType } from './detect';
import { buildRoadmap } from './roadmap';
import { charmRound } from './money';
import { questionGroupsFor, validateGroup } from './questions';
import { SAMPLES } from './samples';
import { BusinessType } from './types';

declare const describe: any;
declare const it: any;
declare const expect: any;

let failures = 0;
let passes = 0;
const g: any = globalThis as any;
const _describe = typeof g.describe === 'function' ? g.describe : (name: string, fn: () => void) => { console.log(`\n${name}`); fn(); };
const _it = typeof g.it === 'function' ? g.it : (name: string, fn: () => void) => {
  try { fn(); passes++; console.log(`  ✓ ${name}`); } catch (e: any) { failures++; console.log(`  ✗ ${name}\n      ${e?.message ?? e}`); }
};
function assert(cond: boolean, msg: string) { if (!cond) throw new Error(msg); }
function close(a: number, b: number, tol = 0.01) { assert(Math.abs(a - b) <= tol, `expected ${a} ≈ ${b}`); }

_describe('charmRound', () => {
  _it('never rounds below the input', () => {
    for (const v of [0.3, 3.14, 12.3, 47.2, 312, 1063, 23400, 999.5]) assert(charmRound(v) >= v, `charmRound(${v}) = ${charmRound(v)}`);
  });
  _it('produces psychological endings', () => {
    assert(charmRound(1063) === 1099, `got ${charmRound(1063)}`);
    assert(charmRound(47.2) === 49, `got ${charmRound(47.2)}`);
    assert(charmRound(312) === 319, `got ${charmRound(312)}`);
    assert(charmRound(23400) === 23499, `got ${charmRound(23400)}`);
    assert(charmRound(21.98) === 24, `got ${charmRound(21.98)}`);
    assert(charmRound(1130.9) === 1149, `got ${charmRound(1130.9)}`);
  });
});

_describe('pricing: iPhone reselling example', () => {
  const s = SAMPLES[0];
  const m = normalizeAnswers(s.type, s.answers, s.offering);
  const p = computePricing(m);
  _it('direct cost is purchase + shipping = 895', () => close(p.unitDirectCost, 895));
  _it('allocated overhead = 600 / 30 = 20', () => close(p.allocatedOverhead, 20));
  _it('base cost = 895 + 35 + 20 = 950', () => close(p.baseCostPerUnit, 950));
  _it('break-even price equals base cost when there are no % fees', () => close(p.breakEvenPrice, 950));
  _it('scenarios are ordered minimum < recommended < premium', () => {
    const { minimum, recommended, premium } = p.scenarios;
    assert(minimum.price < recommended.price && recommended.price < premium.price, `${minimum.price} ${recommended.price} ${premium.price}`);
  });
  _it('recommended margin meets the targeted 16%', () => assert(p.recommended.marginPct >= 0.16, `margin ${p.recommended.marginPct}`));
  _it('monthly profit reconciles with profit per unit × units', () => close(p.recommended.monthlyProfit, p.recommended.profitPerUnit * 30, 0.5));
  _it('true cost = base cost + fees at recommended price', () => close(p.trueCostPerUnit, p.baseCostPerUnit + p.recommended.price * p.feeFraction));
  _it('target: required price for $5,000 at 30 units = 950 + 166.67', () => close(p.target.requiredPrice, 950 + 5000 / 30, 0.02));
  _it('break-even units at recommended price = ceil(600 / contribution)', () => {
    const e = unitEconomics(m);
    const contrib = p.recommended.price - 895 - 35;
    assert(p.recommended.breakEvenUnits === Math.ceil(e.F / contrib), `got ${p.recommended.breakEvenUnits}`);
  });
});

_describe('pricing: percentage fees close analytically', () => {
  const m = normalizeAnswers('digital', { currency: 'USD', paymentFeePct: 3, platformFeePct: 10, returnsPct: 2, otherDirect: 1, marketingPerUnit: 4, software: 50, expectedUnits: 100, targetMonthlyProfit: 1000 });
  const p = computePricing(m);
  _it('fee fraction = 15%', () => close(p.feeFraction, 0.15));
  _it('profit at break-even price is zero', () => close(evaluatePrice(m, p.breakEvenPrice).profitPerUnit, 0, 0.01));
  _it('price for target margin hits the margin exactly before rounding', () => {
    const e = unitEconomics(m);
    const price = e.B / (1 - e.f - 0.6);
    close(evaluatePrice(m, price).marginPct, 0.6, 0.0001);
  });
});

_describe('pricing: services and food unit conversions', () => {
  _it('service labour = (delivery + prep hours) × hourly value', () => {
    const m = normalizeAnswers('service', SAMPLES[1].answers);
    close(m.direct.labor, 20 * 25);
  });
  _it('food monthly units = per day × days', () => {
    const m = normalizeAnswers('food', { expectedUnits: 10, daysPerMonth: 24, materials: 3, laborHours: 0.2, hourlyValue: 10, targetMonthlyProfit: 500 });
    assert(m.goals.expectedUnits === 240, `got ${m.goals.expectedUnits}`);
  });
  _it('saas amortises CAC by churn', () => {
    const m = normalizeAnswers('saas', { cacPerCustomer: 100, churnPct: 5, hostingPerUser: 1, expectedUnits: 200, targetMonthlyProfit: 2000 });
    close(m.variable.marketingPerUnit, 5);
  });
});

_describe('what-if', () => {
  const s = SAMPLES[0];
  const m = normalizeAnswers(s.type, s.answers);
  const p = computePricing(m);
  _it('lower supplier cost raises profit per unit one-for-one', () => {
    const m2 = applyWhatIf(m, { purchase: 800 });
    const sc = evaluatePrice(m2, p.recommended.price);
    close(sc.profitPerUnit, p.recommended.profitPerUnit + 50);
  });
  _it('more units lowers allocated overhead', () => {
    const m2 = applyWhatIf(m, { units: 60 });
    close(computePricing(m2).allocatedOverhead, 10);
  });
  _it('does not mutate the original', () => {
    applyWhatIf(m, { purchase: 1 });
    assert(m.direct.purchase === 850, 'mutated');
  });
});

_describe('detection', () => {
  const cases: Array<[string, BusinessType]> = [
    ['iPhone 17 Pro 256GB', 'resell'],
    ['custom birthday cakes', 'food'],
    ['wedding photography', 'service'],
    ['handmade soy candles', 'handmade'],
    ['online course about Excel', 'digital'],
    ['SaaS invoicing app with monthly subscription', 'saas'],
    ['importing electronics from China', 'import'],
    ['freelance logo design', 'freelance'],
    ['manufacturing private label skincare', 'manufacture'],
  ];
  for (const [text, type] of cases) {
    _it(`"${text}" → ${type}`, () => {
      const d = detectBusinessType(text);
      assert(d.type === type, `got ${d.type} (${d.confidence})`);
      assert(d.confidence > 0.3, `low confidence ${d.confidence}`);
    });
  }
  _it('unknown text has zero confidence', () => assert(detectBusinessType('zzz qqq').confidence === 0, 'should be 0'));
});

_describe('questionnaire', () => {
  _it('every type has context first and goals last', () => {
    for (const t of ['resell', 'import', 'manufacture', 'service', 'freelance', 'handmade', 'food', 'digital', 'saas'] as BusinessType[]) {
      const g = questionGroupsFor(t);
      assert(g[0].id === 'context' && g[g.length - 1].id === 'goals', t);
      const keys = g.flatMap((x) => x.questions.map((q) => q.key));
      assert(new Set(keys).size === keys.length, `duplicate keys in ${t}`);
    }
  });
  _it('validation flags required fields', () => {
    const g = questionGroupsFor('resell').find((x) => x.id === 'direct')!;
    const errs = validateGroup(g, {});
    assert('purchase' in errs, 'purchase should be required');
  });
});

_describe('roadmap', () => {
  for (const s of SAMPLES) {
    _it(`${s.name}: recommendations have positive impacts and an optimised profit`, () => {
      const m = normalizeAnswers(s.type, s.answers, s.offering);
      const p = computePricing(m);
      const r = buildRoadmap(m, p);
      assert(r.recommendations.length >= 3, `only ${r.recommendations.length} recs`);
      for (const rec of r.recommendations) {
        assert(rec.estimatedMonthlyImpact > 0, rec.id);
        assert(rec.assumptions.length > 0, `${rec.id} has no assumptions`);
        assert(!/guarantee|you will make/i.test(rec.why + rec.action), `${rec.id} uses forbidden language`);
      }
      assert(r.recommendations.some((x) => x.priority === 'high'), 'no high priority');
      close(r.optimisedMonthlyProfit, r.current.monthlyProfit + r.sumOfImpacts * 0.85, 0.02);
    });
  }
  _it('iPhone example surfaces supplier and CAC rules', () => {
    const s = SAMPLES[0];
    const m = normalizeAnswers(s.type, s.answers, s.offering);
    const r = buildRoadmap(m, computePricing(m));
    const ids = r.recommendations.map((x) => x.id);
    assert(ids.includes('supplier_cost') && ids.includes('cac'), ids.join(','));
  });
});

if (typeof g.describe !== 'function') {
  console.log(`\n${passes} passed, ${failures} failed`);
  if (failures > 0) (globalThis as any).process?.exit(1);
}
