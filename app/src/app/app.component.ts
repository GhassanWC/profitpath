import { Component, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
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

  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);

  /**
   * The landing page is the one screen on warm paper rather than the glass
   * wash, and the header and footer are shared with the working screens — so
   * the route, not the page component, has to say which surface is showing.
   * The flag goes on <html> so the fixed page background changes with it.
   */
  private readonly onLanding = signal(this.isLanding(this.router.url));

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.onLanding.set(this.isLanding(e.urlAfterRedirects)));

    effect(() => {
      this.doc.documentElement.classList.toggle('pp-shell--paper', this.onLanding());
    });
  }

  private isLanding(url: string): boolean {
    return url === '/' || url.startsWith('/?') || url.startsWith('/#');
  }
}
