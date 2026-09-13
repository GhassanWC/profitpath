/**
 * ProfitPath engine types.
 * This folder is framework-free: no Angular imports, no DOM access.
 * Everything here is compiled and unit-tested with plain tsc + node.
 */

export type BusinessType =
  | 'resell'
  | 'import'
  | 'manufacture'
  | 'service'
  | 'freelance'
  | 'handmade'
  | 'food'
  | 'digital'
  | 'saas';

export type AnswerValue = number | string | string[] | null | undefined;
export type Answers = Record<string, AnswerValue>;

/** Normalised cost model. All money values are per unit in the analysis currency unless stated. */
export interface CostModel {
  meta: {
    businessType: BusinessType;
    offering: string;
    currency: string;
    country: string;
    channels: string[];
    /** Singular noun used in UI copy: "unit", "booking", "order", "subscriber-month" */
    unitLabel: string;
    unitLabelPlural: string;
    churnPct?: number; // SaaS only, monthly churn as percent
    cacPerCustomer?: number; // SaaS only, raw CAC per new customer
  };
  direct: {
    purchase: number;
    materials: number;
    labor: number;
    shipping: number;
    customs: number;
    packaging: number;
    other: number;
  };
  variable: {
    /** Advertising / acquisition cost attributable to one unit */
    marketingPerUnit: number;
    otherPerUnit: number;
    paymentFeePct: number;
    platformFeePct: number;
    commissionPct: number;
    returnsPct: number;
    /** Applied to materials + purchase (spoilage, defects) */
    wastagePct: number;
  };
  fixedMonthly: {
    rent: number;
    software: number;
    salaries: number;
    storage: number;
    equipment: number;
    insurance: number;
    other: number;
  };
  goals: {
    expectedUnits: number;
    targetMonthlyProfit: number;
    desiredMarginPct?: number;
  };
}

export type ScenarioStatus = 'loss' | 'low' | 'recommended' | 'premium';

export interface Scenario {
  key: 'minimum' | 'recommended' | 'premium' | 'custom';
  label: string;
  price: number;
  profitPerUnit: number;
  marginPct: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  breakEvenUnits: number | null;
  status: ScenarioStatus;
  note: string;
}

export interface CostLine {
  key: string;
  label: string;
  amount: number;
  share: number; // fraction of true cost
  group: 'direct' | 'variable' | 'overhead' | 'fees';
}

export interface TargetAnalysis {
  targetMonthlyProfit: number;
  requiredProfitPerUnit: number;
  requiredPrice: number;
  requiredMarginPct: number;
  /** Units needed at the recommended price to hit the target */
  requiredUnitsAtRecommended: number | null;
  /** Monthly profit gap at recommended price and expected units (negative = shortfall) */
  gapAtRecommended: number;
  achievableAtRecommended: boolean;
}

export interface MarginBand {
  low: number;
  mid: number;
  high: number;
  rationale: string;
}

export interface PricingResult {
  currency: string;
  unitLabel: string;
  expectedUnits: number;
  /** D: direct per-unit cost */
  unitDirectCost: number;
  /** V: per-unit variable cost not tied to price */
  unitVariableCost: number;
  /** O: fixed monthly / expected units */
  allocatedOverhead: number;
  fixedMonthly: number;
  /** f: fraction of price consumed by percentage fees */
  feeFraction: number;
  /** B = D + V + O */
  baseCostPerUnit: number;
  /** B / (1-f): price where profit per unit is zero at expected volume */
  breakEvenPrice: number;
  /** (D+V)/(1-f): price where contribution is zero */
  variableBreakEvenPrice: number;
  /** B + fees at recommended price */
  trueCostPerUnit: number;
  marginBand: MarginBand;
  scenarios: { minimum: Scenario; recommended: Scenario; premium: Scenario };
  recommended: Scenario;
  target: TargetAnalysis;
  costBreakdown: CostLine[];
  warnings: string[];
}

export type RecCategory = 'reduce_costs' | 'increase_revenue' | 'reduce_cac' | 'increase_value';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Priority = 'high' | 'medium' | 'low';

export interface Recommendation {
  id: string;
  category: RecCategory;
  title: string;
  why: string;
  action: string;
  estimatedMonthlyImpact: number;
  difficulty: Difficulty;
  priority: Priority;
  assumptions: string[];
  done?: boolean;
}

export interface ProfitRoadmap {
  current: {
    price: number;
    trueCostPerUnit: number;
    profitPerUnit: number;
    units: number;
    monthlyProfit: number;
    marginPct: number;
  };
  recommendations: Recommendation[];
  sumOfImpacts: number;
  interactionDiscountPct: number;
  optimisedMonthlyProfit: number;
  targetReached: boolean;
  disclaimer: string;
}

export interface BusinessAnalysis {
  id: string;
  userId?: string;
  name: string;
  businessType: BusinessType;
  answers: Answers;
  createdAt: string;
  updatedAt: string;
  completedIds?: string[];
}
