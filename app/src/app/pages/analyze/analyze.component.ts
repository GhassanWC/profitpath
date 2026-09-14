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
import { IconComponent } from '../../shared/icon.component';
import { I18nService } from '../../shared/i18n.service';
import { BUSINESS_TYPE_ICONS } from '../../shared/icons';

/** Cycled over the question groups, whose count varies by business type. */
const STEP_ICONS = ['users', 'receipt', 'megaphone', 'wallet', 'clock', 'target'];

@Component({
  selector: 'pp-analyze',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  template: `
    <div class="pp-container py-5">
      <div class="pp-narrow">
        <!-- A consultation, not a form: the segments show how far it has run and
             what this step is about, and the context chip shows what we inferred. -->
        <div class="pp-steps-meta">
          <span class="now">
            <pp-icon [name]="stepIcon()" [size]="14" />
            {{ stepTitle() }}
          </span>
          <span>{{ t('analyze.step', { current: stepIndex() + 1, total: totalSteps() }) }}</span>
        </div>
        <div class="pp-steps mb-3">
          @for (s of stepMarks(); track $index) {
            <span class="seg" [class.done]="$index < stepIndex()" [class.current]="$index === stepIndex()"></span>
          }
        </div>
        @if (stepIndex() > 0 && typeDef(); as td) {
          <div class="d-flex flex-wrap gap-2 mb-3">
            <span class="pp-chip"><pp-icon [name]="typeIcon(td.type)" [size]="13" /> {{ t('businessType.' + td.type + '.label') }}</span>
            <span class="pp-chip">{{ store.offering() }}</span>
          </div>
        }

        <!-- Step 0: what are you selling -->
        @if (stepIndex() === 0) {
          <div class="pp-card pp-card--primary pp-fade">
            <h2 class="mb-1">{{ t('analyze.q0.title') }}</h2>
            <p class="pp-body mb-4">{{ t('analyze.q0.intro') }}</p>
            <div class="pp-input-group mb-3">
              <span class="affix pre"><pp-icon name="search" [size]="15" /></span>
              <input type="text" [value]="offering()" (input)="onOffering($any($event.target).value)" [attr.placeholder]="t('analyze.q0.placeholder')" autofocus />
            </div>

            @if (detection(); as d) {
              @if (d.confidence > 0) {
                <div class="pp-detect mb-4 pp-fade">
                  <span class="pp-icon-badge"><pp-icon [name]="typeIcon(d.type)" [size]="17" /></span>
                  <div>
                    <div class="title">{{ t('analyze.detect.title', { label: t('businessType.' + d.type + '.label') }) }}</div>
                    <div class="sub">{{ t('analyze.detect.sub', { confidence: t(confidenceKey(d)) }) }}</div>
                  </div>
                </div>
              }
            }

            <div class="pp-subhead mb-2">{{ t('analyze.businessType') }}</div>
            <div class="pp-option-grid mb-4">
              @for (bt of types; track bt.type) {
                <button type="button" class="pp-type-card" [class.selected]="selectedType() === bt.type" (click)="selectedType.set(bt.type)">
                  <span class="pp-icon-badge"><pp-icon [name]="typeIcon(bt.type)" [size]="17" /></span>
                  <span>
                    <span class="name">{{ t('businessType.' + bt.type + '.label') }}</span>
                    <small>{{ t('businessType.' + bt.type + '.description') }}</small>
                  </span>
                </button>
              }
            </div>
            <div class="d-flex justify-content-end">
              <button class="btn btn-pp" [disabled]="!selectedType() || !offering().trim()" (click)="startQuestions()">
                {{ t('analyze.continue') }} <pp-icon name="arrow-right" class="pp-icon-flip" [size]="14" />
              </button>
            </div>
          </div>
        }

        <!-- Steps 1..N: question groups -->
        @if (currentGroup(); as group) {
          <form class="pp-card pp-card--primary pp-fade" [formGroup]="form" (ngSubmit)="next()">
            <h2 class="mb-1">{{ groupTitle(group) }}</h2>
            <p class="pp-body mb-4">{{ groupIntro(group) }}</p>

            @for (q of visible(); track q.key) {
              <div class="pp-q">
                <label class="pp-q-label d-block" [for]="q.key">{{ qText(q, 'label') }}</label>
                <div class="pp-q-help"><pp-icon name="lightbulb" [size]="13" /><span>{{ qText(q, 'help') }}</span></div>

                @switch (q.type) {
                  @case ('select') {
                    <div class="pp-option-grid">
                      @for (o of q.options ?? []; track o.value) {
                        <button type="button" class="pp-option" [class.selected]="form.value[q.key] === o.value" (click)="setValue(q.key, o.value)">
                          <span>{{ optText(q, o, 'label') }} @if (o.hint) { <small>{{ optText(q, o, 'hint') }}</small> }</span>
                          <pp-icon class="tick" name="check" [size]="14" />
                        </button>
                      }
                    </div>
                  }
                  @case ('multiselect') {
                    <div class="pp-option-grid">
                      @for (o of q.options ?? []; track o.value) {
                        <button type="button" class="pp-option" [class.selected]="isChecked(q.key, o.value)" (click)="toggleMulti(q.key, o.value)">
                          <span>{{ optText(q, o, 'label') }}</span>
                          <pp-icon class="tick" name="check" [size]="14" />
                        </button>
                      }
                    </div>
                  }
                  @case ('currency') {
                    <div class="pp-input-group" [class.is-invalid]="errors()[q.key]">
                      <select [id]="q.key" [formControlName]="q.key">
                        @for (o of q.options ?? []; track o.value) {
                          <option [value]="o.value">{{ optText(q, o, 'label') }}</option>
                        }
                      </select>
                    </div>
                  }
                  @case ('text') {
                    <div class="pp-input-group" [class.is-invalid]="errors()[q.key]">
                      <input [id]="q.key" type="text" [formControlName]="q.key" [placeholder]="qText(q, 'placeholder')" />
                    </div>
                  }
                  @default {
                    <div class="pp-input-group" [class.is-invalid]="errors()[q.key]">
                      @if (q.money) {
                        <span class="affix pre">{{ currency() }}</span>
                      }
                      <input [id]="q.key" type="number" inputmode="decimal" step="any" [attr.min]="q.min ?? null" [formControlName]="q.key" [placeholder]="qText(q, 'placeholder')" />
                      @if (q.suffix) {
                        <span class="affix">{{ qText(q, 'suffix') }}</span>
                      }
                    </div>
                  }
                }
                @if (errors()[q.key]) {
                  <div class="pp-error"><pp-icon name="triangle-alert" [size]="13" />{{ errors()[q.key] }}</div>
                }
              </div>
            }

            <div class="d-flex justify-content-between align-items-center mt-4">
              <button type="button" class="btn btn-pp-ghost" (click)="back()"><pp-icon name="arrow-left" class="pp-icon-flip" [size]="14" /> {{ t('analyze.back') }}</button>
              <button type="submit" class="btn btn-pp" [class.btn-pp-hero]="isLast()">
                {{ isLast() ? t('analyze.finish') : t('analyze.continue') }}
                <pp-icon [name]="isLast() ? 'sparkles' : 'arrow-right'" [class.pp-icon-flip]="!isLast()" [size]="14" />
              </button>
            </div>
          </form>
          <div class="mt-3 d-flex justify-content-center">
            <span class="pp-notice"><pp-icon name="info" [size]="13" /> {{ t('analyze.notice') }}</span>
          </div>
        }
      </div>
    </div>
  `,
})
export class AnalyzeComponent {
  readonly store = inject(AnalysisStore);
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
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

