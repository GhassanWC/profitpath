import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from './i18n.service';
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
          <div class="k"><pp-icon name="wallet" [size]="12" /> {{ t('compare.today') }}</div>
          <div class="pp-kpi pp-num" [class.pp-kpi--xl]="!compact()" [class.pp-kpi--lg]="compact()">
            {{ current() | money: currency() : 0 }}
          </div>
        </div>

        <div class="pp-compare__arrow"><pp-icon name="arrow-right" class="pp-icon-flip" [size]="compact() ? 16 : 22" /></div>

        <div class="pp-compare__side">
          <div class="k"><pp-icon name="target" [size]="12" /> {{ t('compare.following') }}</div>
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
          <span><i style="background: var(--pp-brand)"></i>{{ t('compare.keyToday') }}</span>
          <span><i style="background: var(--pp-brand-2)"></i>{{ t('compare.keyAdded', { count: count() }) }}</span>
          <span>{{ t('compare.keyNote') }}</span>
        </div>
      </div>
    </div>
  `,
})
export class ProfitCompareComponent {
  private readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
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
    return p === null ? this.t('compare.moreProfit') : this.i18n.pct(p, 0);
  });
  readonly currentShare = computed(() => {
    const o = this.optimised();
    if (!isFinite(o) || o <= 0) return 100;
    return Math.max(2, Math.min(100, (this.current() / o) * 100));
  });
  readonly barLabel = computed(() => this.t('compare.barLabel', { share: Math.round(this.currentShare()) }));
}
