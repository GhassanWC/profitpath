import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BUSINESS_TYPE_LIST, SAMPLES, buildRoadmap, computePricing, normalizeAnswers } from '../../core/engine';
import { AnalysisStore } from '../../core/state/analysis.store';
import { splitMoney } from '../../shared/format';
import { IconComponent } from '../../shared/icon.component';
import { BUSINESS_TYPE_ICONS } from '../../shared/icons';
import { MoneyPipe, PctPipe } from '../../shared/pipes';
import { ProfitCompareComponent } from '../../shared/profit-compare.component';

const HOW_IT_WORKS = [
  { icon: 'square-pen', title: 'Tell us what you sell', body: "Type it in plain words. We detect whether it's a product, service, food, digital or SaaS business and ask only the questions that matter for it." },
  { icon: 'list-checks', title: 'Answer a few questions', body: 'Costs, fees, fixed expenses and your goals — a few at a time, each with a plain explanation of why we ask.' },
  { icon: 'calculator', title: 'Get your price', body: 'True cost, break-even, three pricing scenarios and the price you need to hit your target profit — with the reasoning behind each number.' },
  { icon: 'map', title: 'Follow your roadmap', body: 'Prioritised, quantified ways to make more profit at that price: cheaper sourcing, lower acquisition cost, upsells, better channels.' },
];

const PLANS = [
  { name: 'Free', price: '$0', per: '', hot: false, items: ['Pricing calculator', 'Recommended price & three scenarios', 'Break-even analysis', 'One saved business'] },
  { name: 'Pro', price: '$9', per: '/month', hot: true, items: ['Everything in Free', 'Full Profit Roadmap', 'What-if simulator', 'Unlimited saved businesses', 'PDF reports'] },
  { name: 'Business', price: '$19', per: '/month', hot: false, items: ['Everything in Pro', 'Team members', 'Scenario comparison', 'Market research (coming)'] },
];

