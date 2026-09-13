# ProfitPath — Requirements Analysis & MVP Architecture

*Version 1.0 — September 2026*

## 1. Requirements review: gaps, conflicts and decisions

The brief is unusually complete. The points below are the places where it is internally inconsistent, silent, or where a naive implementation would produce wrong numbers.

**1.1 The "true cost" in the examples doesn't add up.** The landing-page example lists purchase $850, shipping $45, marketing $35 and other $20 (total $950) but states a true cost of $895. The roadmap example uses $895 as the true cost *and* applies a $35 CAC reduction on top. Decision: true cost is defined precisely as *every* cost attributable to one unit at the expected volume — direct costs + per-unit variable selling costs + allocated overhead + price-dependent fees evaluated at the recommended price. The landing page copy is adjusted so the numbers reconcile ($850 + $45 = $895 direct; marketing and other are shown as additional lines). Nothing on the site will display numbers that don't sum.

**1.2 Price-dependent fees create a circular calculation.** Payment (≈3%), marketplace (5–15%) and commission fees are a percentage of the selling price, so cost depends on price and price depends on cost. Decision: split costs into a *price-independent base* (B) and a *fee fraction* (f). Every price formula then closes analytically: break-even price = B / (1 − f); price for a target margin m = B / (1 − f − m). No iteration, no approximation.

**1.3 Break-even has two meanings; the brief uses both.** "Break-even price" in §9 is the price where profit per unit is zero *after* overhead allocation at the expected volume. "Break-even units" is the volume where contribution covers fixed costs at a given price. Both are shown, labelled distinctly, because they answer different questions ("what's the floor price if I hit my volume?" vs "how many must I sell at this price to stop losing money?").

**1.4 The "recommended price" has no definition.** Without market data (explicitly out of scope for V1), a recommendation must come from a transparent rule. Decision: each business type carries a *target margin band* (reselling 12–20%, importing 18–25%, manufacturing 25–35%, services 30–45%, freelancing 35–50%, handmade 40–55%, food 25–35%, digital 60–75%, SaaS 65–80%). Recommended = price that achieves the band's midpoint; Minimum = the band's floor (never below break-even + 3%); Premium = the band's ceiling. The user's own desired margin, if given, overrides the midpoint. The UI always says *why* ("Reselling businesses typically operate at 12–20% margins; we targeted 16%") so the number is explainable and contestable. This is the single most important assumption in the product and is surfaced as such.

**1.5 "Unit" must be defined per business type.** For services the unit is a booking/project; for freelancing an hour or a project; for food a portion/order; for SaaS a subscriber-month; for digital products a sale. The questionnaire names the unit in every question ("cost per *booking*") and the results reuse the word.

**1.6 SaaS and churn.** Churn is requested as an input but the brief gives no formula. Decision for V1: acquisition cost is amortised over expected customer lifetime — CAC per subscriber-month = CAC × monthly churn. LTV = price × gross margin / churn is displayed as an informational metric. Cohort modelling is deferred.

**1.7 Roadmap impacts are not additive.** The example simply sums +$900 +$450 +$600 +$1,500. Cutting CAC and raising price interact. Decision: show each item's standalone impact, sum them for the "optimised" headline, and apply a visible 15% interaction discount with the label "estimates are independent; combined effect is typically lower". Conservative by design (§20).

**1.8 Price-increase impact needs an elasticity assumption.** "Test $1,149" implies volume stays constant — optimistic. Decision: the engine assumes a 5% price increase loses 8% of volume (configurable constant, displayed as an assumption) and only recommends the test when the net effect is positive.

**1.9 Currency and FX.** Cost in USD, selling in OMR. V1 asks for a single analysis currency and a user-entered conversion rate if the source currency differs (no live FX — that would be unverified external data). Stored as `currency` + `fxRateNote`.

**1.10 Firebase + Angular cost.** Firestore reads on every dashboard load are cheap but not free. Decision: the analysis is computed client-side and stored as one document per business (inputs + cached result); no server round-trip is needed for calculation. This keeps V1 hosting near zero.

**1.11 Not in V1 (confirmed with product owner, Sept 2026):** authentication and persistence (interfaces defined, local-storage adapter only), LLM-written explanations (interface defined, rule engine generates copy), market data, resource finder, PDF export, billing.

**1.12 Legal.** All output pages carry a persistent "Estimates based on your inputs — not financial advice or a guarantee" notice, and the recommendation copy is generated from templates that only use the permitted hedged vocabulary.

## 2. MVP architecture

