import { Component, inject, input, output } from '@angular/core';
import { Recommendation } from '../core/engine';
import { I18nService } from './i18n.service';
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
          [attr.aria-label]="rec().done ? t('roadmap.markNotDone') : t('roadmap.markDone')"
        >
          <pp-icon [name]="rec().done ? 'check' : 'plus'" [size]="13" />
        </button>

        <div class="flex-grow-1" style="min-width: 0">
          <!-- Recommended action + estimated profit impact -->
          <div class="d-flex justify-content-between align-items-start" style="gap: 16px">
            <h4>{{ title }}</h4>
            <div class="pp-rec__impact">
              <div class="v">+{{ rec().estimatedMonthlyImpact | money: currency() : 0 }}</div>
              <div class="pp-label">{{ t('roadmap.estPerMonth') }}</div>
            </div>
          </div>

          <!-- Why, immediately under the title it explains — a reader gets the
               reason in the same glance as the headline, before the metadata
               row asks for a second look. -->
          <p class="pp-body mt-1 mb-0">{{ why }}</p>

          <!-- Difficulty + priority, always in that order -->
          <div class="pp-rec__meta mt-2">
            <span class="pp-badge" [class]="'pp-badge ' + rec().priority">
              <pp-icon name="chevrons-up" [size]="11" />{{ t('roadmap.priority', { priority: priorityText }) }}
            </span>
            <span class="pp-badge" [class]="'pp-badge ' + rec().difficulty">
              <pp-icon [name]="difficultyIcon" [size]="11" />{{ t('roadmap.difficulty', { difficulty: t('difficulty.' + rec().difficulty) }) }}
            </span>
            @if (share() > 0) {
              <span class="pp-label">{{ t('roadmap.shareOfLift', { share: share() }) }}</span>
            }
          </div>

          <!-- The next action: the point of the card, on its own surface -->
          <div class="pp-rec__action mt-3">
            <pp-icon name="arrow-up-right" class="pp-icon-flip" [size]="15" style="color: var(--pp-brand-ink)" />
            <div>
              <div class="k">{{ t('roadmap.nextAction') }}</div>
              {{ action }}
            </div>
          </div>

          @if (rec().assumptions.length) {
            <details class="mt-3">
              <summary><pp-icon name="chevron-right" class="pp-icon-flip" [size]="13" /> {{ t('roadmap.assumptions') }}</summary>
              <ul>
                @for (a of assumptions; track $index) {
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
  private readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  rec = input.required<Recommendation>();
  currency = input.required<string>();
  /** Total of every recommendation's impact, for the "share of the lift" line. */
  totalImpact = input(0);
  toggle = output<string>();

  get priorityText(): string {
    return this.t(`priority.${this.rec().priority}`);
  }

  /** Each field prefers the translated twin and falls back to the engine's English. */
  get title(): string {
    return this.i18n.msg(this.rec().i18n?.title, this.rec().title);
  }
  get why(): string {
    return this.i18n.msg(this.rec().i18n?.why, this.rec().why);
  }
  get action(): string {
    return this.i18n.msg(this.rec().i18n?.action, this.rec().action);
  }
  get assumptions(): string[] {
    const r = this.rec();
    return r.assumptions.map((a, i) => this.i18n.msg(r.i18n?.assumptions[i], a));
  }

  get difficultyIcon(): string {
    return DIFFICULTY_ICONS[this.rec().difficulty as keyof typeof DIFFICULTY_ICONS] ?? 'signal-medium';
  }

  share(): number {
    const total = this.totalImpact();
    return total > 0 ? Math.round((this.rec().estimatedMonthlyImpact / total) * 100) : 0;
  }
}