@Component({
  selector: 'pp-landing',
  standalone: true,
  imports: [RouterLink, MoneyPipe, PctPipe, IconComponent, ProfitCompareComponent],
  template: `
    <section class="pp-hero pp-container pp-fade">
      <span class="pp-chip mb-4"><pp-icon name="sparkles" [size]="13" /> Pricing intelligence + profit roadmap</span>
      <h1>How much should <span class="pp-gradient-text">you charge?</span></h1>
      <p class="lead">Tell us what you're selling, what it costs you, and what you want to earn. We'll calculate your ideal price and show you how to improve your profit.</p>
      <div class="d-flex flex-wrap justify-content-center gap-2">
        <a routerLink="/analyze" class="btn btn-pp btn-pp-hero btn-pp-lg">Calculate My Price <pp-icon name="arrow-right" [size]="17" /></a>
        <button type="button" class="btn btn-pp-glass btn-pp-lg" (click)="seeExample()">See an Example</button>
      </div>
      <div class="d-flex flex-wrap justify-content-center gap-2 mt-4">
        @for (t of types; track t.type) {
          <span class="pp-chip"><pp-icon [name]="typeIcon(t.type)" [size]="13" /> {{ t.shortLabel }}</span>
        }
      </div>
    </section>

    <!-- Every figure below is this sample run through the real engine. -->
    <section class="pp-section pp-container">
      <div class="row g-4 align-items-start">
        <div class="col-lg-5">
          <div class="pp-card">
            <div class="d-flex align-items-center gap-2 mb-1">
              <pp-icon name="receipt" [size]="15" /><span class="pp-eyebrow">Worked example</span>
            </div>
            <h3 class="mb-3" style="font-weight: 400">{{ sampleOffering }}</h3>
            <div class="pp-ledger">
              @for (line of ex().costBreakdown; track line.key) {
                <span class="pp-muted">{{ line.label }}</span>
                <span class="pp-num">{{ line.amount | money: ex().currency }}</span>
              }
              <span class="total">True cost per {{ ex().unitLabel }}</span>
              <span class="total pp-num">{{ ex().trueCostPerUnit | money: ex().currency }}</span>
            </div>
            <div class="pp-subhead mt-3">
              {{ goals.expectedUnits }} {{ ex().unitLabel }}s a month · target profit {{ goals.targetMonthlyProfit | money: ex().currency : 0 }}
            </div>
          </div>
        </div>

        <div class="col-lg-7">
          <div class="pp-card pp-card--primary">
            <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
              <span class="pp-eyebrow">What ProfitPath works out</span>
              <button type="button" class="btn btn-pp btn-sm" (click)="seeExample()">Open this example <pp-icon name="arrow-right" [size]="13" /></button>
            </div>

            <div class="pp-kpi pp-kpi--xl">
              <span class="cur">{{ mark(ex().recommended.price) }}</span>{{ fig(ex().recommended.price) }}
            </div>
            <div class="pp-subhead mb-3">Recommended price per {{ ex().unitLabel }} · {{ ex().marginBand.mid | pct: 0 }} target margin</div>

            <div class="pp-stat-strip">
              <div class="pp-stat">
                <div class="k"><pp-icon name="wallet" [size]="12" /> True cost</div>
                <div class="v pp-num">{{ ex().trueCostPerUnit | money: ex().currency : 0 }}</div>
              </div>
              <div class="pp-stat">
                <div class="k"><pp-icon name="coins" [size]="12" /> Profit / {{ ex().unitLabel }}</div>
                <div class="v pp-num">{{ ex().recommended.profitPerUnit | money: ex().currency : 0 }}</div>
              </div>
              <div class="pp-stat">
                <div class="k"><pp-icon name="scale" [size]="12" /> Margin</div>
                <div class="v pp-num">{{ ex().recommended.marginPct | pct }}</div>
              </div>
            </div>

            <div class="d-flex align-items-center gap-2" style="margin: 22px 0 12px">
              <pp-icon name="trending-up" [size]="14" /><span class="pp-eyebrow">Where more profit comes from</span>
            </div>
            <div class="pp-waterfall">
              @for (r of topThree(); track r.id) {
                <div class="item">
                  <span>{{ r.title }}</span>
                  <span class="pp-num">+{{ r.estimatedMonthlyImpact | money: ex().currency : 0 }}/mo</span>
                  <div class="track"><span [style.width.%]="(r.estimatedMonthlyImpact / topImpact()) * 100"></span></div>
                </div>
              }
            </div>

            <pp-profit-compare
              class="d-block mt-4"
              [current]="exRoadmap().current.monthlyProfit"
              [optimised]="exRoadmap().optimisedMonthlyProfit"
              [currency]="ex().currency"
              [count]="exRoadmap().recommendations.length"
              [compact]="true"
            />
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
        @for (s of how; track s.title; let i = $index) {
          <div class="pp-card">
            <div class="d-flex align-items-center gap-2">
              <span class="pp-step-num">{{ i + 1 }}</span>
              <span class="pp-icon-badge pp-icon-badge--sm pp-icon-badge--plain"><pp-icon [name]="s.icon" [size]="14" /></span>
            </div>
            <h5>{{ s.title }}</h5>
            <p class="pp-muted mb-0">{{ s.body }}</p>
          </div>
        }
      </div>
    </section>

    <section class="pp-section pp-container">
      <div class="text-center mb-4">
        <h2>Simple pricing</h2>
        <p class="pp-muted">Start free. Upgrade when the roadmap pays for itself.</p>
      </div>
      <div class="row g-3 justify-content-center">
        @for (p of plans; track p.name) {
          <div class="col-md-4">
            <div class="pp-card h-100" [class.pp-card--dark]="p.hot">
              <div class="d-flex justify-content-between align-items-center gap-2">
                <span class="pp-subhead">{{ p.name }}</span>
                @if (p.hot) {
                  <span class="pp-badge recommended"><pp-icon name="sparkles" [size]="11" /> Most popular</span>
                }
              </div>
              <div class="pp-kpi pp-kpi--lg my-2">{{ p.price }}<span class="pp-subhead">{{ p.per }}</span></div>
              <ul class="pp-muted ps-3 mb-0" style="font-size: 13px; line-height: 1.9">
                @for (i of p.items; track i) {
                  <li>{{ i }}</li>
                }
              </ul>
            </div>
          </div>
        }
      </div>
    </section>

    <section class="pp-section pp-container text-center">
      <div class="pp-card" style="padding-block: 56px">
        <h2>Ready to find out what to charge?</h2>
        <p class="pp-muted mb-4" style="font-size: 13px">No sign-up needed for your first analysis.</p>
        <a routerLink="/analyze" class="btn btn-pp btn-pp-hero btn-pp-lg">Calculate My Price <pp-icon name="arrow-right" [size]="17" /></a>
      </div>
    </section>
  `,
})
export class LandingComponent {
  private readonly store = inject(AnalysisStore);
  private readonly router = inject(Router);
  readonly types = BUSINESS_TYPE_LIST;
  readonly how = HOW_IT_WORKS;
  readonly plans = PLANS;

  private readonly sample = SAMPLES[0];
  private readonly exModel = normalizeAnswers(this.sample.type, this.sample.answers, this.sample.offering);
  readonly sampleOffering = this.sample.offering;
  readonly goals = this.exModel.goals;
  readonly ex = computed(() => computePricing(this.exModel));
  readonly exRoadmap = computed(() => buildRoadmap(this.exModel, this.ex()));

  /** The three biggest levers, and the largest of them, for scaling the tracks. */
  readonly topThree = computed(() => this.exRoadmap().recommendations.slice(0, 3));
  readonly topImpact = computed(() => Math.max(1, ...this.topThree().map((r) => r.estimatedMonthlyImpact)));

  typeIcon(type: string): string {
    return BUSINESS_TYPE_ICONS[type as keyof typeof BUSINESS_TYPE_ICONS] ?? 'package';
  }

  /** The hero figure sets its currency mark small and muted beside the digits. */
  mark(value: number): string {
    return splitMoney(value, this.ex().currency)[0];
  }
  fig(value: number): string {
    return splitMoney(value, this.ex().currency)[1];
  }

  seeExample() {
    this.store.loadSample(this.sample.offering, this.sample.type, this.sample.answers);
    this.router.navigate(['/results']);
  }
}
