import { Injectable, computed, signal } from '@angular/core';
import { DEFAULT_LOCALE, LOCALES, MESSAGES, Msg, Params, createTranslator, localeDef, matchLocale } from '../core/i18n';

const STORAGE_KEY = 'profitpath.locale.v1';

/**
 * The app's current language.
 *
 * `t` is a plain method rather than a pipe on purpose: it reads the `locale`
 * signal, so every template that calls it registers a dependency and re-renders
 * when the language changes. A *pure* pipe would memoise on its input key and
 * never re-run; an impure one would run on every check. This is both correct and
 * cheap.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly locales = LOCALES;
  readonly locale = signal(DEFAULT_LOCALE);

  private readonly translator = computed(() => createTranslator(this.locale(), MESSAGES));
  readonly def = computed(() => localeDef(this.locale()));
  readonly dir = computed(() => this.def().dir);

  constructor() {
    this.locale.set(this.restore());
    this.apply();
  }

  /** Translate a key, or the first of several that the catalogue carries. */
  readonly t = (key: string | readonly string[], params?: Params): string => this.translator().t(key, params);

  /** True when the catalogue carries copy for a key — used to prefer it over engine English. */
  readonly has = (key: string | readonly string[]): boolean => this.translator().has(key);

  /** Translate with the plural form the locale needs for `count`. */
  readonly tp = (key: string, count: number, params?: Params): string => this.translator().tp(key, count, params);

  /** Translate a message the engine emitted, falling back to its own English prose. */
  readonly msg = (m: Msg | undefined, fallback: string): string => {
    if (!m) return fallback;
    return this.translator().has(m.key) ? this.translator().t(m.key, m.params) : fallback;
  };

  money(value: number, currency: string, decimals?: number): string {
    return this.translator().money(value, currency, decimals);
  }

  pct(fraction: number, decimals?: number): string {
    return this.translator().pct(fraction, decimals);
  }

  /** The noun for one unit of whatever is being sold, in the active language. */
  unit(businessType: string | null | undefined, plural = false): string {
    if (!businessType) return this.t(plural ? 'unit.generic.other' : 'unit.generic.one');
    return this.t([`unit.${businessType}.${plural ? 'other' : 'one'}`, `unit.generic.${plural ? 'other' : 'one'}`]);
  }

  setLocale(code: string): void {
    if (!LOCALES.some((l) => l.code === code)) return;
    this.locale.set(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* private browsing: the choice simply does not persist */
    }
    this.apply();
  }

  /** Mirrors the choice onto <html> so CSS logical properties and screen readers follow. */
  private apply(): void {
    if (typeof document === 'undefined') return;
    const d = this.def();
    document.documentElement.setAttribute('lang', d.code);
    document.documentElement.setAttribute('dir', d.dir);
  }

  private restore(): string {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && LOCALES.some((l) => l.code === saved)) return saved;
    } catch {
      /* ignore */
    }
    if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
    return matchLocale(navigator.languages ?? [navigator.language ?? DEFAULT_LOCALE]);
  }
}
