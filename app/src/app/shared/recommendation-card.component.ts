import { Component, input, output } from '@angular/core';
import { Recommendation, priorityLabel } from '../core/engine';
import { MoneyPipe } from './pipes';

@Component({
  selector: 'pp-recommendation-card',
  standalone: true,
  imports: [MoneyPipe],
  template: `
    <article class="pp-rec" [class.done]="rec().done">
      <div class="d-flex gap-3 align-items-start">
        <button type="button" class="pp-check mt-1" [class.on]="rec().done" (click)="toggle.emit(rec().id)" [attr.aria-label]="rec().done ? 'Mark as not done' : 'Mark as done'">
          @if (rec().done) { ✓ }
        </button>
        <div class="flex-grow-1">
          <div class="d-flex flex-wrap gap-2 align-items-center">
            <span class="pp-badge" [class]="'pp-badge ' + rec().priority">{{ priorityText }} PRIORITY</span>
            <span class="pp-badge" [class]="'pp-badge ' + rec().difficulty">{{ rec().difficulty }}</span>
          </div>
          <div class="d-flex justify-content-between gap-3 align-items-start">
            <h4>{{ rec().title }}</h4>
            <div class="text-end">
              <div class="impact">+{{ rec().estimatedMonthlyImpact | money: currency() : 0 }}</div>
              <div class="pp-muted" style="font-size: 0.74rem">est. per month</div>
            </div>
          </div>
          <div class="label">Why</div>
          <p>{{ rec().why }}</p>
          <div class="label">Suggested action</div>
          <p>{{ rec().action }}</p>
          <details>
            <summary class="pp-muted" style="font-size: 0.85rem; cursor: pointer">Assumptions behind this estimate</summary>
            <ul class="mt-2">
              @for (a of rec().assumptions; track $index) {
                <li>{{ a }}</li>
              }
            </ul>
          </details>
        </div>
      </div>
    </article>
  `,
})
export class RecommendationCardComponent {
  rec = input.required<Recommendation>();
  currency = input.required<string>();
  toggle = output<string>();

  get priorityText(): string {
    return priorityLabel(this.rec().priority);
  }
}
