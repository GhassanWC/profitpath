import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

/**
 * Formatting pipes.
 *
 * These are impure on purpose. A pure pipe memoises on its arguments, so after
 * a language change it would keep rendering the previous locale's grouping and
 * currency placement — the figure beside a translated sentence would disagree
 * with the same figure inside it. Threading the locale through as an extra
 * argument would fix that too, but it repeats the same noise at fifty-odd call
 * sites. The work here is one `Intl.NumberFormat` call on a value the template
 * already holds: the same cost profile as the `t()` method the components
 * already call during change detection.
 *
 * The decimal rule is the engine's, so a figure rendered beside engine prose
 * rounds the way that prose rounds.
 */
const engineDecimals = (value: number): number => (Math.abs(value) >= 1000 ? 0 : 2);

@Pipe({ name: 'money', standalone: true, pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(value: number | null | undefined, currency = 'USD', decimals?: number): string {
    if (value === null || value === undefined || !isFinite(value)) return '—';
    return this.i18n.money(value, currency, decimals ?? engineDecimals(value));
  }
}

@Pipe({ name: 'pct', standalone: true, pure: false })
export class PctPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(fraction: number | null | undefined, decimals = 1): string {
    if (fraction === null || fraction === undefined || !isFinite(fraction)) return '—';
    return this.i18n.pct(fraction, decimals);
  }
}

@Pipe({ name: 'signed', standalone: true, pure: false })
export class SignedPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(value: number | null | undefined, currency = 'USD'): string {
    if (value === null || value === undefined || !isFinite(value)) return '—';
    const s = this.i18n.money(Math.abs(value), currency, 0);
    return value >= 0 ? `+${s}` : `−${s}`;
  }
}
