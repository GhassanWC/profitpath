import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BUSINESS_TYPE_LIST, SAMPLES, buildRoadmap, computePricing, normalizeAnswers } from '../../core/engine';
import { AnalysisStore } from '../../core/state/analysis.store';
import { splitMoney } from '../../shared/format';
import { I18nService } from '../../shared/i18n.service';
import { IllustrationComponent } from '../../shared/illustration.component';
import { STEP_ILLUSTRATIONS } from '../../shared/illustrations';
import { MoneyPipe, PctPipe } from '../../shared/pipes';
import { ProfitCompareComponent } from '../../shared/profit-compare.component';

/** Plan prices are the product's own list prices, not analysis output. */
const PLANS = [
  { id: 'free', price: '$0', per: false, items: 4 },
  { id: 'pro', price: '$9', per: true, items: 5 },
  { id: 'business', price: '$19', per: true, items: 4 },
];

/**
 * Which plans carry which capability. Kept as data so the table and the stacked
 * mobile blocks read from one list — a tick that disagrees with the copy beside
 * it is the classic pricing-page bug.
 */
const FEATURES: { key: string; free: boolean | string; pro: boolean | string; business: boolean | string }[] = [
  { key: 'landing.plan.free.1', free: true, pro: true, business: true },
  { key: 'landing.plan.free.2', free: true, pro: true, business: true },
  { key: 'landing.plan.free.3', free: true, pro: true, business: true },
  { key: 'landing.plan.pro.2', free: false, pro: true, business: true },
  { key: 'landing.plan.pro.3', free: false, pro: true, business: true },
  { key: 'landing.plan.pro.5', free: false, pro: true, business: true },
  { key: 'landing.plan.business.2', free: false, pro: false, business: true },
  { key: 'landing.plan.business.3', free: false, pro: false, business: true },
];

