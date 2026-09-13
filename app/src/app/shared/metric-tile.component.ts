import { Component, input } from '@angular/core';

@Component({
  selector: 'pp-metric-tile',
  standalone: true,
  template: `
    <div class="pp-metric">
      <div class="pp-eyebrow">{{ label() }}</div>
      <div class="pp-kpi" [class.pp-kpi-sm]="small()" [style.color]="color()">{{ value() }}</div>
      @if (sub()) {
        <div class="sub">{{ sub() }}</div>
      }
    </div>
  `,
})
export class MetricTileComponent {
  label = input.required<string>();
  value = input.required<string>();
  sub = input<string>('');
  color = input<string>('');
  small = input(false);
}
