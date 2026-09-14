import { Component, inject, input } from '@angular/core';
import { Scenario } from '../core/engine';
import { I18nService } from './i18n.service';
import { IconComponent } from './icon.component';
import { SCENARIO_ICONS } from './icons';
import { MoneyPipe, PctPipe } from './pipes';

@Component({
  selector: 'pp-scenario-card',
  standalone: true,
  imports: [MoneyPipe, PctPipe, IconComponent],
  template: `
    <div class="pp-scenario" [class.recommended]="scenario().key === 'recommended'">
      <div class="d-flex justify-content-between align-items-center gap-2 mb-2">
        <span class="pp-subhead">{{ t('scenario.' + scenario().key + '.label') }}</span>
        <span class="pp-badge" [class]="'pp-badge ' + scenario().status">
          <pp-icon [name]="statusIcon" [size]="11" />{{ statusText }}
        </span>
      </div>
      <div class="price pp-num">{{ scenario().price | money: currency() : 0 }}</div>
      <div class="pp-ledger mt-3">
        <span class="pp-muted">{{ t('results.whatif.profitPerUnit', { unit: unitKey() }) }}</span>
        <span class="pp-num" [style.color]="scenario().profitPerUnit < 0 ? 'var(--pp-neg)' : null">{{ scenario().profitPerUnit | money: currency() }}</span>
        <span class="pp-muted">{{ t('results.margin') }}</span>
        <span class="pp-num">{{ scenario().marginPct | pct }}</span>
        <span class="pp-muted">{{ t('results.whatif.monthlyProfit') }}</span>
        <span class="pp-num">{{ scenario().monthlyProfit | money: currency() : 0 }}</span>
        @if (scenario().breakEvenUnits !== null) {
          <span class="pp-muted">{{ t('results.breakEven') }}</span>
          <span class="pp-num">{{ scenario().breakEvenUnits }} {{ t(unitsKey()) }}</span>
        }
      </div>
      <p class="pp-muted mt-3 mb-0" style="font-size: 12px">{{ note }}</p>
    </div>
  `,
  styles: [':host { display: block; height: 100%; }'],
})
export class ScenarioCardComponent {
  private readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  scenario = input.required<Scenario>();
  currency = input.required<string>();
  businessType = input<string | null>(null);

  unitKey = () => `unit.${this.businessType() ?? 'generic'}.one`;
  unitsKey = () => `unit.${this.businessType() ?? 'generic'}.other`;

  get statusText(): string {
    return this.t(`scenario.status.${this.scenario().status}`);
  }

  /** The engine's note, translated when the active locale carries it. */
  get note(): string {
    return this.i18n.msg(this.scenario().noteI18n, this.scenario().note);
  }

  get statusIcon(): string {
    return SCENARIO_ICONS[this.scenario().status as keyof typeof SCENARIO_ICONS] ?? 'info';
  }
}
