import { Component, computed, input } from '@angular/core';
import { IconComponent } from './icon.component';
import { MoneyPipe } from './pipes';

/**
 * Current vs optimised monthly profit — the one statement of what following the
 * roadmap is worth. Both figures come from the engine (`ProfitRoadmap.current`
 * and `optimisedMonthlyProfit`); the bar is their real proportion, not a fixed
 * split, so a small lift looks small.
 *
 * `compact` is the inline variant used on the landing card; the full variant is
 * the roadmap's headline.
 */
@Component({
  selector: 'pp-profit-compare',
  standalone: true,
  imports: [MoneyPipe, IconComponent],
  template: `
    <div class="pp-compare">
      <div class="pp-compare__row">
        <div class="pp-compare__side">
          <div class="k"><pp-icon name="wallet" [size]="12" /> Today</div>
          <div class="pp-kpi pp-num" [class.pp-kpi--xl]="!compact()" [class.pp-kpi--lg]="compact()">
            {{ current() | money: currency() : 0 }}
          </div>
        </div>

        <div class="pp-compare__arrow"><pp-icon name="arrow-right" [size]="compact() ? 16 : 22" /></div>

        <div class="pp-compare__side">
          <div class="k"><pp-icon name="target" [size]="12" /> Following the roadmap</div>
          <div class="pp-kpi pp-kpi--pos pp-num" [class.pp-kpi--xl]="!compact()" [class.pp-kpi--lg]="compact()">
            {{ optimised() | money: currency() : 0 }}
          </div>
        </div>

        <div class="pp-compare__lift">
          <pp-icon name="trending-up" [size]="15" />
          +{{ lift() | money: currency() : 0 }}<span class="pp-muted">·</span>{{ liftPctLabel() }}
        </div>
      </div>

      <div>
        <div class="pp-compare__bar" role="img" [attr.aria-label]="barLabel()">
          <span class="now" [style.width.%]="currentShare()"></span>
          <span class="lift" [style.width.%]="100 - currentShare()"></span>
        </div>
        <div class="pp-compare__key mt-2">
          <span><i style="background: var(--pp-brand)"></i>Profit today</span>
          <span><i style="background: var(--pp-brand-2)"></i>Added by the {{ count() }} recommendations</span>
          <span>Estimates from your own numbers · not a forecast</span>
        </div>
      </div>
    </div>
  `,
})
export class ProfitCompareComponent {
  current = input.required<number>();
  optimised = input.required<number>();
  currency = input.required<string>();
  count = input(0);
  compact = input(false);

  readonly lift = computed(() => this.optimised() - this.current());
  /** Guarded: a zero or negative current profit has no meaningful percentage. */
  readonly liftPct = computed(() => (this.current() > 0 ? this.lift() / this.current() : null));
  readonly liftPctLabel = computed(() => {
    const p = this.liftPct();
    return p === null ? 'more profit' : `+${(p * 100).toFixed(0)}%`;
  });
  readonly currentShare = computed(() => {
    const o = this.optimised();
    if (!isFinite(o) || o <= 0) return 100;
    return Math.max(2, Math.min(100, (this.current() / o) * 100));
  });
  readonly barLabel = computed(() => `Profit today is ${Math.round(this.currentShare())}% of the optimised figure`);
}
