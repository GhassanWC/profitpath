import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CostModel, applyWhatIf, computePricing, evaluatePrice, unitEconomics } from '../../core/engine';
import { TemplateExplanationProvider } from '../../core/ai/explanation-provider';
import { AnalysisStore } from '../../core/state/analysis.store';
import { CostBreakdownComponent } from '../../shared/cost-breakdown.component';
import { MetricTileComponent } from '../../shared/metric-tile.component';
import { MoneyPipe, PctPipe, SignedPipe } from '../../shared/pipes';
import { ScenarioCardComponent } from '../../shared/scenario-card.component';

type Tab = 'overview' | 'whatif' | 'target';

@Component({
  selector: 'pp-results',
  standalone: true,
  imports: [RouterLink, MoneyPipe, PctPipe, SignedPipe, MetricTileComponent, ScenarioCardComponent, CostBreakdownComponent],
  template: `
    @if (store.pricing(); as p) {
      <div class="pp-container py-5 pp-fade">
        <!-- Hero -->
        <div class="row g-4 align-items-stretch">
          <div class="col-lg-5">
            <div class="pp-card pp-card-hero h-100 d-flex flex-column justify-content-between">
              <div>
                <div class="pp-eyebrow">Your recommended price · {{ store.offering() }}</div>
                <div class="pp-kpi pp-kpi-xl my-2">{{ p.recommended.price | money: p.currency : 0 }}</div>
                <div class="pp-muted">per {{ p.unitLabel }} · {{ p.marginBand.mid | pct: 0 }} target margin</div>
              </div>
              <div class="mt-4 d-flex flex-wrap gap-2">
                <a routerLink="/roadmap" class="btn btn-pp-ghost" style="background: #fff; color: var(--pp-primary); border-color: #fff">See my Profit Roadmap →</a>
                <a routerLink="/analyze" class="btn btn-pp-ghost text-white" style="border-color: rgba(255,255,255,0.4)">Edit answers</a>
              </div>
            </div>
          </div>
          <div class="col-lg-7">
            <div class="row g-3 h-100">
              <div class="col-6 col-md-4"><pp-metric-tile label="True cost" [value]="p.trueCostPerUnit | money: p.currency" [sub]="'per ' + p.unitLabel + ' incl. overhead & fees'" /></div>
              <div class="col-6 col-md-4"><pp-metric-tile label="Profit per {{ p.unitLabel }}" [value]="p.recommended.profitPerUnit | money: p.currency" color="var(--pp-primary)" /></div>
              <div class="col-6 col-md-4"><pp-metric-tile label="Profit margin" [value]="p.recommended.marginPct | pct" /></div>
              <div class="col-6 col-md-4"><pp-metric-tile label="Expected monthly sales" [value]="p.expectedUnits + ''" [sub]="p.unitLabel + 's per month'" /></div>
              <div class="col-6 col-md-4"><pp-metric-tile label="Est. monthly revenue" [value]="p.recommended.monthlyRevenue | money: p.currency : 0" /></div>
              <div class="col-6 col-md-4"><pp-metric-tile label="Est. monthly profit" [value]="p.recommended.monthlyProfit | money: p.currency : 0" color="var(--pp-primary)" /></div>
            </div>
          </div>
        </div>

        @for (w of p.warnings; track $index) {
          <div class="pp-warn mt-3">⚠️ {{ w }}</div>
        }

        <!-- Tabs -->
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-5 mb-3">
          <div class="pp-tabs">
            <button [class.active]="tab() === 'overview'" (click)="tab.set('overview')">Pricing</button>
            <button [class.active]="tab() === 'whatif'" (click)="tab.set('whatif')">What if?</button>
            <button [class.active]="tab() === 'target'" (click)="tab.set('target')">Target profit</button>
          </div>
          <span class="pp-notice">Estimates from your inputs · not a guarantee</span>
        </div>

        @switch (tab()) {
          @case ('overview') {
            <div class="pp-fade">
              <h3 class="mb-3">Three ways to price it</h3>
              <div class="row g-3">
                <div class="col-md-4"><pp-scenario-card [scenario]="p.scenarios.minimum" [currency]="p.currency" [unitLabel]="p.unitLabel" /></div>
                <div class="col-md-4"><pp-scenario-card [scenario]="p.scenarios.recommended" [currency]="p.currency" [unitLabel]="p.unitLabel" /></div>
                <div class="col-md-4"><pp-scenario-card [scenario]="p.scenarios.premium" [currency]="p.currency" [unitLabel]="p.unitLabel" /></div>
              </div>

              <div class="row g-4 mt-2">
                <div class="col-lg-7">
                  <div class="pp-card h-100">
                    <h4 class="mb-1">Why {{ p.recommended.price | money: p.currency : 0 }}?</h4>
                    <p class="pp-muted">{{ explanation() }}</p>
                    <div class="pp-eyebrow mt-4 mb-2">Where each {{ p.currency }} of cost goes</div>
                    <pp-cost-breakdown [lines]="p.costBreakdown" [currency]="p.currency" />
                  </div>
                </div>
                <div class="col-lg-5">
                  <div class="pp-card h-100">
                    <h4 class="mb-3">Break-even</h4>
                    <div class="pp-ledger">
                      <span class="pp-muted">Break-even price</span><span class="pp-num fw-semibold">{{ p.breakEvenPrice | money: p.currency }}</span>
                      <span class="pp-muted" style="font-size: 0.85rem; grid-column: 1 / -1">The lowest price that covers every cost — including your share of fixed costs — if you sell {{ p.expectedUnits }} {{ p.unitLabel }}s a month.</span>
                      <span class="pp-muted mt-2">Variable break-even</span><span class="pp-num fw-semibold mt-2">{{ p.variableBreakEvenPrice | money: p.currency }}</span>
                      <span class="pp-muted" style="font-size: 0.85rem; grid-column: 1 / -1">Below this you lose money on every single sale, regardless of volume.</span>
                      <span class="pp-muted mt-2">Monthly fixed costs</span><span class="pp-num fw-semibold mt-2">{{ p.fixedMonthly | money: p.currency : 0 }}</span>
                      <span class="pp-muted">Break-even sales at {{ p.recommended.price | money: p.currency : 0 }}</span>
                      <span class="pp-num fw-semibold">{{ p.recommended.breakEvenUnits ?? '—' }} {{ p.unitLabel }}s / month</span>
                    </div>
                    <div class="pp-ok mt-3" style="font-size: 0.88rem">
                      @if (p.recommended.breakEvenUnits !== null) {
                        Sell {{ p.recommended.breakEvenUnits }} of your expected {{ p.expectedUnits }} {{ p.unitLabel }}s and the rest is profit.
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }

          @case ('whatif') {
            <div class="pp-fade row g-4">
              <div class="col-lg-5">
                <div class="pp-card">
                  <div class="d-flex justify-content-between align-items-center mb-3">
                    <h4 class="mb-0">Experiment</h4>
                    <button class="btn btn-pp-ghost btn-sm" (click)="resetWhatIf()">Reset</button>
                  </div>
                  @for (s of sliders(); track s.key) {
                    <div class="pp-slider mb-3">
                      <label>{{ s.label }} <span>{{ s.money ? (wi()[s.key] | money: p.currency : (s.step < 1 ? 2 : 0)) : wi()[s.key] + (s.unit ? ' ' + s.unit : '') }}</span></label>
                      <input type="range" [min]="s.min" [max]="s.max" [step]="s.step" [value]="wi()[s.key]" (input)="setWi(s.key, $any($event.target).valueAsNumber)" />
                      <small>Original: {{ s.money ? (s.base | money: p.currency : (s.step < 1 ? 2 : 0)) : s.base + (s.unit ? ' ' + s.unit : '') }}</small>
                    </div>
                  }
                </div>
              </div>
              <div class="col-lg-7">
                @if (whatIf(); as w) {
                  <div class="row g-3">
                    <div class="col-6 col-md-4"><pp-metric-tile label="Monthly profit" [value]="w.scenario.monthlyProfit | money: p.currency : 0" [sub]="delta(w.scenario.monthlyProfit, p.recommended.monthlyProfit)" color="var(--pp-primary)" /></div>
                    <div class="col-6 col-md-4"><pp-metric-tile label="Monthly revenue" [value]="w.scenario.monthlyRevenue | money: p.currency : 0" [sub]="delta(w.scenario.monthlyRevenue, p.recommended.monthlyRevenue)" /></div>
                    <div class="col-6 col-md-4"><pp-metric-tile label="Profit / {{ p.unitLabel }}" [value]="w.scenario.profitPerUnit | money: p.currency" [sub]="delta(w.scenario.profitPerUnit, p.recommended.profitPerUnit)" /></div>
                    <div class="col-6 col-md-4"><pp-metric-tile label="Margin" [value]="w.scenario.marginPct | pct" [sub]="deltaPts(w.scenario.marginPct, p.recommended.marginPct)" /></div>
                    <div class="col-6 col-md-4"><pp-metric-tile label="Break-even price" [value]="w.pricing.breakEvenPrice | money: p.currency" [sub]="delta(w.pricing.breakEvenPrice, p.breakEvenPrice, true)" /></div>
                    <div class="col-6 col-md-4"><pp-metric-tile label="Break-even units" [value]="(w.scenario.breakEvenUnits ?? '—') + ''" [sub]="'was ' + (p.recommended.breakEvenUnits ?? '—')" /></div>
                    <div class="col-12"><pp-metric-tile label="Units needed for your target" [value]="(w.pricing.target.requiredUnitsAtRecommended ?? '—') + ' ' + p.unitLabel + 's'" [sub]="'to reach ' + (p.target.targetMonthlyProfit | money: p.currency : 0) + ' at ' + (wi()['price'] | money: p.currency : 0) + ' — was ' + (p.target.requiredUnitsAtRecommended ?? '—')" [small]="true" /></div>
                  </div>
                  <div class="pp-card mt-3" [class.pp-card-soft]="w.scenario.monthlyProfit >= p.recommended.monthlyProfit">
                    <strong>{{ w.scenario.monthlyProfit >= p.recommended.monthlyProfit ? 'This scenario looks stronger.' : 'This scenario looks weaker.' }}</strong>
                    <span class="pp-muted"> Compared with your recommended setup, estimated monthly profit changes by <span class="pp-delta" [class.up]="w.scenario.monthlyProfit >= p.recommended.monthlyProfit" [class.down]="w.scenario.monthlyProfit < p.recommended.monthlyProfit">{{ (w.scenario.monthlyProfit - p.recommended.monthlyProfit) | signed: p.currency }}</span>. Volume assumptions are yours; we don't predict demand.</span>
                  </div>
                }
              </div>
            </div>
          }

          @case ('target') {
            <div class="pp-fade row g-4">
              <div class="col-lg-5">
                <div class="pp-card">
                  <h4 class="mb-1">How much do you want to make per month?</h4>
                  <p class="pp-muted">Change the target and volume to see what they demand from your price.</p>
                  <label class="pp-q-label" for="tgt">Target monthly profit</label>
                  <div class="pp-input-group mb-3">
                    <span class="affix pre">{{ p.currency }}</span>
                    <input id="tgt" type="number" min="0" step="any" [value]="targetInput()" (input)="targetInput.set($any($event.target).valueAsNumber || 0)" />
                  </div>
                  <label class="pp-q-label" for="tu">Expected {{ p.unitLabel }}s per month</label>
                  <div class="pp-input-group">
                    <input id="tu" type="number" min="1" step="1" [value]="targetUnits()" (input)="targetUnits.set($any($event.target).valueAsNumber || 1)" />
                  </div>
                </div>
              </div>
              <div class="col-lg-7">
                @if (targetPricing(); as tp) {
                  <div class="row g-3">
                    <div class="col-6 col-md-4"><pp-metric-tile label="Required profit / {{ p.unitLabel }}" [value]="tp.target.requiredProfitPerUnit | money: p.currency" /></div>
                    <div class="col-6 col-md-4"><pp-metric-tile label="Required price" [value]="tp.target.requiredPrice | money: p.currency" color="var(--pp-primary)" [sub]="'at ' + targetUnits() + ' ' + p.unitLabel + 's'" /></div>
                    <div class="col-6 col-md-4"><pp-metric-tile label="Required margin" [value]="tp.target.requiredMarginPct | pct" /></div>
                    <div class="col-6 col-md-4"><pp-metric-tile label="True cost at that volume" [value]="tp.baseCostPerUnit | money: p.currency" [sub]="'excl. % fees'" /></div>
                    <div class="col-6 col-md-8"><pp-metric-tile label="Or keep {{ p.recommended.price | money: p.currency : 0 }} and sell" [value]="(tp.target.requiredUnitsAtRecommended ?? '—') + ' ' + p.unitLabel + 's / month'" /></div>
                  </div>
                  <div class="mt-3" [class]="tp.target.requiredMarginPct > p.marginBand.high ? 'pp-warn' : 'pp-ok'">
                    At {{ tp.target.requiredPrice | money: p.currency : 0 }}, your estimated margin would be {{ tp.target.requiredMarginPct | pct }}.
                    @if (tp.target.requiredMarginPct > p.marginBand.high) {
                      That is above the typical {{ p.marginBand.low | pct: 0 }}–{{ p.marginBand.high | pct: 0 }} range for this kind of business — the roadmap focuses on reaching the target by lowering costs and raising volume instead.
                    } @else {
                      That sits within the typical {{ p.marginBand.low | pct: 0 }}–{{ p.marginBand.high | pct: 0 }} range for this kind of business.
                    }
                  </div>
                }
              </div>
            </div>
          }
        }
      </div>
    }
  `,
})
export class ResultsComponent {
  readonly store = inject(AnalysisStore);
  private readonly ai = inject(TemplateExplanationProvider);

