import { Routes } from '@angular/router';
import { hasAnalysisGuard } from './core/state/has-analysis.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/landing/landing.component').then((m) => m.LandingComponent), title: 'ProfitPath — How much should you charge?' },
  { path: 'analyze', loadComponent: () => import('./pages/analyze/analyze.component').then((m) => m.AnalyzeComponent), title: 'Calculate my price — ProfitPath' },
  { path: 'results', canActivate: [hasAnalysisGuard], loadComponent: () => import('./pages/results/results.component').then((m) => m.ResultsComponent), title: 'Your pricing — ProfitPath' },
  { path: 'roadmap', canActivate: [hasAnalysisGuard], loadComponent: () => import('./pages/roadmap/roadmap.component').then((m) => m.RoadmapComponent), title: 'Your Profit Roadmap — ProfitPath' },
  { path: '**', redirectTo: '' },
];
