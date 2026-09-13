import { Component, input, output } from '@angular/core';
import { Recommendation, priorityLabel } from '../core/engine';
import { IconComponent } from './icon.component';
import { DIFFICULTY_ICONS } from './icons';
import { MoneyPipe } from './pipes';

/**
 * One move on the roadmap. It has to answer four things at a glance —
 * what to do, what it is worth, how hard it is, and how urgent — so those four
 * are the card's structure, not prose the reader has to mine.
 */
@Component({
  selector: 'pp-recommendation-card',
  standalone: true,
  imports: [MoneyPipe, IconComponent],
  template: `
    <article class="pp-rec" [class.done]="rec().done">
      <div class="d-flex align-items-start" style="gap: 14px">
        <button
          type="button"
          class="pp-check mt-1"
          [class.on]="rec().done"
          (click)="toggle.emit(rec().id)"
          [attr.aria-label]="rec().done ? 'Mark as not done' : 'Mark as done'"
        >
          <pp-icon [name]="rec().done ? 'check' : 'plus'" [size]="13" />
        </button>

        <div class="flex-grow-1" style="min-width: 0">
          <!-- Recommended action + estimated profit impact -->
          <div class="d-flex justify-content-between align-items-start" style="gap: 16px">
            <h4>{{ rec().title }}</h4>
            <div class="pp-rec__impact">
              <div class="v">+{{ rec().estimatedMonthlyImpact | money: currency() : 0 }}</div>
              <div class="pp-label">est. per month</div>
            </div>
          </div>

          <!-- Difficulty + priority, always in that order -->
          <div class="pp-rec__meta mt-2">
            <span class="pp-badge" [class]="'pp-badge ' + rec().priority">
              <pp-icon name="chevrons-up" [size]="11" />{{ priorityText }} priority
            </span>
            <span class="pp-badge" [class]="'pp-badge ' + rec().difficulty">
              <pp-icon [name]="difficultyIcon" [size]="11" />{{ rec().difficulty }} to do
            </span>
            @if (share() > 0) {
              <span class="pp-label">{{ share() }}% of the total lift</span>
            }
          </div>

          <p class="pp-body mt-3">{{ rec().why }}</p>

          <!-- The next action: the point of the card, on its own surface -->
          <div class="pp-rec__action mt-3">
            <pp-icon name="arrow-up-right" [size]="15" style="color: var(--pp-brand-ink)" />
            <div>
              <div class="k">Next action</div>
              {{ rec().action }}
            </div>
          </div>

          @if (rec().assumptions.length) {
            <details class="mt-3">
              <summary><pp-icon name="chevron-right" [size]="13" /> Assumptions behind this estimate</summary>
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
  /** Total of every recommendation's impact, for the "share of the lift" line. */
  totalImpact = input(0);
  toggle = output<string>();

  get priorityText(): string {
    return priorityLabel(this.rec().priority);
  }

  get difficultyIcon(): string {
    return DIFFICULTY_ICONS[this.rec().difficulty as keyof typeof DIFFICULTY_ICONS] ?? 'signal-medium';
  }

  share(): number {
    const total = this.totalImpact();
    return total > 0 ? Math.round((this.rec().estimatedMonthlyImpact / total) * 100) : 0;
  }
}