```
┌─────────────────────────── Angular 18 (standalone) ───────────────────────────┐
│  pages/            landing · analyze (questionnaire) · results · roadmap       │
│  features/         questionnaire · pricing · simulator · roadmap · dashboard  │
│  core/engine/      ← framework-free TypeScript, zero Angular imports          │
│     normalize.ts   QuestionnaireAnswers  → CostModel                          │
│     pricing.ts     CostModel + Goals     → PricingResult (pure)               │
│     roadmap.ts     CostModel + Pricing   → ProfitRoadmap (pure rules)         │
│     detect.ts      free text             → BusinessType + confidence          │
│     questions/     one registry file per business type                        │
│  core/data/        AnalysisRepository (interface) · LocalStorageRepo · (Firestore later) │
│  core/ai/          ExplanationProvider (interface) · TemplateProvider · (Claude later)  │
└────────────────────────────────────────────────────────────────────────────────┘
            Hosting: Firebase Hosting (static)   Later: Auth · Firestore · Functions
```

Principles: the engine folder has no Angular dependency and is compiled and unit-tested with plain `tsc`/node; the UI only renders engine output. Adding a business type = adding one question-registry file and one target-margin entry; nothing else changes.

## 3. User flow

1. **Landing** → "Calculate My Price" → `/analyze`.
2. **Step 1 — What are you selling?** Free text. Detector proposes a type with confidence; the user confirms or picks from a grid (9 types). Always asks "why": *we tailor the next questions to your business.*
3. **Step 2 — Context.** Business-model sub-question where relevant (resell / import / manufacture), sales channel(s), country + currency.
4. **Steps 3–N — Costs.** One group per screen (Direct costs · Selling costs · Monthly fixed costs), 2–5 inputs each, each with helper text and a sensible default shown as a placeholder, never silently used. Progress "Step 4 of 7".
5. **Step N+1 — Goals.** Expected monthly units, target monthly profit, optional desired margin.
6. **Results** (`/results`): hero price · five metric tiles · three scenario cards · break-even · target-profit panel · cost-breakdown bar · "Why this price?" explainer.
7. **What-if** (tab on results): sliders for price, main cost driver, units, CAC, fixed costs; every metric updates live; "reset" and "compare with original".
8. **Profit Roadmap** (`/roadmap`): current situation → prioritised cards grouped by category → optimised estimate → assumptions list. Each card can be ticked "done" (roadmap progress).
9. **Dashboard** (`/dashboard`, after persistence lands): list of saved businesses with the four headline numbers.

## 4. Data models

```ts
type BusinessType = 'resell' | 'import' | 'manufacture' | 'service' | 'freelance'
                  | 'handmade' | 'food' | 'digital' | 'saas';

interface BusinessAnalysis {
  id: string; userId?: string; name: string; businessType: BusinessType;
  offering: string; country: string; currency: string; channels: string[];
  answers: Record<string, number | string | string[]>;   // raw questionnaire
  createdAt: string; updatedAt: string;
  cached?: { pricing: PricingResult; roadmap: ProfitRoadmap };
}

interface CostModel {                 // normalised, per unit, analysis currency
  unitLabel: string;                  // "unit" | "booking" | "order" | "subscriber-month"
  direct: { purchase; materials; labor; shipping; customs; packaging; other };
  variable: { marketingPerUnit; otherPerUnit; paymentFeePct; platformFeePct; commissionPct; returnsPct; wastagePct };
  fixedMonthly: { rent; software; salaries; storage; equipment; insurance; other };
  goals: { expectedUnits; targetMonthlyProfit; desiredMarginPct? };
  meta: { businessType; currency; churnPct?; cacPerCustomer? };
}

interface PricingResult {
  unitDirectCost; unitVariableCost; allocatedOverhead; feeFraction;
  baseCostPerUnit;              // B  (price-independent)
  breakEvenPrice; variableBreakEvenPrice;
  trueCostPerUnit;              // B + fees at recommended price
  scenarios: { minimum: Scenario; recommended: Scenario; premium: Scenario };
  recommended: Scenario;        // alias
  breakEvenUnits;               // at recommended price
  target: { requiredProfitPerUnit; requiredPrice; requiredMarginPct; requiredUnitsAtRecommended; achievable: boolean; gap };
  marginBand: { low; mid; high; rationale: string };
  costBreakdown: Array<{ key; label; amount; share }>;
}

interface Scenario { label; price; profitPerUnit; marginPct; monthlyRevenue; monthlyProfit; status: 'low'|'recommended'|'premium'|'loss' }

interface Recommendation {
  id; category: 'reduce_costs'|'increase_revenue'|'reduce_cac'|'increase_value';
  title; why; action; estimatedMonthlyImpact; difficulty: 'easy'|'medium'|'hard';
  priority: 'high'|'medium'|'low'; assumptions: string[]; done?: boolean;
}
interface ProfitRoadmap { current: Snapshot; recommendations: Recommendation[]; optimisedMonthlyProfit; interactionDiscountPct; disclaimer }
```

