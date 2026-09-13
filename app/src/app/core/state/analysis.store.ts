import { Injectable, computed, effect, signal } from '@angular/core';
import {
  Answers,
  BusinessType,
  CostModel,
  PricingResult,
  ProfitRoadmap,
  buildRoadmap,
  computePricing,
  normalizeAnswers,
  questionGroupsFor,
} from '../engine';

interface PersistedState {
  offering: string;
  businessType: BusinessType | null;
  answers: Answers;
  completedIds: string[];
  complete: boolean;
}

const STORAGE_KEY = 'profitpath.analysis.v1';

/**
 * Single source of truth for the current analysis.
 * Pure engine functions are wrapped in computed signals so every page stays in sync.
 * Persists to sessionStorage so a refresh does not lose the user's work.
 */
@Injectable({ providedIn: 'root' })
export class AnalysisStore {
  readonly offering = signal('');
  readonly businessType = signal<BusinessType | null>(null);
  readonly answers = signal<Answers>({});
  readonly completedIds = signal<string[]>([]);
  /** True once the questionnaire has been finished at least once. */
  readonly complete = signal(false);

  readonly groups = computed(() => (this.businessType() ? questionGroupsFor(this.businessType()!) : []));

  readonly model = computed<CostModel | null>(() => {
    const t = this.businessType();
    if (!t || !this.complete()) return null;
    return normalizeAnswers(t, this.answers(), this.offering());
  });

  readonly pricing = computed<PricingResult | null>(() => {
    const m = this.model();
    return m ? computePricing(m) : null;
  });

  readonly roadmap = computed<ProfitRoadmap | null>(() => {
    const m = this.model();
    const p = this.pricing();
    return m && p ? buildRoadmap(m, p, { completedIds: this.completedIds() }) : null;
  });

  constructor() {
    this.restore();
    effect(() => this.persist());
  }

  start(offering: string, type: BusinessType) {
    const typeChanged = type !== this.businessType();
    this.offering.set(offering);
    this.businessType.set(type);
    if (typeChanged) {
      this.answers.set({});
      this.completedIds.set([]);
      this.complete.set(false);
    }
  }

  setAnswers(patch: Answers) {
    this.answers.update((a) => ({ ...a, ...patch }));
  }

  finish() {
    this.complete.set(true);
  }

  toggleCompleted(id: string) {
    this.completedIds.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  reset() {
    this.offering.set('');
    this.businessType.set(null);
    this.answers.set({});
    this.completedIds.set([]);
    this.complete.set(false);
  }

  /** Load a sample analysis (landing page "See an example"). */
  loadSample(offering: string, type: BusinessType, answers: Answers) {
    this.offering.set(offering);
    this.businessType.set(type);
    this.answers.set({ ...answers });
    this.completedIds.set([]);
    this.complete.set(true);
  }

  private persist() {
    const state: PersistedState = {
      offering: this.offering(),
      businessType: this.businessType(),
      answers: this.answers(),
      completedIds: this.completedIds(),
      complete: this.complete(),
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — in-memory only */
    }
  }

  private restore() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as PersistedState;
      this.offering.set(s.offering ?? '');
      this.businessType.set(s.businessType ?? null);
      this.answers.set(s.answers ?? {});
      this.completedIds.set(s.completedIds ?? []);
      this.complete.set(!!s.complete);
    } catch {
      /* ignore corrupt state */
    }
  }
}
