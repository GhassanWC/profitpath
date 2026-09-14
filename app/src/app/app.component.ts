import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AnalysisStore } from './core/state/analysis.store';
import { IconComponent } from './shared/icon.component';
import { I18nService } from './shared/i18n.service';
import { LanguagePickerComponent } from './shared/language-picker.component';

@Component({
  selector: 'pp-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, LanguagePickerComponent],
  template: `
    <header class="pp-header">
      <div class="pp-container">
        <div class="pp-header-pill">
          <a routerLink="/" class="pp-logo">
            <!-- A ruled square, drawn at the same weight as every other rule. -->
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <rect x="0.8" y="0.8" width="30.4" height="30.4" fill="none" stroke="currentColor" stroke-width="1.4" />
              <path d="M6 23l7-8 5 4 8-12" fill="none" stroke="var(--pp-brand)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="26" cy="7" r="2.4" fill="var(--pp-brand)" />
            </svg>
            ProfitPath
          </a>
          <nav class="pp-nav d-none d-sm-flex">
            <a routerLink="/analyze" routerLinkActive="active"><pp-icon name="calculator" /> {{ t('nav.calculator') }}</a>
            @if (store.pricing()) {
              <a routerLink="/results" routerLinkActive="active"><pp-icon name="chart-column" /> {{ t('nav.results') }}</a>
              <a routerLink="/roadmap" routerLinkActive="active"><pp-icon name="map" /> {{ t('nav.roadmap') }}</a>
            }
          </nav>
          <div class="d-flex align-items-center gap-2">
            <pp-language-picker />
            <a routerLink="/analyze" class="btn btn-pp btn-sm">{{ t('nav.cta') }} <pp-icon name="arrow-right" class="pp-icon-flip" [size]="14" /></a>
          </div>
        </div>
      </div>
    </header>

    <main>
      <router-outlet />
    </main>

    <footer class="pp-footer">
      <div class="pp-container d-flex flex-wrap justify-content-between gap-3">
        <div>{{ t('footer.legal', { year }) }}</div>
        <div>{{ t('footer.deterministic') }}</div>
      </div>
    </footer>
  `,
})
export class AppComponent {
  readonly store = inject(AnalysisStore);
  readonly t = inject(I18nService).t;
  readonly year = new Date().getFullYear();

}
