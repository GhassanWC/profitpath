import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AnalysisStore } from './core/state/analysis.store';
import { IconComponent } from './shared/icon.component';

@Component({
  selector: 'pp-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <header class="pp-header">
      <div class="pp-container">
        <div class="pp-header-pill">
          <a routerLink="/" class="pp-logo">
            <!-- The mark carries the brand gradient the CTA and active state use. -->
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <defs>
                <linearGradient id="ppmark" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stop-color="#2f6bf6" />
                  <stop offset="1" stop-color="#6c5ce7" />
                </linearGradient>
              </defs>
              <rect width="64" height="64" rx="14" fill="url(#ppmark)" />
              <path d="M14 44 L26 30 L36 38 L50 20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="50" cy="20" r="5" fill="#dbe7ff" />
            </svg>
            ProfitPath
          </a>
          <nav class="pp-nav d-none d-sm-flex">
            <a routerLink="/analyze" routerLinkActive="active"><pp-icon name="calculator" /> Calculator</a>
            @if (store.pricing()) {
              <a routerLink="/results" routerLinkActive="active"><pp-icon name="chart-column" /> Results</a>
              <a routerLink="/roadmap" routerLinkActive="active"><pp-icon name="map" /> Roadmap</a>
            }
          </nav>
          <a routerLink="/analyze" class="btn btn-pp btn-sm">Calculate my price <pp-icon name="arrow-right" [size]="14" /></a>
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
