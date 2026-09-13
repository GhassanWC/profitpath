import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AnalysisStore } from './core/state/analysis.store';

@Component({
  selector: 'pp-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="pp-header">
      <div class="pp-container">
        <div class="pp-header-pill">
          <a routerLink="/" class="pp-logo">
            <svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#0f766e"/><path d="M14 44 L26 30 L36 38 L50 20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="50" cy="20" r="5" fill="#a7f3d0"/></svg>
            ProfitPath
          </a>
          <nav class="pp-nav d-none d-sm-block">
            <a routerLink="/analyze" routerLinkActive="active">Calculator</a>
            @if (store.pricing()) {
              <a routerLink="/results" routerLinkActive="active">Results</a>
              <a routerLink="/roadmap" routerLinkActive="active">Roadmap</a>
            }
          </nav>
          <a routerLink="/analyze" class="btn btn-pp btn-sm">Calculate my price</a>
        </div>
      </div>
    </header>

    <main>
      <router-outlet />
    </main>

    <footer class="pp-footer">
      <div class="pp-container d-flex flex-wrap justify-content-between gap-3">
        <div>© {{ year }} ProfitPath · Estimates based on your inputs, not financial advice or a guarantee of results.</div>
        <div>All calculations are deterministic and explainable.</div>
      </div>
    </footer>
  `,
})
export class AppComponent {
  readonly store = inject(AnalysisStore);
  readonly year = new Date().getFullYear();
}
