import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CATEGORY_META, RecCategory, Recommendation } from '../../core/engine';
import { TemplateExplanationProvider } from '../../core/ai/explanation-provider';
import { AnalysisStore } from '../../core/state/analysis.store';
import { MetricTileComponent } from '../../shared/metric-tile.component';
import { MoneyPipe, PctPipe } from '../../shared/pipes';
import { RecommendationCardComponent } from '../../shared/recommendation-card.component';

const ORDER: RecCategory[] = ['reduce_costs', 'reduce_cac', 'increase_revenue', 'increase_value'];

@Component({
  selector: 'pp-roadmap',
  standalone: true,
  imports: [RouterLink, MoneyPipe, PctPipe, MetricTileComponent, RecommendationCardComponent],
  template: `
    @if (store.roadmap(); as r) {
      @if (store.pricing(); as p) {
        <div class="pp-container py-5 pp-fade">
          <div class="pp-narrow text-center mb-4">
            <span class="pp-chip mb-3">🗺️ Profit Roadmap · {{ store.offering() }}</span>
            <h1>How to make more profit at {{ r.current.price | money: p.currency : 0 }}</h1>
            <p class="pp-muted" style="font-size: 14px; margin: 10px 0 0">There are more ways to grow profit than raising your price. These are the levers that matter most for your numbers, ranked by estimated impact and effort.</p>
          </div>

          <!-- Current vs optimised -->
          <div class="row g-4 align-items-start">
            <div class="col-lg-4">
              <div class="pp-card h-100">
                <div class="pp-eyebrow mb-3">Current situation</div>
                <div class="pp-ledger">
                  <span class="pp-muted">Selling price</span><span class="pp-num">{{ r.current.price | money: p.currency : 0 }}</span>
                  <span class="pp-muted">True cost</span><span class="pp-num">{{ r.current.trueCostPerUnit | money: p.currency }}</span>
                  <span class="pp-muted">Profit / {{ p.unitLabel }}</span><span class="pp-num">{{ r.current.profitPerUnit | money: p.currency }}</span>
                  <span class="pp-muted">{{ p.unitLabel }}s / month</span><span class="pp-num">{{ r.current.units }}</span>
                  <span class="pp-muted">Margin</span><span class="pp-num">{{ r.current.marginPct | pct }}</span>
                  <span class="total">Monthly profit</span><span class="total pp-num">{{ r.current.monthlyProfit | money: p.currency : 0 }}</span>
                </div>
              </div>
            </div>
            <div class="col-lg-8">
              <div class="pp-panel h-100">
                <div class="row g-3 align-items-stretch">
                  <div class="col-md-5">
                    <!-- The one blue gradient card on this screen. -->
                    <div class="pp-trend h-100">
                      <div class="pp-eyebrow">Optimised estimated monthly profit</div>
                      <div class="pp-kpi pp-kpi-lg mt-2">{{ r.optimisedMonthlyProfit | money: p.currency : 0 }}</div>
                      <div class="pp-muted" style="font-size: 11px">from {{ r.current.monthlyProfit | money: p.currency : 0 }} today · <strong>+{{ (r.optimisedMonthlyProfit - r.current.monthlyProfit) | money: p.currency : 0 }}</strong></div>
                      <div style="position: relative; margin-top: 14px; height: 64px">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width: 100%; height: 100%; overflow: visible" role="img" aria-label="Cumulative profit as each roadmap item lands">
                          <path [attr.d]="trendPath()" fill="none" stroke="#fff" stroke-width="1.4" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                        <span style="position: absolute; left: 0; bottom: -4px; font-size: 10px; color: rgba(255,255,255,0.8)">today</span>
                        <span style="position: absolute; right: 0; top: -6px; font-size: 10px; color: rgba(255,255,255,0.8)">optimised</span>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-7">
                    <div class="pp-card-bare h-100">
                      <div class="pp-eyebrow mb-3">Where the lift comes from</div>
                      <div class="pp-waterfall">
                        @for (rec of r.recommendations; track rec.id) {
                          <div class="item">
                            <span>{{ rec.title }}</span>
                            <span class="pp-num">+{{ rec.estimatedMonthlyImpact | money: p.currency : 0 }}</span>
                            <div class="track"><span [style.width.%]="(rec.estimatedMonthlyImpact / maxImpact()) * 100"></span></div>
                          </div>
                        }
                      </div>
                      <div class="pp-muted mt-3" style="font-size: 11px">
                        Sum of items {{ r.sumOfImpacts | money: p.currency : 0 }}, reduced by {{ r.interactionDiscountPct | pct: 0 }} because improvements overlap.
                        @if (p.target.targetMonthlyProfit > 0) {
                          {{ r.targetReached ? 'Reaches' : 'Still short of' }} your {{ p.target.targetMonthlyProfit | money: p.currency : 0 }} target.
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="pp-card mt-3">
            <div class="d-flex justify-content-between flex-wrap gap-2 align-items-center">
              <div style="font-size: 13px"><strong style="font-weight: 500">Roadmap progress:</strong> {{ doneCount() }}/{{ r.recommendations.length }} completed</div>
              <div class="pp-progress" style="width: min(320px, 100%)"><div [style.width.%]="r.recommendations.length ? (doneCount() / r.recommendations.length) * 100 : 0"></div></div>
            </div>
            <p class="mb-0 mt-2" style="font-size: 13px; color: var(--pp-ink-2)">{{ summary() }}</p>
          </div>

          <!-- Categories -->
          @for (cat of categories(); track cat.key) {
            <div class="pp-cat-head">
              <span class="icon">{{ cat.meta.icon }}</span>
              <div>
                <h3 class="mb-0">{{ cat.meta.label }}</h3>
                <div class="pp-muted" style="font-size: 12px">{{ cat.meta.blurb }}</div>
              </div>
            </div>
            <div class="d-grid" style="gap: var(--pp-grid-gap)">
              @for (rec of cat.items; track rec.id) {
                <pp-recommendation-card [rec]="rec" [currency]="p.currency" (toggle)="store.toggleCompleted($event)" />
              }
            </div>
          }

          <div class="pp-notice pp-notice-block mt-5">{{ r.disclaimer }}</div>
          <div class="d-flex flex-wrap gap-2 mt-4">
            <a routerLink="/results" class="btn btn-pp-white">← Back to pricing</a>
            <a routerLink="/analyze" class="btn btn-pp-ghost">Analyse another business</a>
          </div>
        </div>
      }
    }
  `,
})
export class RoadmapComponent {
  readonly store = inject(AnalysisStore);
  private readonly ai = inject(TemplateExplanationProvider);
  readonly summary = signal('');