@Component({
  selector: 'pp-landing',
  standalone: true,
  imports: [RouterLink, MoneyPipe, PctPipe, IllustrationComponent, ProfitCompareComponent],
  host: { class: 'pp-lp' },
  template: `
    <!-- ===================================================== hero -->
    <!-- Layers 1-3 are what let an arbitrary clip sit behind reading copy. To
         ship real footage, drop a <video class="pp-lp-hero__video" muted loop
         playsinline poster="..."> in place of the plate; nothing else moves. -->
    <section class="pp-lp-hero">
      <div class="pp-lp-hero__plate"></div>
      <div class="pp-lp-hero__grain"></div>
      <div class="pp-lp-hero__scrim"></div>
      <div class="pp-lp-hero__foot"></div>

      <div class="pp-lp-hero__copy pp-lp__inner">
        <div>
          <div class="pp-lp-eyebrow d-flex align-items-center gap-3" style="color: #b9c2d6">
            <span style="display: inline-block; width: 30px; height: 1px; background: var(--pp-brand-ink)"></span>
            {{ t('landing.chip') }}
          </div>
          <h1>{{ t('landing.title.before') }} <em>{{ t('landing.title.accent') }}</em></h1>
          <p class="pp-lp-hero__lede">{{ t('landing.lead') }}</p>
          <div class="d-flex flex-wrap align-items-center gap-3 mt-4">
            <a routerLink="/analyze" class="btn-lp pp-lp-mono">
              {{ t('landing.cta.primary') }}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pp-icon-flip" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
            </a>
            <button type="button" class="btn-lp btn-lp--quiet pp-lp-mono" (click)="seeExample()">{{ t('landing.cta.example') }}</button>
          </div>
          <div class="pp-lp-mono mt-4" style="font-size: 11.5px; color: #8c93a6">{{ t('landing.final.sub') }}</div>
        </div>
      </div>

      <!-- The ticker is the engine's own output, running along the foot. -->
      <div class="pp-lp-hero__ticker">
        <div class="pp-lp__inner">
          <span><b>{{ t('landing.example.eyebrow') }}</b></span>
          <span>{{ sampleOffering }}</span>
          <span>{{ t('results.trueCost') }} <b>{{ ex().trueCostPerUnit | money: ex().currency }}</b></span>
          <span>{{ t('results.badge') }} <b>{{ ex().recommended.price | money: ex().currency : 0 }}</b></span>
          <span>{{ t('results.margin') }} <b>{{ ex().recommended.marginPct | pct }}</b></span>
          <span>{{ t('nav.roadmap') }} <b class="pos">+{{ lift() | money: ex().currency : 0 }}</b></span>
        </div>
      </div>
    </section>

    <!-- ===================================================== five steps -->
    <section class="pp-lp-section pp-lp__inner" id="how">
      <div class="pp-lp-head">
        <h2>{{ t('landing.how.title') }}</h2>
        <p class="pp-lp-body mb-0" style="max-width: 380px; font-size: 14px">{{ t('landing.how.sub') }}</p>
      </div>
      <hr class="pp-lp-rule--ink" />
      <div class="pp-lp-steps">
        @for (art of steps; track art; let i = $index) {
          <div>
            <div class="n">{{ stepNumber(i) }}</div>
            <pp-illustration [name]="art" />
            <h3>{{ t('landing.how.' + (i + 1) + '.title') }}</h3>
            <p>{{ t('landing.how.' + (i + 1) + '.body') }}</p>
          </div>
        }
      </div>
      <hr class="pp-lp-rule" />
    </section>

    <!-- ===================================================== the example -->
    <!-- Every figure below is the sample run through the real engine. -->
    <section class="pp-lp-section pp-lp__inner">
      <div class="pp-lp-head">
        <div>
          <div class="pp-lp-eyebrow mb-3">{{ t('landing.example.eyebrow') }}</div>
          <h2>{{ sampleOffering }}</h2>
        </div>
        <p class="pp-lp-mono mb-0" style="max-width: 330px; font-size: 11.5px; line-height: 1.9; color: var(--lp-muted)">
          {{ t('landing.example.note') }}
        </p>
      </div>
      <hr class="pp-lp-rule--ink" />

      <div class="pp-lp-split">
        <div>
          <div class="pp-lp-eyebrow">{{ t('landing.example.costs') }}</div>
          <div class="pp-lp-ledger mt-4">
            @for (line of ex().costBreakdown; track line.key) {
              <span class="k">{{ t(['costLine.' + line.key], {}) }}</span>
              <span class="v">{{ line.amount | money: ex().currency }} <small>· {{ line.share | pct: 0 }}</small></span>
            }
            <span class="total">{{ t('landing.example.trueCost', { unit: unitKey }) }}</span>
            <span class="total v">{{ ex().trueCostPerUnit | money: ex().currency }}</span>
          </div>

          <!-- Widths are the engine's own shares, so the bar cannot disagree
               with the ledger above it. -->
          <div class="pp-lp-bar mt-4">
            @for (line of ex().costBreakdown; track line.key; let i = $index) {
              <span [style.width.%]="line.share * 100" [style.background]="seriesColor(i)"></span>
            }
          </div>

          <p class="pp-lp-body mt-4 mb-0" style="font-size: 13.5px">
            {{ t('landing.example.lead', { share: topShare() }) }}
          </p>
        </div>

        <div>
          <div class="pp-lp-eyebrow">{{ t('landing.calc.eyebrow') }}</div>
          <div class="pp-lp-figure">
            <span style="font-size: 0.42em; color: var(--lp-muted); vertical-align: top">{{ mark(ex().recommended.price) }}</span>{{ fig(ex().recommended.price) }}
          </div>
          <div class="pp-lp-mono mt-3" style="font-size: 12px; color: var(--lp-muted)">
            {{ t('landing.calc.sub', { unit: unitKey, margin: ex().marginBand.mid }) }}
          </div>

          <div class="pp-lp-stats mt-4">
            <div>
              <div class="pp-lp-cap">{{ t('results.trueCost') }}</div>
              <div class="v">{{ ex().trueCostPerUnit | money: ex().currency }}</div>
            </div>
            <div>
              <div class="pp-lp-cap">{{ t('results.profitPerUnit', { unit: unitKey }) }}</div>
              <div class="v">{{ ex().recommended.profitPerUnit | money: ex().currency }}</div>
            </div>
            <div>
              <div class="pp-lp-cap">{{ t('results.margin') }}</div>
              <div class="v">{{ ex().recommended.marginPct | pct }}</div>
            </div>
            <div>
              <div class="pp-lp-cap">{{ t('results.revenue') }}</div>
              <div class="v">{{ ex().recommended.monthlyRevenue | money: ex().currency : 0 }}</div>
            </div>
            <div>
              <div class="pp-lp-cap">{{ t('results.profit') }}</div>
              <div class="v pos">{{ ex().recommended.monthlyProfit | money: ex().currency : 0 }}</div>
            </div>
            <div>
              <div class="pp-lp-cap">{{ t('results.breakEvenSales') }}</div>
              <div class="v">{{ ex().recommended.breakEvenUnits ?? '—' }} <span style="font-size: 13px; color: var(--lp-muted)">{{ t('results.breakEvenSales.sub', { count: ex().expectedUnits }) }}</span></div>
            </div>
          </div>

          <p class="pp-lp-body mt-4 mb-0" style="font-size: 13.5px; max-width: 470px">
            {{ t('landing.example.goals', { count: goals.expectedUnits, units: unitsKey, target: goals.targetMonthlyProfit, cur: ex().currency }) }}
          </p>
        </div>
      </div>
    </section>

    <!-- ===================================================== today vs plan -->
    <section class="pp-lp-plate">
      <div class="pp-lp__inner">
        <div class="pp-lp-head" style="padding-bottom: 20px; border-bottom: 1.5px solid rgba(242, 239, 232, 0.28)">
          <h2>{{ t('results.roadmapWorth') }}</h2>
          <p class="pp-lp-mono mb-0" style="font-size: 11.5px; line-height: 1.9; color: var(--lp-on-plate-2); max-width: 340px">
            {{ t('roadmap.intro') }}
          </p>
        </div>

        <pp-profit-compare
          class="d-block mt-5"
          [current]="exRoadmap().current.monthlyProfit"
          [optimised]="exRoadmap().optimisedMonthlyProfit"
          [currency]="ex().currency"
          [count]="exRoadmap().recommendations.length"
        />

        <div class="pp-lp-steps pp-lp-steps--4 mt-5" style="border-top: 1px solid rgba(242, 239, 232, 0.22)">
          @for (r of topFour(); track r.id; let i = $index) {
            <div style="border-inline-end-color: rgba(242, 239, 232, 0.14); padding-block: 28px 30px">
              <div class="n" style="color: var(--lp-on-plate-2)">{{ stepNumber(i) }}</div>
              <h3 style="margin-top: 14px; color: var(--lp-on-plate)">{{ recTitle(r) }}</h3>
              <div class="impact">
                <div class="pp-lp-mono" style="font-size: 22px; color: var(--lp-pos-plate)">
                  +{{ r.estimatedMonthlyImpact | money: ex().currency : 0 }}
                </div>
                <div class="pp-lp-cap" style="margin-top: 12px; color: var(--lp-on-plate-2)">
                  {{ t('roadmap.priority', { priority: t('priority.' + r.priority) }) }} ·
                  {{ t('roadmap.difficulty', { difficulty: t('difficulty.' + r.difficulty) }) }}
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ===================================================== the range -->
    <section class="pp-lp-section pp-lp__inner">
      <div class="pp-lp-head">
        <h2>{{ t('landing.range.title') }}</h2>
        <p class="pp-lp-body mb-0" style="max-width: 400px; font-size: 14px">{{ t('landing.range.sub') }}</p>
      </div>
      <hr class="pp-lp-rule--ink" />
      <div class="pp-lp-range">
        @for (bt of types; track bt.type) {
          <div>
            <pp-illustration [name]="bt.type" set="category" />
            <div class="name">{{ t('businessType.' + bt.type + '.label') }}</div>
            <!-- The band is the engine's own, per type: nothing invented here. -->
            <div class="pp-lp-mono mt-2" style="font-size: 11px; color: var(--lp-muted)">
              {{ t('landing.range.band', { low: bt.marginBand.low, high: bt.marginBand.high }) }}
            </div>
          </div>
        }
      </div>
    </section>

    <!-- ===================================================== pricing -->
    <section class="pp-lp-section pp-lp__inner">
      <div class="pp-lp-head">
        <h2>{{ t('landing.pricing.title') }}</h2>
        <p class="pp-lp-body mb-0" style="max-width: 330px; font-size: 14px">{{ t('landing.pricing.sub') }}</p>
      </div>
      <hr class="pp-lp-rule--ink" />

      <div class="pp-lp-plans">
        <div class="head"></div>
        @for (p of plans; track p.id) {
          <div class="head">
            <div class="pp-lp-serif" style="font-size: 30px">{{ t('landing.plan.' + p.id + '.name') }}</div>
            <div class="pp-lp-mono mt-2" style="font-size: 13px" [style.color]="p.id === 'pro' ? 'var(--pp-brand-ink)' : 'var(--lp-muted)'">
              {{ p.price }}{{ p.per ? t('landing.pricing.perMonth') : '' }}
            </div>
          </div>
        }

        @for (f of features; track f.key) {
          <div class="feat">{{ t(f.key) }}</div>
          <div class="cell">
            @if (f.free === true) { <svg class="pp-lp-tick" width="15" height="15" viewBox="0 0 24 24" role="img" [attr.aria-label]="t('landing.plan.' + 'free' + '.name')"><path d="M4 12.5l5 5L20 6.5" /></svg> }
            @else { <span class="none" aria-hidden="true">—</span> }
          </div>
          <div class="cell">
            @if (f.pro === true) { <svg class="pp-lp-tick" width="15" height="15" viewBox="0 0 24 24" role="img" [attr.aria-label]="t('landing.plan.pro.name')"><path d="M4 12.5l5 5L20 6.5" /></svg> }
            @else { <span class="none" aria-hidden="true">—</span> }
          </div>
          <div class="cell">
            @if (f.business === true) { <svg class="pp-lp-tick" width="15" height="15" viewBox="0 0 24 24" role="img" [attr.aria-label]="t('landing.plan.business.name')"><path d="M4 12.5l5 5L20 6.5" /></svg> }
            @else { <span class="none" aria-hidden="true">—</span> }
          </div>
        }

        <div class="foot"></div>
        @for (p of plans; track p.id) {
          <div class="foot">
            <a routerLink="/analyze" class="btn-lp pp-lp-mono" [class.btn-lp--ghost]="p.id !== 'pro'" style="font-size: 12.5px; padding: 12px 20px">
              {{ t('landing.cta.primary') }}
            </a>
          </div>
        }
      </div>
    </section>

    <!-- ===================================================== closing -->
    <section class="pp-lp-close">
      <div class="pp-lp__inner">
        <div>
          <h2>{{ t('landing.final.title') }}</h2>
          <p class="pp-lp-body mt-3 mb-0" style="font-size: 15px; max-width: 460px">{{ t('landing.how.sub') }} {{ t('landing.final.sub') }}</p>
        </div>
        <a routerLink="/analyze" class="btn-lp pp-lp-mono" style="font-size: 14px; padding: 18px 32px; white-space: nowrap">
          {{ t('landing.cta.primary') }}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pp-icon-flip" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
        </a>
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
  readonly steps = STEP_ILLUSTRATIONS;
  readonly plans = PLANS;
  readonly features = FEATURES;

  private readonly sample = SAMPLES[0];
  private readonly exModel = normalizeAnswers(this.sample.type, this.sample.answers, this.sample.offering);
  readonly sampleOffering = this.sample.offering;
  readonly goals = this.exModel.goals;
  readonly ex = computed(() => computePricing(this.exModel));
  readonly exRoadmap = computed(() => buildRoadmap(this.exModel, this.ex()));

  /** The four biggest levers, and what the roadmap is worth in total. */
  readonly topFour = computed(() => this.exRoadmap().recommendations.slice(0, 4));
  readonly lift = computed(() => this.exRoadmap().optimisedMonthlyProfit - this.exRoadmap().current.monthlyProfit);
  /** The largest cost line's share, for the sentence under the ledger. */
  readonly topShare = computed(() => this.ex().costBreakdown[0]?.share ?? 0);

  /** Unit nouns are catalogue keys so each locale inflects its own. */
  readonly unitKey = `unit.${this.sample.type}.one`;
  readonly unitsKey = `unit.${this.sample.type}.other`;

  /** Zero-padded, because a roadmap reads as a numbered plan, not a list. */
  stepNumber(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  /** The same blue→violet ramp the cost breakdown uses, by position. */
  seriesColor(index: number): string {
    return `var(--pp-series-${(index % 9) + 1})`;
  }

  /** Prefer the translated recommendation; fall back to the engine's English. */
  recTitle(r: { title: string; i18n?: { title: { key: string; params?: Record<string, string | number> } } }): string {
    return this.i18n.msg(r.i18n?.title, r.title);
  }

  /** The hero figure sets its currency mark small and muted beside the digits. */
  mark(value: number): string {
    return splitMoney(this.i18n.money(value, this.ex().currency, 0))[0];
  }
  fig(value: number): string {
    return splitMoney(this.i18n.money(value, this.ex().currency, 0))[1];
  }

  seeExample() {
    this.store.loadSample(this.sample.offering, this.sample.type, this.sample.answers);
    this.router.navigate(['/results']);
  }
}
