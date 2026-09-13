import { Component, computed, input } from '@angular/core';
import { CostLine } from '../core/engine';
import { MoneyPipe, PctPipe } from './pipes';

const COLORS: Record<CostLine['group'], string[]> = {
  direct: ['#0f766e', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1', '#0d9488'],
  variable: ['#f59e0b', '#fbbf24'],
  overhead: ['#6366f1'],
  fees: ['#94a3b8', '#b6c2d1', '#cbd5e1', '#dde4ec'],
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
