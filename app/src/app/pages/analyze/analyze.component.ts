import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  Answers,
  BUSINESS_TYPE_LIST,
  BusinessType,
  Detection,
  Question,
  QuestionGroup,
  businessTypeDef,
  detectBusinessType,
  validateGroup,
  visibleQuestions,
} from '../../core/engine';
import { AnalysisStore } from '../../core/state/analysis.store';

@Component({
  selector: 'pp-analyze',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="pp-container py-5">
      <div class="pp-narrow">
        <!-- Progress -->
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="pp-eyebrow">Step {{ stepIndex() + 1 }} of {{ totalSteps() }}</span>
          @if (stepIndex() > 0) {
            <span class="pp-muted" style="font-size: 0.85rem">{{ typeDef()?.icon }} {{ typeDef()?.label }} · {{ store.offering() }}</span>
          }
        </div>
        <div class="pp-progress mb-4"><div [style.width.%]="((stepIndex() + 1) / totalSteps()) * 100"></div></div>

        <!-- Step 0: what are you selling -->
        @if (stepIndex() === 0) {
          <div class="pp-card pp-fade">
            <h2 class="mb-1">What are you planning to sell?</h2>
            <p class="pp-muted mb-4">Describe it in your own words. We'll tailor the next questions to your kind of business.</p>
            <div class="pp-input-group mb-3">
              <input type="text" [value]="offering()" (input)="onOffering($any($event.target).value)" placeholder="e.g. iPhone 17 Pro, wedding photography, soy candles, online course…" autofocus />
            </div>

            @if (detection(); as d) {
              @if (d.confidence > 0) {
                <div class="pp-detect mb-4 pp-fade">
                  <span class="icon">{{ businessTypeDef(d.type).icon }}</span>
                  <div>
                    <div class="fw-semibold">Looks like: {{ businessTypeDef(d.type).label }}</div>
                    <div class="pp-muted" style="font-size: 0.85rem">{{ confidenceText(d) }} · Not right? Pick a type below.</div>
                  </div>
                </div>
              }
            }

            <div class="pp-eyebrow mb-2">Business type</div>
            <div class="pp-option-grid mb-4">
              @for (t of types; track t.type) {
                <button type="button" class="pp-type-card" [class.selected]="selectedType() === t.type" (click)="selectedType.set(t.type)">
                  <div style="font-size: 1.4rem">{{ t.icon }}</div>
                  <div class="fw-semibold mt-1">{{ t.label }}</div>
                  <small class="pp-muted">{{ t.description }}</small>
                </button>
              }
            </div>
            <div class="d-flex justify-content-end">
              <button class="btn btn-pp" [disabled]="!selectedType() || !offering().trim()" (click)="startQuestions()">Continue →</button>
            </div>
          </div>
        }

        <!-- Steps 1..N: question groups -->
        @if (currentGroup(); as group) {
          <form class="pp-card pp-fade" [formGroup]="form" (ngSubmit)="next()">
            <h2 class="mb-1">{{ group.title }}</h2>
            <p class="pp-muted mb-4">{{ group.intro }}</p>

            @for (q of visible(); track q.key) {
              <div class="mb-4">
                <label class="pp-q-label d-block" [for]="q.key">{{ q.label }}</label>
                <div class="pp-q-help">{{ q.help }}</div>

                @switch (q.type) {
                  @case ('select') {
                    <div class="pp-option-grid">
                      @for (o of q.options ?? []; track o.value) {
                        <button type="button" class="pp-option" [class.selected]="form.value[q.key] === o.value" (click)="setValue(q.key, o.value)">
                          <span>{{ o.label }} @if (o.hint) { <small>{{ o.hint }}</small> }</span>
                        </button>
                      }
                    </div>
                  }
                  @case ('multiselect') {
                    <div class="pp-option-grid">
                      @for (o of q.options ?? []; track o.value) {
                        <button type="button" class="pp-option" [class.selected]="isChecked(q.key, o.value)" (click)="toggleMulti(q.key, o.value)">
                          <span>{{ o.label }}</span>
                        </button>
                      }
                    </div>
                  }
                  @case ('currency') {
                    <div class="pp-input-group" [class.is-invalid]="errors()[q.key]">
                      <select [id]="q.key" [formControlName]="q.key">
                        @for (o of q.options ?? []; track o.value) {
                          <option [value]="o.value">{{ o.label }}</option>
                        }
                      </select>
                    </div>
                  }
                  @case ('text') {
                    <div class="pp-input-group" [class.is-invalid]="errors()[q.key]">
                      <input [id]="q.key" type="text" [formControlName]="q.key" [placeholder]="q.placeholder ?? ''" />
                    </div>
                  }
                  @default {
                    <div class="pp-input-group" [class.is-invalid]="errors()[q.key]">
                      @if (q.money) {
                        <span class="affix pre">{{ currency() }}</span>
                      }
                      <input [id]="q.key" type="number" inputmode="decimal" step="any" [attr.min]="q.min ?? null" [formControlName]="q.key" [placeholder]="q.placeholder ?? ''" />
                      @if (q.suffix) {
                        <span class="affix">{{ q.suffix }}</span>
                      }
                    </div>
                  }
                }
                @if (errors()[q.key]) {
                  <div class="pp-error">{{ errors()[q.key] }}</div>
                }
              </div>
            }

            <div class="d-flex justify-content-between align-items-center mt-2">
              <button type="button" class="btn btn-pp-ghost" (click)="back()">← Back</button>
              <button type="submit" class="btn btn-pp">{{ isLast() ? 'Calculate my price ✨' : 'Continue →' }}</button>
            </div>
          </form>
          <p class="pp-notice mt-3 text-center">Leave a cost at 0 if it doesn't apply. You can change every number later in the what-if simulator.</p>
        }
      </div>
    </div>
  `,
})
export class AnalyzeComponent {
  readonly store = inject(AnalysisStore);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly types = BUSINESS_TYPE_LIST;
  readonly businessTypeDef = businessTypeDef;

  readonly offering = signal(this.store.offering());
  readonly selectedType = signal<BusinessType | null>(this.store.businessType());
  readonly detection = signal<Detection | null>(null);
  /** 0 = "what are you selling"; 1..N = question groups */
  readonly stepIndex = signal(0);
  readonly errors = signal<Record<string, string>>({});
  /** Live form values, mirrored into a signal so visibility + validation stay reactive. */
  private readonly formValues = signal<Answers>({});

  form: FormGroup = this.fb.group({});
  private sub?: Subscription;

  readonly groups = computed<QuestionGroup[]>(() => this.store.groups());
  readonly totalSteps = computed(() => this.groups().length + 1);
  readonly currentGroup = computed<QuestionGroup | null>(() => this.groups()[this.stepIndex() - 1] ?? null);
  readonly isLast = computed(() => this.stepIndex() === this.groups().length);
  readonly typeDef = computed(() => (this.store.businessType() ? businessTypeDef(this.store.businessType()!) : null));
  readonly mergedAnswers = computed<Answers>(() => ({ ...this.store.answers(), ...this.formValues() }));
  readonly visible = computed<Question[]>(() => {
    const g = this.currentGroup();
    return g ? visibleQuestions(g, this.mergedAnswers()) : [];
  });
  readonly currency = computed(() => (this.mergedAnswers()['currency'] as string) || 'USD');

  constructor() {
    effect(() => {
      const g = this.currentGroup();
      if (g) this.buildForm(g);
    }, { allowSignalWrites: true });
    inject(DestroyRef).onDestroy(() => this.sub?.unsubscribe());
  }

  onOffering(v: string) {
    this.offering.set(v);
    const d = v.trim().length >= 3 ? detectBusinessType(v) : null;
    this.detection.set(d);
    if (d && d.confidence > 0) this.selectedType.set(d.type);
  }

  confidenceText(d: Detection): string {
    return d.confidence >= 0.7 ? 'High confidence' : d.confidence >= 0.4 ? 'Fairly confident' : 'Best guess';
  }

  startQuestions() {
    const t = this.selectedType();
    if (!t) return;
    this.store.start(this.offering().trim(), t);
    this.stepIndex.set(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private buildForm(group: QuestionGroup) {
    const saved = this.store.answers();
    const controls: Record<string, unknown> = {};
    for (const q of group.questions) {
      let v = saved[q.key];
      if ((v === undefined || v === null) && (q.type === 'currency' || q.type === 'select') && typeof q.defaultValue === 'string') v = q.defaultValue;
      if ((v === undefined || v === null) && q.type === 'multiselect') v = [];
      controls[q.key] = [v ?? null];
    }
    this.sub?.unsubscribe();
    this.form = this.fb.group(controls);
    this.formValues.set(this.form.value as Answers);
    this.errors.set({});
    this.sub = this.form.valueChanges.subscribe((v) => this.formValues.set(v as Answers));
  }

  setValue(key: string, value: string) {
    this.form.get(key)?.setValue(value);
  }

  isChecked(key: string, value: string): boolean {
    const v = this.form.value[key];
    return Array.isArray(v) && v.includes(value);
  }

  toggleMulti(key: string, value: string) {
    const v: string[] = Array.isArray(this.form.value[key]) ? [...this.form.value[key]] : [];
    const i = v.indexOf(value);
    if (i >= 0) v.splice(i, 1);
    else v.push(value);
    this.form.get(key)?.setValue(v);
  }

  next() {
    const g = this.currentGroup();
    if (!g) return;
    const merged = this.mergedAnswers();
    const errs = validateGroup(g, merged);
    this.errors.set(errs);
    if (Object.keys(errs).length) return;
    // Only persist the visible questions of this group; coerce numerics.
    const patch: Answers = {};
    for (const q of visibleQuestions(g, merged)) {
      const v = this.form.value[q.key];
      patch[q.key] = v === '' ? null : q.type === 'number' || q.type === 'percent' || q.type === 'hours' ? (v === null || v === undefined ? null : Number(v)) : v;
    }
    this.store.setAnswers(patch);
    if (this.isLast()) {
      this.store.finish();
      this.router.navigate(['/results']);
      return;
    }
    this.stepIndex.update((i) => i + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  back() {
    this.stepIndex.update((i) => Math.max(0, i - 1));
  }
}
