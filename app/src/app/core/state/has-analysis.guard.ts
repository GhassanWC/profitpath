import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AnalysisStore } from './analysis.store';

/** Results and roadmap pages need a completed analysis; otherwise send the user to the questionnaire. */
export const hasAnalysisGuard: CanActivateFn = () => {
  const store = inject(AnalysisStore);
  const router = inject(Router);
  return store.pricing() ? true : router.createUrlTree(['/analyze']);
};