  readonly tab = signal<Tab>('overview');
  readonly explanation = signal('');

  // --- What-if ---
  readonly wi = signal<Record<string, number>>({});
  readonly sliders = computed(() => {
    const m = this.store.model();
    const p = this.store.pricing();
    if (!m || !p) return [];
    const e = unitEconomics(m);
    const mk = (key: string, label: string, base: number, money: boolean, unit = '') => ({
      key,
      label,
      base,
      money,
      unit,
      min: 0,
      max: Math.max(10, Math.ceil(base * 2.5)),
      step: base < 20 ? 0.1 : base < 200 ? 1 : base < 2000 ? 5 : 50,
    });
    const list = [mk('price', 'Selling price', p.recommended.price, true), mk('units', `${m.meta.unitLabelPlural} per month`, e.U, false)];
    if (m.direct.purchase > 0) list.push(mk('purchase', 'Purchase cost', m.direct.purchase, true));
    if (m.direct.materials > 0) list.push(mk('materials', 'Materials', m.direct.materials, true));
    if (m.direct.labor > 0) list.push(mk('labor', 'Labour cost', m.direct.labor, true));
    if (m.direct.shipping > 0) list.push(mk('shipping', 'Shipping', m.direct.shipping, true));
    list.push(mk('marketingPerUnit', 'Marketing per ' + m.meta.unitLabel, m.variable.marketingPerUnit, true));
    list.push(mk('fixedMonthlyTotal', 'Monthly fixed costs', e.F, true));
    list[1].min = 1;
    return list;
  });

