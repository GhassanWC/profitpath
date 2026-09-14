import { Component, computed, inject, input } from '@angular/core';
import { CostLine } from '../core/engine';
import { I18nService } from './i18n.service';
import { MoneyPipe, PctPipe } from './pipes';

/** The blue→violet cost-composition series, named from the tokens in styles.css. */
const COLORS: Record<CostLine['group'], string[]> = {
  direct: ['var(--pp-series-1)', 'var(--pp-series-2)', 'var(--pp-series-3)', 'var(--pp-series-4)'],
  variable: ['var(--pp-series-5)', 'var(--pp-series-6)'],
  overhead: ['var(--pp-series-7)'],
  fees: ['var(--pp-series-8)', 'var(--pp-series-9)'],
};

@Component({
  selector: 'pp-cost-breakdown',
  standalone: true,
  imports: [MoneyPipe, PctPipe],
  template: `
    <div class="pp-bar" role="img" [attr.aria-label]="t('chart.costBreakdown')">
      @for (l of colored(); track l.line.key) {
        <span [style.width.%]="l.line.share * 100" [style.background]="l.color" [title]="label(l.line)"></span>
      }
    </div>
    <div class="pp-legend mt-3">
      @for (l of colored(); track l.line.key) {
        <div class="d-flex justify-content-between">
          <span><i class="dot" [style.background]="l.color"></i>{{ label(l.line) }}</span>
          <span class="pp-num">{{ l.line.amount | money: currency() }} <span class="pp-muted">· {{ l.line.share | pct: 0 }}</span></span>
        </div>
      }
    </div>
  `,
})
export class CostBreakdownComponent {
  readonly t = inject(I18nService).t;
  lines = input.required<CostLine[]>();

  /** Cost-line labels are static per key, so the catalogue holds them directly. */
  label(line: CostLine): string {
    return this.t([`costLine.${line.key}`], {}) || line.label;
  }
  currency = input.required<string>();

  colored = computed(() => {
    const counters: Record<string, number> = {};
    return this.lines().map((line) => {
      const i = counters[line.group] ?? 0;
      counters[line.group] = i + 1;
      const palette = COLORS[line.group];
      return { line, color: palette[i % palette.length] };
    });
  });
}
