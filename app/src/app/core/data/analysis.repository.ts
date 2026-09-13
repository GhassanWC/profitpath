import { Injectable } from '@angular/core';
import { BusinessAnalysis } from '../engine';

/**
 * Persistence boundary. Not wired into the UI in V1 (auth/save deferred), but the
 * contract is fixed so a Firestore implementation can be dropped in later:
 *   users/{uid}/analyses/{id}  ->  BusinessAnalysis
 */
export interface AnalysisRepository {
  list(): Promise<BusinessAnalysis[]>;
  get(id: string): Promise<BusinessAnalysis | null>;
  save(analysis: BusinessAnalysis): Promise<void>;
  remove(id: string): Promise<void>;
}

const KEY = 'profitpath.analyses.v1';

@Injectable({ providedIn: 'root' })
export class LocalStorageAnalysisRepository implements AnalysisRepository {
  async list(): Promise<BusinessAnalysis[]> {
    return this.read();
  }
  async get(id: string): Promise<BusinessAnalysis | null> {
    return this.read().find((a) => a.id === id) ?? null;
  }
  async save(analysis: BusinessAnalysis): Promise<void> {
    const all = this.read().filter((a) => a.id !== analysis.id);
    all.unshift({ ...analysis, updatedAt: new Date().toISOString() });
    this.write(all);
  }
  async remove(id: string): Promise<void> {
    this.write(this.read().filter((a) => a.id !== id));
  }
  private read(): BusinessAnalysis[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '[]');
    } catch {
      return [];
    }
  }
  private write(all: BusinessAnalysis[]) {
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {
      /* ignore */
    }
  }
}