  readonly whatIf = computed(() => {
    const m = this.store.model();
    const p = this.store.pricing();
    if (!m || !p) return null;
    const v = this.wi();
    const model: CostModel = applyWhatIf(m, {
      units: v['units'],
      purchase: v['purchase'],
      materials: v['materials'],
      labor: v['labor'],
      shipping: v['shipping'],
      marketingPerUnit: v['marketingPerUnit'],
      fixedMonthlyTotal: v['fixedMonthlyTotal'],
    });
    const price = v['price'] ?? p.recommended.price;
    const pricing = computePricing(model);
    // Units needed for the target at the *chosen* price
    const e = unitEconomics(model);
    const contrib = price * (1 - e.f) - e.D - e.V;
    const requiredUnits = contrib > 0 ? Math.ceil((model.goals.targetMonthlyProfit + e.F) / contrib) : null;
    pricing.target = { ...pricing.target, requiredUnitsAtRecommended: requiredUnits };
    return { scenario: evaluatePrice(model, price, 'custom', 'What if'), pricing };
  });

  // --- Target ---
  readonly targetInput = signal(0);
  readonly targetUnits = signal(1);
  readonly targetPricing = computed(() => {
    const m = this.store.model();
    if (!m) return null;
    const model = applyWhatIf(m, { units: this.targetUnits() });
    model.goals.targetMonthlyProfit = this.targetInput();
    return computePricing(model);
  });