## 5. Calculation formulas (deterministic)

Let `U` = expected monthly units, `F` = total fixed monthly cost, `f` = payment% + platform% + commission% + returns% (as fractions of price), `D` = sum of direct per-unit costs, `V` = per-unit variable amounts not tied to price (marketing per unit, other, wastage applied to materials), `O = F / U` (allocated overhead).

| Quantity | Formula |
|---|---|
| Base cost per unit `B` | `D + V + O` |
| Break-even price | `B / (1 − f)` |
| Variable break-even price | `(D + V) / (1 − f)` |
| Profit per unit at price p | `p·(1 − f) − D − V − O` |
| Contribution per unit at p | `p·(1 − f) − D − V` |
| Margin at p | `profit(p) / p` |
| Price for target margin m | `B / (1 − f − m)` |
| Monthly revenue | `p · U` |
| Monthly profit | `contribution(p) · U − F` (identical to `profit(p)·U`) |
| Break-even units at p | `F / contribution(p)` |
| Required profit per unit for target T | `T / U` |
| Required price for T | `(D + V + O + T/U) / (1 − f)` |
| Required units for T at price p | `(T + F) / contribution(p)` |
| True cost per unit | `B + p_rec · f` |
| SaaS amortised CAC per subscriber-month | `CAC · churn` |

Rounding: prices are charm-rounded (…9 / …99 / …,099 depending on magnitude) *after* computation; all metrics are recomputed from the rounded price so displayed numbers always reconcile.

## 6. Dynamic questionnaire architecture

A `QuestionRegistry` maps each business type to an ordered list of `QuestionGroup`s. Each `Question` has `key`, `label`, `help` ("why we ask"), `type` (`number` | `percent` | `select` | `multiselect` | `text` | `hours`), `unitLabel`, optional `showIf(answers)`, and `mapTo` — the `CostModel` path it feeds. The flow component is generic: it renders whatever group is next and never knows about business types. Shared groups (context, goals) are composed into every type; type-specific groups sit between them. The detector (`detect.ts`) uses weighted keyword lists per type, returns the top type and a confidence score, and the UI always lets the user override.

## 7. Recommendation (roadmap) architecture

`roadmap.ts` is a list of `Rule` objects: `{ id, category, applies(ctx), impact(ctx), copy(ctx) }`. Each rule reads the `CostModel` and `PricingResult`, decides if it's relevant (share thresholds), computes a monthly impact with a conservative stated assumption, and produces templated text with the actual numbers. Priority = impact ÷ difficulty weight, then bucketed relative to current profit. Top 6–8 rules are returned. An `ExplanationProvider` interface sits in front of this: V1's `TemplateExplanationProvider` returns the rule copy verbatim; a later `ClaudeExplanationProvider` receives the *already computed* numbers and may only rephrase and elaborate — it never sees a request to calculate anything.

## 8. Page / component structure

```
app/
  app.routes.ts                   '' landing · analyze · results · roadmap · dashboard
  layout/  shell-header, shell-footer, estimate-notice
  pages/   landing-page · analyze-page · results-page · roadmap-page · dashboard-page
  features/questionnaire/  question-step · question-field · type-picker · progress-bar
  features/pricing/        price-hero · metric-tile · scenario-cards · break-even-panel
                           · target-profit-panel · cost-breakdown-bar · why-this-price
  features/simulator/      what-if-panel (sliders + live metrics + delta badges)
  features/roadmap/        roadmap-summary · recommendation-card · category-section
  core/engine/             (framework-free, see §2)   core/state/ analysis.store.ts (signals)
  core/data/               analysis.repository.ts · local-storage.repository.ts
```

## 9. API / backend structure

V1 has no custom API: the app is static, calculation is client-side, and storage is a repository interface with a local-storage implementation. When Firebase is enabled: `users/{uid}` and `users/{uid}/analyses/{id}` (one document per `BusinessAnalysis`, results cached inside), security rules scoped to `request.auth.uid`. A single callable Cloud Function `explainRoadmap(analysisId)` is the only planned server code, added when the Claude explanation layer is approved.

## 10. Development phases

| Phase | Scope | Status |
|---|---|---|
| 0 | This document, engine formulas, question registries | done |
| 1 | Angular project, design system, landing page | this session |
| 2 | Questionnaire flow + detection | this session |
| 3 | Pricing engine + results page + scenarios + break-even + target | this session |
| 4 | What-if simulator | this session |
| 5 | Rule-based Profit Roadmap | this session |
| 6 | Firebase Auth + Firestore repository + dashboard | next |
| 7 | PDF export, duplicate/compare, share | next |
| 8 | Claude explanation layer behind the provider interface | later |
| 9 | Market research layer (verified sources only) | later |