  readonly maxImpact = computed(() => Math.max(1, ...(this.store.roadmap()?.recommendations.map((r) => r.estimatedMonthlyImpact) ?? [1])));

  /**
   * The trend line is cumulative, not decorative: profit today, then each
   * recommendation's share of the (discounted) lift added in rank order, so the
   * last point is exactly the optimised figure shown above it.
   */
  readonly trendPath = computed(() => {
    const r = this.store.roadmap();
    if (!r) return '';
    const lift = r.optimisedMonthlyProfit - r.current.monthlyProfit;
    const sum = r.sumOfImpacts || 1;
    let cumulative = 0;
    const points = [r.current.monthlyProfit].concat(
      r.recommendations.map((rec) => {
        cumulative += rec.estimatedMonthlyImpact;
        return r.current.monthlyProfit + (cumulative / sum) * lift;
      }),
    );
    if (points.length < 2) return '';
    const max = Math.max(...points);
    const min = Math.min(...points);
    return points
      .map((v, i) => {
        const x = (i / (points.length - 1)) * 100;
        const y = 100 - ((v - min) / (max - min || 1)) * 100;
        return `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  });
  readonly doneCount = computed(() => this.store.roadmap()?.recommendations.filter((r) => r.done).length ?? 0);
  readonly categories = computed(() => {
    const recs = this.store.roadmap()?.recommendations ?? [];
    return ORDER.map((key) => ({ key, meta: CATEGORY_META[key], items: recs.filter((r: Recommendation) => r.category === key) })).filter((c) => c.items.length);
  });

  constructor() {
    const m = this.store.model();
    const p = this.store.pricing();
    const r = this.store.roadmap();
    if (m && p && r) this.ai.explainRoadmap(m, p, r).then((t) => this.summary.set(t));
  }
}