  constructor() {
    this.resetWhatIf();
    const m = this.store.model();
    const p = this.store.pricing();
    if (m && p) {
      this.targetInput.set(m.goals.targetMonthlyProfit);
      this.targetUnits.set(m.goals.expectedUnits);
      this.ai.explainPrice(m, p).then((t) => this.explanation.set(t));
    }
  }

  resetWhatIf() {
    const base: Record<string, number> = {};
    for (const s of this.sliders()) base[s.key] = s.base;
    this.wi.set(base);
  }

  setWi(key: string, value: number) {
    if (!isFinite(value)) return;
    this.wi.update((v) => ({ ...v, [key]: value }));
  }

  delta(now: number, was: number, lowerIsBetter = false): string {
    const d = now - was;
    if (Math.abs(d) < 0.005) return 'unchanged';
    const cur = this.store.pricing()?.currency ?? 'USD';
    let s: string;
    try {
      s = new Intl.NumberFormat('en', { style: 'currency', currency: cur, maximumFractionDigits: Math.abs(d) < 100 ? 2 : 0 }).format(Math.abs(d));
    } catch {
      s = `${cur} ${Math.abs(d).toFixed(Math.abs(d) < 100 ? 2 : 0)}`;
    }
    const good = lowerIsBetter ? d < 0 : d > 0;
    return `${d > 0 ? '+' : '−'}${s} ${good ? '▲' : '▼'}`;
  }

  deltaPts(now: number, was: number): string {
    const d = (now - was) * 100;
    if (Math.abs(d) < 0.05) return 'unchanged';
    return `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1)} pts`;
  }
}
