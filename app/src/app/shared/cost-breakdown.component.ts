import { Component, computed, input } from '@angular/core';
import { CostLine } from '../core/engine';
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
    <div class="pp-bar" role="img" aria-label="Cost breakdown">
      @for (l of colored(); track l.line.key) {
        <span [style.width.%]="l.line.share * 100" [style.background]="l.color" [title]="l.line.label"></span>
      }
    </div>
    <div class="pp-legend mt-3">
      @for (l of colored(); track l.line.key) {
        <div class="d-flex justify-content-between">
          <span><i class="dot" [style.background]="l.color"></i>{{ l.line.label }}</span>
          <span class="pp-num">{{ l.line.amount | money: currency() }} <span class="pp-muted">· {{ l.line.share | pct: 0 }}</span></span>
        </div>
      }
    </div>
  `,
})
export class CostBreakdownComponent {
  lines = input.required<CostLine[]>();
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
