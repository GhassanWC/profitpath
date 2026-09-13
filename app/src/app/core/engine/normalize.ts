/** Turns raw questionnaire answers into a CostModel. One place for every unit conversion. */
import { Answers, BusinessType, CostModel } from './types';
import { businessTypeDef } from './business-types';

function num(a: Answers, key: string, fallback = 0): number {
  const v = a[key];
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  return isFinite(n) ? n : fallback;
}
function str(a: Answers, key: string, fallback = ''): string {
  const v = a[key];
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}
function arr(a: Answers, key: string): string[] {
  const v = a[key];
  return Array.isArray(v) ? v : [];
}

export function emptyModel(type: BusinessType, offering = ''): CostModel {
  const def = businessTypeDef(type);
  return {
    meta: { businessType: type, offering, currency: 'USD', country: '', channels: [], unitLabel: def.unitLabel, unitLabelPlural: def.unitLabelPlural },
    direct: { purchase: 0, materials: 0, labor: 0, shipping: 0, customs: 0, packaging: 0, other: 0 },
    variable: { marketingPerUnit: 0, otherPerUnit: 0, paymentFeePct: 0, platformFeePct: 0, commissionPct: 0, returnsPct: 0, wastagePct: 0 },
    fixedMonthly: { rent: 0, software: 0, salaries: 0, storage: 0, equipment: 0, insurance: 0, other: 0 },
    goals: { expectedUnits: 1, targetMonthlyProfit: 0 },
  };
}

export function normalizeAnswers(type: BusinessType, answers: Answers, offering = ''): CostModel {
  const m = emptyModel(type, offering);
  m.meta.currency = str(answers, 'currency', 'USD');
  m.meta.country = str(answers, 'country');
  m.meta.channels = arr(answers, 'channels');

  const hourly = num(answers, 'hourlyValue');

  switch (type) {
    case 'resell':
    case 'import':
    case 'manufacture': {
      m.direct.purchase = num(answers, 'purchase');
      m.direct.materials = num(answers, 'materials');
      m.direct.labor = num(answers, 'labor');
      m.direct.shipping = num(answers, 'shipping');
      const base = m.direct.purchase + m.direct.materials;
      m.direct.customs = (num(answers, 'customsPct') / 100) * base;
      m.direct.packaging = num(answers, 'packaging');
      m.variable.returnsPct = num(answers, 'returnsPct');
      m.fixedMonthly.storage = num(answers, 'storage');
      break;
    }
    case 'service':
    case 'freelance': {
      const h = num(answers, 'deliveryHours') + num(answers, 'prepHours');
      m.direct.labor = h * hourly;
      m.direct.materials = num(answers, 'materials');
      m.direct.other = num(answers, 'travel') + num(answers, 'assistant');
      m.fixedMonthly.equipment = num(answers, 'equipment');
      m.fixedMonthly.insurance = num(answers, 'insurance');
      break;
    }
    case 'handmade': {
      m.direct.materials = num(answers, 'materials');
      m.direct.labor = num(answers, 'laborHours') * hourly;
      m.direct.packaging = num(answers, 'packaging');
      m.direct.shipping = num(answers, 'shipping');
      m.variable.wastagePct = num(answers, 'wastagePct', 5);
      m.fixedMonthly.equipment = num(answers, 'equipment');
      break;
    }
    case 'food': {
      m.direct.materials = num(answers, 'materials');
      m.direct.packaging = num(answers, 'packaging');
      m.direct.labor = num(answers, 'laborHours') * hourly;
      m.direct.shipping = num(answers, 'shipping');
      m.variable.wastagePct = num(answers, 'wastagePct', 10);
      m.fixedMonthly.equipment = num(answers, 'equipment');
      m.fixedMonthly.insurance = num(answers, 'insurance');
      break;
    }
    case 'digital': {
      m.direct.other = num(answers, 'otherDirect');
      m.variable.returnsPct = num(answers, 'returnsPct');
      m.fixedMonthly.other += num(answers, 'devAmortised');
      break;
    }
    case 'saas': {
      m.direct.other = num(answers, 'hostingPerUser') + num(answers, 'apiPerUser') + num(answers, 'supportPerUser');
      const churn = num(answers, 'churnPct', 5);
      const cac = num(answers, 'cacPerCustomer');
      m.meta.churnPct = churn;
      m.meta.cacPerCustomer = cac;
      // Acquisition cost amortised over expected lifetime (1/churn months)
      m.variable.marketingPerUnit = cac * (churn / 100);
      m.fixedMonthly.other += num(answers, 'devAmortised');
      break;
    }
  }

  if (type !== 'saas') m.variable.marketingPerUnit = num(answers, 'marketingPerUnit');
  m.variable.paymentFeePct = num(answers, 'paymentFeePct', 2.9);
  m.variable.platformFeePct = num(answers, 'platformFeePct');
  m.fixedMonthly.rent = num(answers, 'rent');
  m.fixedMonthly.software = num(answers, 'software');
  m.fixedMonthly.salaries = num(answers, 'salaries');
  m.fixedMonthly.other += num(answers, 'otherFixed');

  let units = num(answers, 'expectedUnits', 1);
  if (type === 'food') units = units * num(answers, 'daysPerMonth', 24);
  m.goals.expectedUnits = Math.max(1, Math.round(units));
  m.goals.targetMonthlyProfit = num(answers, 'targetMonthlyProfit');
  const dm = num(answers, 'desiredMarginPct');
  if (dm > 0) m.goals.desiredMarginPct = dm;
  return m;
}
