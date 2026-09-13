import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CATEGORY_META, RecCategory, Recommendation } from '../../core/engine';
import { TemplateExplanationProvider } from '../../core/ai/explanation-provider';
import { AnalysisStore } from '../../core/state/analysis.store';
import { IconComponent } from '../../shared/icon.component';
import { CATEGORY_ICONS, DIFFICULTY_ICONS } from '../../shared/icons';
import { MoneyPipe, PctPipe } from '../../shared/pipes';
import { ProfitCompareComponent } from '../../shared/profit-compare.component';
import { RecommendationCardComponent } from '../../shared/recommendation-card.component';

const ORDER: RecCategory[] = ['reduce_costs', 'reduce_cac', 'increase_revenue', 'increase_value'];

@Component({
  selector: 'pp-roadmap',
  standalone: true,
  imports: [RouterLink, MoneyPipe, PctPipe, RecommendationCardComponent, IconComponent, ProfitCompareComponent],
  template: `
    @if (store.roadmap(); as r) {
      @if (store.pricing(); as p) {
        <div class="pp-container py-5 pp-fade">
          <div class="pp-narrow text-center mb-4">
            <span class="pp-chip mb-3"><pp-icon name="map" [size]="13" /> Profit Roadmap · {{ store.offering() }}</span>
            <h1>How to make more profit at {{ r.current.price | money: p.currency : 0 }}</h1>
            <p class="pp-muted" style="font-size: 14px; margin: 10px 0 0">
              There are more ways to grow profit than raising your price. These are the levers that matter most for your numbers, ranked by estimated impact and effort.
            </p>
          </div>

          <!-- The headline of the whole feature: what following it is worth. -->
          <div class="pp-card pp-card--primary">
            <pp-profit-compare
              [current]="r.current.monthlyProfit"
              [optimised]="r.optimisedMonthlyProfit"
              [currency]="p.currency"
              [count]="r.recommendations.length"
            />

            <div class="row g-3 mt-1">
              <div class="col-md-7">
                <div class="pp-card-bare pp-card-bare--data h-100">
                  <div class="d-flex align-items-center gap-2 mb-3">
                    <pp-icon name="chart-column" [size]="14" /><span class="pp-eyebrow">Where the lift comes from</span>
                  </div>
                  <div class="pp-waterfall">
                    @for (rec of r.recommendations; track rec.id) {
                      <div class="item">
                        <span>{{ rec.title }}</span>
                        <span class="pp-num">+{{ rec.estimatedMonthlyImpact | money: p.currency : 0 }}</span>
                        <div class="track"><span [style.width.%]="(rec.estimatedMonthlyImpact / maxImpact()) * 100"></span></div>
                      </div>
                    }
                  </div>
                  <div class="pp-label mt-3">
                    Sum of items {{ r.sumOfImpacts | money: p.currency : 0 }}, reduced by {{ r.interactionDiscountPct | pct: 0 }} because improvements overlap.
                  </div>
                </div>
              </div>

              <div class="col-md-5">
                <div class="pp-card-bare pp-card-bare--data h-100 d-flex flex-column">
                  <div class="d-flex align-items-center gap-2 mb-3">
                    <pp-icon name="list-checks" [size]="14" /><span class="pp-eyebrow">Your progress</span>
                  </div>
                  <div class="pp-kpi pp-kpi--lg">{{ doneCount() }}<span class="pp-subhead"> / {{ r.recommendations.length }} done</span></div>
                  <div class="pp-progress mt-2 mb-3"><div [style.width.%]="donePct()"></div></div>
                  @if (p.target.targetMonthlyProfit > 0) {
                    <div class="mt-auto" [class]="r.targetReached ? 'pp-ok pp-ok-block mt-auto' : 'pp-warn pp-warn-block mt-auto'">
                      <pp-icon [name]="r.targetReached ? 'circle-check' : 'triangle-alert'" [size]="14" />
                      <span>
                        {{ r.targetReached ? 'Reaches' : 'Still short of' }} your {{ p.target.targetMonthlyProfit | money: p.currency : 0 }} monthly target.
                      </span>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- The single biggest move, pulled out so it is impossible to miss. -->
          @if (topMove(); as top) {
            <div class="pp-card pp-card--insight mt-3">
              <div class="pp-spot__head">
                <span class="pp-icon-badge pp-icon-badge--sm"><pp-icon name="sparkles" [size]="14" /></span>
                Start here — your best next move
              </div>
              <div class="d-flex justify-content-between align-items-start flex-wrap" style="gap: 16px">
                <div style="min-width: 0; flex: 1 1 320px">
                  <h3 class="mb-2">{{ top.title }}</h3>
                  <p class="pp-body mb-3">{{ top.action }}</p>
                  <div class="pp-spot__meta">
                    <span class="pp-badge" [class]="'pp-badge ' + top.priority"><pp-icon name="chevrons-up" [size]="11" />{{ topPriority() }} priority</span>
                    <span class="pp-badge" [class]="'pp-badge ' + top.difficulty"><pp-icon [name]="difficultyIcon(top.difficulty)" [size]="11" />{{ top.difficulty }} to do</span>
                  </div>
                </div>
                <div class="pp-stat pp-stat--accent" style="flex: 0 0 auto; min-width: 190px">
                  <div class="k"><pp-icon name="trending-up" [size]="12" /> Estimated impact</div>
                  <div class="v pp-num">+{{ top.estimatedMonthlyImpact | money: p.currency : 0 }}</div>
                  <div class="pp-label mt-1">per month · {{ topShare() }}% of the total lift</div>
                </div>
              </div>
            </div>
          }

          <div class="pp-card pp-card--insight mt-3">
            <div class="d-flex align-items-start gap-2">
              <span class="pp-icon-badge pp-icon-badge--sm"><pp-icon name="lightbulb" [size]="14" /></span>
              <p class="pp-body mb-0">{{ summary() }}</p>
            </div>
          </div>

          <!-- Categories -->
          @for (cat of categories(); track cat.key) {
            <div class="pp-cat-head">
              <span class="pp-icon-badge"><pp-icon [name]="categoryIcon(cat.key)" [size]="17" /></span>
              <div>
                <h3 class="mb-0">{{ cat.meta.label }}</h3>
                <div class="pp-muted" style="font-size: 12px">{{ cat.meta.blurb }}</div>
              </div>
              <span class="pp-badge ms-auto">+{{ cat.total | money: p.currency : 0 }} / mo</span>
            </div>
            <div class="d-grid" style="gap: var(--pp-grid-gap)">
              @for (rec of cat.items; track rec.id) {
                <pp-recommendation-card [rec]="rec" [currency]="p.currency" [totalImpact]="r.sumOfImpacts" (toggle)="store.toggleCompleted($event)" />
              }
            </div>
          }

          <div class="pp-notice pp-notice-block mt-5">
            <pp-icon name="info" [size]="14" /><span>{{ r.disclaimer }}</span>
          </div>
          <div class="d-flex flex-wrap gap-2 mt-4">
            <a routerLink="/results" class="btn btn-pp-white"><pp-icon name="arrow-left" [size]="14" /> Back to pricing</a>
            <a routerLink="/analyze" class="btn btn-pp-ghost"><pp-icon name="rotate-ccw" [size]="14" /> Analyse another business</a>
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
  readonly doneCount = computed(() => this.store.roadmap()?.recommendations.filter((r) => r.done).length ?? 0);
  readonly donePct = computed(() => {
    const total = this.store.roadmap()?.recommendations.length ?? 0;
    return total ? (this.doneCount() / total) * 100 : 0;
  });

  /** Recommendations arrive ranked, so the first outstanding one is the move to make next. */
  readonly topMove = computed<Recommendation | null>(() => {
    const recs = this.store.roadmap()?.recommendations ?? [];
    return recs.find((r) => !r.done) ?? recs[0] ?? null;
  });
  readonly topPriority = computed(() => {
    const t = this.topMove();
    return t ? t.priority.charAt(0).toUpperCase() + t.priority.slice(1) : '';
  });
  readonly topShare = computed(() => {
    const r = this.store.roadmap();
    const t = this.topMove();
    return r && t && r.sumOfImpacts > 0 ? Math.round((t.estimatedMonthlyImpact / r.sumOfImpacts) * 100) : 0;
  });

  readonly categories = computed(() => {
    const recs = this.store.roadmap()?.recommendations ?? [];
    return ORDER.map((key) => {
      const items = recs.filter((r: Recommendation) => r.category === key);
      return { key, meta: CATEGORY_META[key], items, total: items.reduce((sum, r) => sum + r.estimatedMonthlyImpact, 0) };
    }).filter((c) => c.items.length);
  });

  categoryIcon(key: RecCategory): string {
    return CATEGORY_ICONS[key] ?? 'trending-up';
  }

  difficultyIcon(difficulty: string): string {
    return DIFFICULTY_ICONS[difficulty as keyof typeof DIFFICULTY_ICONS] ?? 'signal-medium';
  }

  constructor() {
    const m = this.store.model();
    const p = this.store.pricing();
    const r = this.store.roadmap();
    if (m && p && r) this.ai.explainRoadmap(m, p, r).then((t) => this.summary.set(t));
  }
}
