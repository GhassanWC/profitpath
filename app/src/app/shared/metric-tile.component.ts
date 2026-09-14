import { Component, input } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'pp-metric-tile',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="pp-metric">
      <div class="k">
        @if (icon()) {
          <pp-icon [name]="icon()" [size]="12" />
        }
        {{ label() }}
      </div>
      <div class="pp-kpi" [class.pp-kpi--sm]="small()" [style.color]="color()">{{ value() }}</div>
      @if (sub()) {
        <div class="sub">{{ sub() }}</div>
      }
    </div>
  `,
  styles: [':host { display: block; height: 100%; }'],
})
export class MetricTileComponent {
  label = input.required<string>();
  value = input.required<string>();
  sub = input<string>('');
  color = input<string>('');
  icon = input<string>('');
  small = input(false);
}
