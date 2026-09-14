/**
 * Framework-free translation core. No Angular imports, so the engine-adjacent
 * code, the Angular app and the dependency-free preview can all share it.
 *
 * Message syntax
 * --------------
 *   {name}            the parameter, as-is
 *   {name|money}      currency, 2dp below 100 and 0dp above — the engine's own rule
 *   {name|money0}     currency, no decimals
 *   {name|money2}     currency, always 2dp
 *   {name|pct}        percentage, 1dp        {name|pct0}  percentage, no decimals
 *   {name|num}        a plain number, localised
 *   {name|plain}      the value untouched — for the few places the engine prints a
 *                     bare number and the catalogue has to reproduce it exactly
 *   {name|t}          the parameter is itself a message key: translate it
 *
 * The currency comes from `params.cur`, falling back to the translator's default.
 * A missing parameter renders as the empty string rather than "undefined" — a gap
 * in copy should look like a gap, not like a bug leaking through.
 *
 * Plurals go through Intl.PluralRules: pass `count` and give the catalogue keys
 * `<key>.one`, `<key>.other` and whichever of zero/two/few/many the locale needs.
 * Arabic uses all six; English and the Romance locales use two.
 */

export interface LocaleDef {
  /** BCP-47 code, and the key into MESSAGES. */
  code: string;
  /** The language's own name for itself — never translated. */
  label: string;
  /** English name, for the picker's secondary line and for aria text. */
  englishLabel: string;
  dir: 'ltr' | 'rtl';
  /**
   * The locale handed to Intl. Arabic is pinned to Latin digits: Gulf financial
   * interfaces overwhelmingly use them, and mixing Arabic-Indic digits into
   * tabular figures breaks the alignment the design depends on.
   */
  intl: string;
}

export const LOCALES: LocaleDef[] = [
  { code: 'en', label: 'English', englishLabel: 'English', dir: 'ltr', intl: 'en' },
  { code: 'ar', label: 'العربية', englishLabel: 'Arabic', dir: 'rtl', intl: 'ar-u-nu-latn' },
  { code: 'fr', label: 'Français', englishLabel: 'French', dir: 'ltr', intl: 'fr' },
  { code: 'es', label: 'Español', englishLabel: 'Spanish', dir: 'ltr', intl: 'es' },
];

export const DEFAULT_LOCALE = 'en';

export type Messages = Record<string, string>;
export type Params = Record<string, string | number | null | undefined>;

/** A translatable string the engine emitted: a key plus the values it needs. */
export interface Msg {
  key: string;
  params?: Params;
}

export function localeDef(code: string): LocaleDef {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}

/** Picks the best supported locale for a browser language list. */
export function matchLocale(preferred: readonly string[]): string {
  for (const want of preferred) {
    const base = want.toLowerCase().split('-')[0];
    const hit = LOCALES.find((l) => l.code === base);
    if (hit) return hit.code;
  }
  return DEFAULT_LOCALE;
}

function formatMoney(value: number, currency: string, intl: string, decimals: number): string {
  try {
    return new Intl.NumberFormat(intl, {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(decimals)}`;
  }
}

function formatNumber(value: number, intl: string, decimals?: number): string {
  try {
    return new Intl.NumberFormat(intl, decimals === undefined ? {} : { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  } catch {
    return String(value);
  }
}

function formatPct(fraction: number, intl: string, decimals: number): string {
  try {
    return new Intl.NumberFormat(intl, { style: 'percent', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(fraction);
  } catch {
    return `${(fraction * 100).toFixed(decimals)}%`;
  }
}

export interface Translator {
  readonly locale: string;
  readonly def: LocaleDef;
  /** Translate a key, or the first key that exists when given several. */
  t(key: string | readonly string[], params?: Params): string;
  /** Translate with a plural form chosen from `count`. */
  tp(key: string, count: number, params?: Params): string;
  /** True when the catalogue actually carries this key. */
  has(key: string): boolean;
  money(value: number, currency: string, decimals?: number): string;
  pct(fraction: number, decimals?: number): string;
  num(value: number, decimals?: number): string;
}

export function createTranslator(locale: string, messages: Record<string, Messages>, defaultCurrency = 'USD'): Translator {
  const def = localeDef(locale);
  const table = messages[def.code] ?? {};
  const fallback = messages[DEFAULT_LOCALE] ?? {};
  let plurals: Intl.PluralRules | null = null;
  try {
    plurals = new Intl.PluralRules(def.intl);
  } catch {
    plurals = null;
  }

  const lookup = (key: string): string | undefined => table[key] ?? fallback[key];

  const render = (template: string, params: Params | undefined): string =>
    template.replace(/\{(\w+)(?:\|(\w+))?\}/g, (_whole, name: string, fmt?: string) => {
      const value = params?.[name];
      if (value === undefined || value === null) return '';
      const currency = String(params?.['cur'] ?? defaultCurrency);
      const n = typeof value === 'number' ? value : Number(value);
      switch (fmt) {
        case 'money':
          return formatMoney(n, currency, def.intl, Math.abs(n) < 100 ? 2 : 0);
        case 'money0':
          return formatMoney(n, currency, def.intl, 0);
        case 'money2':
          return formatMoney(n, currency, def.intl, 2);
        case 'pct':
          return formatPct(n, def.intl, 1);
        case 'pct0':
          return formatPct(n, def.intl, 0);
        case 'num':
          return formatNumber(n, def.intl);
        case 'plain':
          return String(value);
        case 't':
          return t(String(value));
        default:
          return typeof value === 'number' ? formatNumber(value, def.intl) : String(value);
      }
    });

  function t(key: string | readonly string[], params?: Params): string {
    const keys = typeof key === 'string' ? [key] : key;
    for (const k of keys) {
      const template = lookup(k);
      if (template !== undefined) return render(template, params);
    }
    // Nothing in any catalogue: show the last key so the gap is findable, not silent.
    return keys[keys.length - 1] ?? '';
  }

  function tp(key: string, count: number, params?: Params): string {
    const category = plurals ? plurals.select(count) : count === 1 ? 'one' : 'other';
    return t([`${key}.${category}`, `${key}.other`, key], { ...params, count });
  }

  return {
    locale: def.code,
    def,
    t,
    tp,
    has: (key: string) => table[key] !== undefined,
    money: (value, currency, decimals) => formatMoney(value, currency, def.intl, decimals ?? (Math.abs(value) < 100 ? 2 : 0)),
    pct: (fraction, decimals = 1) => formatPct(fraction, def.intl, decimals),
    num: (value, decimals) => formatNumber(value, def.intl, decimals),
  };
}
