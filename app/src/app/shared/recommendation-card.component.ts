import { Component, input, output } from '@angular/core';
import { Recommendation, priorityLabel } from '../core/engine';
import { MoneyPipe } from './pipes';

@Component({
  selector: 'pp-recommendation-card',
  standalone: true,
  imports: [MoneyPipe],
  template: `
    <article class="pp-rec" [class.done]="rec().done">
      <div class="d-flex align-items-start" style="gap: 14px">
        <button type="button" class="pp-check mt-1" [class.on]="rec().done" (click)="toggle.emit(rec().id)" [attr.aria-label]="rec().done ? 'Mark as not done' : 'Mark as done'">
          @if (rec().done) { ✓ }
        </button>
        <div class="flex-grow-1" style="min-width: 0">
          <div class="d-flex flex-wrap gap-2 align-items-center">
            <span class="pp-badge" [class]="'pp-badge ' + rec().priority">{{ priorityText }} priority</span>
            <span class="pp-badge" [class]="'pp-badge ' + rec().difficulty">{{ rec().difficulty }}</span>
          </div>
          <div class="d-flex justify-content-between align-items-start" style="gap: 16px">
            <h4>{{ rec().title }}</h4>
            <div class="text-end">
              <div class="impact">+{{ rec().estimatedMonthlyImpact | money: currency() : 0 }}</div>
              <div class="pp-muted" style="font-size: 11px">est. per month</div>
            </div>
          </div>
          <div style="margin-top: 12px">
            <div class="label">Why</div>
            <p>{{ rec().why }}</p>
            <div class="label">Suggested action</div>
            <p>{{ rec().action }}</p>
          </div>
          @if (rec().assumptions.length) {
            <details>
              <summary>Assumptions behind this estimate</summary>
              <ul>
                @for (a of rec().assumptions; track $index) {
                  <li>{{ a }}</li>
                }
              </ul>
            </details>
          }
        </div>
      </div>
    </article>
  `,
  styles: [':host { display: block; }'],
})
export class RecommendationCardComponent {
  rec = input.required<Recommendation>();
  currency = input.required<string>();
  toggle = output<string>();

  get priorityText(): string {
    return priorityLabel(this.rec().priority);
  }
}
