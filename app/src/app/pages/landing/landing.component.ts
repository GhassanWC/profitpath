import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BUSINESS_TYPE_LIST, SAMPLES, buildRoadmap, computePricing, normalizeAnswers } from '../../core/engine';
import { AnalysisStore } from '../../core/state/analysis.store';
import { splitMoney } from '../../shared/format';
import { I18nService } from '../../shared/i18n.service';
import { IconComponent } from '../../shared/icon.component';
import { BUSINESS_TYPE_ICONS } from '../../shared/icons';
import { MoneyPipe, PctPipe } from '../../shared/pipes';
import { ProfitCompareComponent } from '../../shared/profit-compare.component';

const HOW_IT_WORKS = [
  { icon: 'square-pen', n: 1 },
  { icon: 'list-checks', n: 2 },
  { icon: 'calculator', n: 3 },
  { icon: 'map', n: 4 },
];

/** Plan prices are the product's own list prices, not analysis output. */
const PLANS = [
  { id: 'free', price: '$0', per: false, hot: false, items: 4 },
  { id: 'pro', price: '$9', per: true, hot: true, items: 5 },
  { id: 'business', price: '$19', per: true, hot: false, items: 4 },
];

@Component({
  selector: 'pp-landing',
  standalone: true,
  imports: [RouterLink, MoneyPipe, PctPipe, IconComponent, ProfitCompareComponent],
  template: `
    <section class="pp-hero pp-container pp-fade">
      <span class="pp-chip mb-4"><pp-icon name="sparkles" [size]="13" /> {{ t('landing.chip') }}</span>
      <h1>{{ t('landing.title.before') }} <span class="pp-gradient-text">{{ t('landing.title.accent') }}</span></h1>
      <p class="lead">{{ t('landing.lead') }}</p>
      <div class="d-flex flex-wrap justify-content-center gap-2">
        <a routerLink="/analyze" class="btn btn-pp btn-pp-hero btn-pp-lg">{{ t('landing.cta.primary') }} <pp-icon name="arrow-right" class="pp-icon-flip" [size]="17" /></a>
        <button type="button" class="btn btn-pp-glass btn-pp-lg" (click)="seeExample()">{{ t('landing.cta.example') }}</button>
      </div>
      <div class="d-flex flex-wrap justify-content-center gap-2 mt-4">
        @for (bt of types; track bt.type) {
          <span class="pp-chip"><pp-icon [name]="typeIcon(bt.type)" [size]="13" /> {{ t('businessType.' + bt.type + '.shortLabel') }}</span>
        }
      </div>
    </section>

    <!-- Every figure below is this sample run through the real engine. -->
    <section class="pp-section pp-container">
      <div class="row g-4 align-items-start">
        <div class="col-lg-5">
          <div class="pp-card">
            <div class="d-flex align-items-center gap-2 mb-1">
              <pp-icon name="receipt" [size]="15" /><span class="pp-eyebrow">{{ t('landing.example.eyebrow') }}</span>
            </div>
            <h3 class="mb-3" style="font-weight: 400">{{ sampleOffering }}</h3>
            <div class="pp-ledger">
              @for (line of ex().costBreakdown; track line.key) {
                <span class="pp-muted">{{ t(['costLine.' + line.key], {}) }}</span>
                <span class="pp-num">{{ line.amount | money: ex().currency }}</span>
              }
              <span class="total">{{ t('landing.example.trueCost', { unit: unitKey }) }}</span>
              <span class="total pp-num">{{ ex().trueCostPerUnit | money: ex().currency }}</span>
            </div>
            <div class="pp-subhead mt-3">
              {{ t('landing.example.goals', { count: goals.expectedUnits, units: unitsKey, target: goals.targetMonthlyProfit, cur: ex().currency }) }}
            </div>
          </div>
        </div>

        <div class="col-lg-7">
          <div class="pp-card pp-card--primary">
            <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
              <span class="pp-eyebrow">{{ t('landing.calc.eyebrow') }}</span>
              <button type="button" class="btn btn-pp btn-sm" (click)="seeExample()">{{ t('landing.calc.open') }} <pp-icon name="arrow-right" class="pp-icon-flip" [size]="13" /></button>
            </div>

            <div class="pp-kpi pp-kpi--xl">
              <span class="cur">{{ mark(ex().recommended.price) }}</span>{{ fig(ex().recommended.price) }}
            </div>
            <div class="pp-subhead mb-3">{{ t('landing.calc.sub', { unit: unitKey, margin: ex().marginBand.mid }) }}</div>

            <div class="pp-stat-strip">
              <div class="pp-stat">
                <div class="k"><pp-icon name="wallet" [size]="12" /> {{ t('results.trueCost') }}</div>
                <div class="v pp-num">{{ ex().trueCostPerUnit | money: ex().currency : 0 }}</div>
              </div>
              <div class="pp-stat">
                <div class="k"><pp-icon name="coins" [size]="12" /> {{ t('results.profitPerUnit', { unit: unitKey }) }}</div>
                <div class="v pp-num">{{ ex().recommended.profitPerUnit | money: ex().currency : 0 }}</div>
              </div>
              <div class="pp-stat">
                <div class="k"><pp-icon name="scale" [size]="12" /> {{ t('results.margin') }}</div>
                <div class="v pp-num">{{ ex().recommended.marginPct | pct }}</div>
              </div>
            </div>

            <div class="d-flex align-items-center gap-2" style="margin: 22px 0 12px">
              <pp-icon name="trending-up" [size]="14" /><span class="pp-eyebrow">{{ t('landing.calc.lift') }}</span>
            </div>
            <div class="pp-waterfall">
              @for (r of topThree(); track r.id) {
                <div class="item">
                  <span>{{ recTitle(r) }}</span>
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
        <h2>{{ t('landing.how.title') }}</h2>
        <p class="pp-muted">{{ t('landing.how.sub') }}</p>
      </div>
      <div class="pp-flow">
        @for (s of how; track s.n) {
          <div class="pp-card">
            <div class="d-flex align-items-center gap-2">
              <span class="pp-step-num">{{ s.n }}</span>
              <span class="pp-icon-badge pp-icon-badge--sm pp-icon-badge--plain"><pp-icon [name]="s.icon" [size]="14" /></span>
            </div>
            <h5>{{ t('landing.how.' + s.n + '.title') }}</h5>
            <p class="pp-muted mb-0">{{ t('landing.how.' + s.n + '.body') }}</p>
          </div>
        }
      </div>
    </section>

    <section class="pp-section pp-container">
      <div class="text-center mb-4">
        <h2>{{ t('landing.pricing.title') }}</h2>
        <p class="pp-muted">{{ t('landing.pricing.sub') }}</p>
      </div>
      <div class="row g-3 justify-content-center">
        @for (p of plans; track p.id) {
          <div class="col-md-4">
            <div class="pp-card h-100" [class.pp-card--dark]="p.hot">
              <div class="d-flex justify-content-between align-items-center gap-2">
                <span class="pp-subhead">{{ t('landing.plan.' + p.id + '.name') }}</span>
                @if (p.hot) {
                  <span class="pp-badge recommended"><pp-icon name="sparkles" [size]="11" /> {{ t('landing.pricing.popular') }}</span>
                }
              </div>
              <div class="pp-kpi pp-kpi--lg my-2">{{ p.price }}<span class="pp-subhead">{{ p.per ? t('landing.pricing.perMonth') : '' }}</span></div>
              <ul class="pp-muted ps-3 mb-0" style="font-size: 13px; line-height: 1.9">
                @for (n of itemIndexes(p.items); track n) {
                  <li>{{ t('landing.plan.' + p.id + '.' + n) }}</li>
                }
              </ul>
            </div>
          </div>
        }
      </div>
    </section>

    <section class="pp-section pp-container text-center">
      <div class="pp-card" style="padding-block: 56px">
        <h2>{{ t('landing.final.title') }}</h2>
        <p class="pp-muted mb-4" style="font-size: 13px">{{ t('landing.final.sub') }}</p>
        <a routerLink="/analyze" class="btn btn-pp btn-pp-hero btn-pp-lg">{{ t('landing.cta.primary') }} <pp-icon name="arrow-right" class="pp-icon-flip" [size]="17" /></a>
      </div>
    </section>
  `,
})
export class LandingComponent {
  private readonly store = inject(AnalysisStore);
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
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

  /** Unit nouns are catalogue keys so each locale inflects its own. */
  readonly unitKey = `unit.${this.sample.type}.one`;
  readonly unitsKey = `unit.${this.sample.type}.other`;

  itemIndexes(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  /** Prefer the translated recommendation; fall back to the engine's English. */
  recTitle(r: { title: string; i18n?: { title: { key: string; params?: Record<string, string | number> } } }): string {
    return this.i18n.msg(r.i18n?.title, r.title);
  }

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