  /** One segment per step, so progress reads as a conversation with a shape. */
  readonly stepMarks = computed(() => new Array(this.totalSteps()));
  readonly stepTitle = computed(() => {
    const g = this.currentGroup();
    return g ? this.groupTitle(g) : this.t('analyze.step0.title');
  });
  readonly stepIcon = computed(() => (this.stepIndex() === 0 ? 'square-pen' : STEP_ICONS[(this.stepIndex() - 1) % STEP_ICONS.length]));

  typeIcon(type: string): string {
    return BUSINESS_TYPE_ICONS[type as keyof typeof BUSINESS_TYPE_ICONS] ?? 'package';
  }

  confidenceKey(d: Detection): string {
    return d.confidence >= 0.7 ? 'analyze.confidence.high' : d.confidence >= 0.4 ? 'analyze.confidence.fair' : 'analyze.confidence.guess';
  }

  /**
   * Question and group copy is static in the engine, so the catalogue holds it
   * directly. Where a string differs by business type the key carries the type;
   * where it differs only by the unit noun, one template serves every type.
   */
  private scoped(prefix: string, key: string, field: string): string[] {
    const type = this.store.businessType() ?? this.selectedType();
    return type ? [`${prefix}.${type}.${key}.${field}`, `${prefix}.${key}.${field}`] : [`${prefix}.${key}.${field}`];
  }

  private unitParams(): Record<string, string> {
    const type = this.store.businessType() ?? this.selectedType() ?? 'generic';
    return { unit: `unit.${type}.one`, units: `unit.${type}.other` };
  }

  qText(q: Question, field: 'label' | 'help' | 'suffix' | 'placeholder'): string {
    const fallback = (q[field] as string | undefined) ?? '';
    const keys = this.scoped('question', q.key, field);
    return this.i18n.has(keys) ? this.t(keys, this.unitParams()) : fallback;
  }

  optText(q: Question, o: { value: string; label: string; hint?: string }, field: 'label' | 'hint'): string {
    const fallback = (field === 'label' ? o.label : o.hint) ?? '';
    const keys = this.scoped('option', `${q.key}.${o.value}`, field);
    return this.i18n.has(keys) ? this.t(keys, this.unitParams()) : fallback;
  }

  groupTitle(g: QuestionGroup): string {
    const keys = this.scoped('group', g.id, 'title');
    return this.i18n.has(keys) ? this.t(keys, this.unitParams()) : g.title;
  }

  groupIntro(g: QuestionGroup): string {
    const keys = this.scoped('group', g.id, 'intro');
    return this.i18n.has(keys) ? this.t(keys, this.unitParams()) : g.intro;
  }

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
