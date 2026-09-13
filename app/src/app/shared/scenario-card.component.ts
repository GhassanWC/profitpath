import { Component, input } from '@angular/core';
import { Scenario } from '../core/engine';
import { IconComponent } from './icon.component';
import { SCENARIO_ICONS } from './icons';
import { MoneyPipe, PctPipe } from './pipes';

const STATUS_TEXT: Record<string, string> = {
  low: 'Thin margin',
  recommended: 'Recommended',
  premium: 'Higher margin',
  loss: 'Loses money',
};

@Component({
  selector: 'pp-scenario-card',
  standalone: true,
  imports: [MoneyPipe, PctPipe, IconComponent],
  template: `
    <div class="pp-scenario" [class.recommended]="scenario().key === 'recommended'">
      <div class="d-flex justify-content-between align-items-center gap-2 mb-2">
        <span class="pp-subhead">{{ scenario().label }}</span>
        <span class="pp-badge" [class]="'pp-badge ' + scenario().status">
          <pp-icon [name]="statusIcon" [size]="11" />{{ statusText }}
        </span>
      </div>
      <div class="price pp-num">{{ scenario().price | money: currency() : 0 }}</div>
      <div class="pp-ledger mt-3">
        <span class="pp-muted">Profit / {{ unitLabel() }}</span>
        <span class="pp-num" [style.color]="scenario().profitPerUnit < 0 ? 'var(--pp-neg)' : null">{{ scenario().profitPerUnit | money: currency() }}</span>
        <span class="pp-muted">Margin</span>
        <span class="pp-num">{{ scenario().marginPct | pct }}</span>
        <span class="pp-muted">Monthly profit</span>
        <span class="pp-num">{{ scenario().monthlyProfit | money: currency() : 0 }}</span>
        @if (scenario().breakEvenUnits !== null) {
          <span class="pp-muted">Break-even</span>
          <span class="pp-num">{{ scenario().breakEvenUnits }} {{ unitLabel() }}s</span>
        }
      </div>
      <p class="pp-muted mt-3 mb-0" style="font-size: 12px">{{ scenario().note }}</p>
    </div>
  `,
  styles: [':host { display: block; height: 100%; }'],
})
export class ScenarioCardComponent {
  scenario = input.required<Scenario>();
  currency = input.required<string>();
  unitLabel = input('unit');

  get statusText(): string {
    return STATUS_TEXT[this.scenario().status] ?? this.scenario().status;
  }

  get statusIcon(): string {
    return SCENARIO_ICONS[this.scenario().status as keyof typeof SCENARIO_ICONS] ?? 'info';
  }
}
