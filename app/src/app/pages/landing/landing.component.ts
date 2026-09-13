import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BUSINESS_TYPE_LIST, SAMPLES, buildRoadmap, computePricing, normalizeAnswers } from '../../core/engine';
import { AnalysisStore } from '../../core/state/analysis.store';
import { MoneyPipe, PctPipe } from '../../shared/pipes';

@Component({
  selector: 'pp-landing',
  standalone: true,
  imports: [RouterLink, MoneyPipe, PctPipe],
  template: `
    <section class="pp-hero pp-container pp-fade">
      <span class="pp-chip mb-4">✨ Pricing intelligence + profit roadmap</span>
      <h1>How much should <span class="pp-gradient-text">you charge?</span></h1>
      <p class="lead">Tell us what you're selling, what it costs you, and what you want to earn. We'll calculate your ideal price and show you how to improve your profit.</p>
      <div class="d-flex flex-wrap justify-content-center gap-2">
        <a routerLink="/analyze" class="btn btn-pp btn-pp-lg">Calculate My Price</a>
        <button type="button" class="btn btn-pp-ghost btn-pp-lg" (click)="seeExample()">See an Example</button>
      </div>
      <div class="d-flex flex-wrap justify-content-center gap-2 mt-4">
        @for (t of types; track t.type) {
          <span class="pp-chip">{{ t.icon }} {{ t.shortLabel }}</span>
        }
      </div>
    </section>

    <section class="pp-section pp-container">
      <div class="row g-4 align-items-stretch">
        <div class="col-lg-5">
          <div class="pp-card h-100">
            <div class="pp-eyebrow mb-2">Example</div>
            <h3 class="mb-3">"I'm selling iPhones."</h3>
            <div class="pp-ledger">
              <span class="pp-muted">Purchase</span><span class="pp-num">{{ 850 | money: 'USD' : 0 }}</span>
              <span class="pp-muted">Shipping</span><span class="pp-num">{{ 45 | money: 'USD' : 0 }}</span>
              <span class="pp-muted">Marketing per unit</span><span class="pp-num">{{ 35 | money: 'USD' : 0 }}</span>
              <span class="pp-muted">Overhead per unit</span><span class="pp-num">{{ ex().allocatedOverhead | money: 'USD' : 0 }}</span>
              <span class="total">True cost</span><span class="total pp-num">{{ ex().trueCostPerUnit | money: 'USD' : 0 }}</span>
            </div>
            <p class="pp-muted mt-3 mb-0" style="font-size: 0.86rem">30 units a month · target profit $5,000</p>
          </div>
        </div>
        <div class="col-lg-7">
          <div class="pp-card pp-card-hero h-100">
            <div class="pp-eyebrow mb-2">ProfitPath calculates</div>
            <div class="row g-3">
              <div class="col-6 col-md-4">
                <div class="pp-eyebrow">Recommended price</div>
                <div class="pp-kpi">{{ ex().recommended.price | money: 'USD' : 0 }}</div>
              </div>
              <div class="col-6 col-md-4">
                <div class="pp-eyebrow">Profit / unit</div>
                <div class="pp-kpi">{{ ex().recommended.profitPerUnit | money: 'USD' : 0 }}</div>
              </div>
              <div class="col-6 col-md-4">
                <div class="pp-eyebrow">Margin</div>
                <div class="pp-kpi">{{ ex().recommended.marginPct | pct }}</div>
              </div>
            </div>
            <hr style="border-color: rgba(255,255,255,0.25)" />
            <div class="pp-eyebrow mb-2">Here's how you could make even more</div>
            @for (r of exRoadmap().recommendations.slice(0, 3); track r.id) {
              <div class="d-flex justify-content-between gap-3 py-1">
                <span>{{ r.title }}</span>
                <span class="pp-num fw-bold" style="color: #a7f3d0; white-space: nowrap">+{{ r.estimatedMonthlyImpact | money: 'USD' : 0 }}/mo</span>
              </div>
            }
            <div class="d-flex justify-content-between gap-3 pt-2 mt-2" style="border-top: 1px solid rgba(255,255,255,0.25)">
              <span class="fw-semibold">Estimated monthly profit → optimised</span>
              <span class="pp-num fw-bold">{{ ex().recommended.monthlyProfit | money: 'USD' : 0 }} → {{ exRoadmap().optimisedMonthlyProfit | money: 'USD' : 0 }}</span>
            </div>
            <p class="pp-muted mt-3 mb-0" style="font-size: 0.8rem">Estimates, not guarantees. Every number above is computed from the inputs on the left.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="pp-section pp-container" id="how">
      <div class="text-center mb-4">
        <h2>How it works</h2>
        <p class="pp-muted">A conversation, not a spreadsheet. Five minutes from idea to price.</p>
      </div>
      <div class="pp-flow">
        <div class="pp-card"><div class="pp-step-num">1</div><h5>Tell us what you sell</h5><p class="pp-muted mb-0">Type it in plain words. We detect whether it's a product, service, food, digital or SaaS business and ask only the questions that matter for it.</p></div>
        <div class="pp-card"><div class="pp-step-num">2</div><h5>Answer a few questions</h5><p class="pp-muted mb-0">Costs, fees, fixed expenses and your goals — a few at a time, each with a plain explanation of why we ask.</p></div>
        <div class="pp-card"><div class="pp-step-num">3</div><h5>Get your price</h5><p class="pp-muted mb-0">True cost, break-even, three pricing scenarios and the price you need to hit your target profit — with the reasoning behind each number.</p></div>
        <div class="pp-card"><div class="pp-step-num">4</div><h5>Follow your roadmap</h5><p class="pp-muted mb-0">Prioritised, quantified ways to make more profit at that price: cheaper sourcing, lower acquisition cost, upsells, better channels.</p></div>
      </div>
    </section>

    <section class="pp-section pp-container">
      <div class="text-center mb-4">
        <h2>Simple pricing</h2>
        <p class="pp-muted">Start free. Upgrade when the roadmap pays for itself.</p>
      </div>
      <div class="row g-3 justify-content-center">
        <div class="col-md-4"><div class="pp-card h-100"><div class="pp-eyebrow">Free</div><div class="pp-kpi my-2">$0</div><ul class="pp-muted ps-3 mb-0"><li>Pricing calculator</li><li>Recommended price & three scenarios</li><li>Break-even analysis</li><li>One saved business</li></ul></div></div>
        <div class="col-md-4"><div class="pp-card h-100" style="border-color: var(--pp-primary)"><div class="pp-eyebrow" style="color: var(--pp-primary)">Pro</div><div class="pp-kpi my-2">$9<span class="pp-muted" style="font-size: 1rem; font-weight: 500">/month</span></div><ul class="pp-muted ps-3 mb-0"><li>Everything in Free</li><li>Full Profit Roadmap</li><li>What-if simulator</li><li>Unlimited saved businesses</li><li>PDF reports</li></ul></div></div>
        <div class="col-md-4"><div class="pp-card h-100"><div class="pp-eyebrow">Business</div><div class="pp-kpi my-2">$19<span class="pp-muted" style="font-size: 1rem; font-weight: 500">/month</span></div><ul class="pp-muted ps-3 mb-0"><li>Everything in Pro</li><li>Team members</li><li>Scenario comparison</li><li>Market research (coming)</li></ul></div></div>
      </div>
    </section>

    <section class="pp-section pp-container text-center">
      <div class="pp-card pp-card-hero py-5">
        <h2 class="text-white">Ready to find out what to charge?</h2>
        <p class="pp-muted mb-4">No sign-up needed for your first analysis.</p>
        <a routerLink="/analyze" class="btn btn-pp-ghost btn-pp-lg" style="background: #fff; color: var(--pp-primary); border-color: #fff">Calculate My Price</a>
      </div>
    </section>
  `,
})
export class LandingComponent {
  private readonly store = inject(AnalysisStore);
  private readonly router = inject(Router);
  readonly types = BUSINESS_TYPE_LIST;

  private readonly sample = SAMPLES[0];
  private readonly exModel = normalizeAnswers(this.sample.type, this.sample.answers, this.sample.offering);
  readonly ex = computed(() => computePricing(this.exModel));
  readonly exRoadmap = computed(() => buildRoadmap(this.exModel, this.ex()));

  seeExample() {
    this.store.loadSample(this.sample.offering, this.sample.type, this.sample.answers);
    this.router.navigate(['/results']);
  }
}
