/** Money helpers: rounding and formatting. Pure functions. */

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function safeDiv(a: number, b: number): number | null {
  if (!isFinite(b) || b <= 0) return null;
  return a / b;
}

/**
 * Charm-round a price upward to a psychologically "clean" number.
 * The output is always >= input so rounding never erodes the targeted margin.
 *   12.3   -> 12.5      (steps of .5 under 20)
 *   47.2   -> 49        (…4 / …9 under 100)
 *   312    -> 319       (…9 under 1,000)
 *   1,063  -> 1,099     (…49 / …99 under 10,000)
 *   23,400 -> 23,499    (…499 / …999 above)
 * Rounding never adds more than ~5% so the targeted margin is preserved, not inflated.
 */
export function charmRound(price: number): number {
  if (!isFinite(price) || price <= 0) return 0;
  if (price < 5) return Math.ceil(price * 10) / 10;
  if (price < 20) return Math.ceil(price * 2) / 2;
  if (price < 100) return ceilToEnding(price, 5, 4); // 24, 29, 34 …
  if (price < 1000) return ceilToEnding(price, 10, 9); // 319, 329 …
  if (price < 10000) return ceilToEnding(price, 50, 49); // 1,099, 1,149 …
  return ceilToEnding(price, 500, 499); // 23,499, 23,999 …
}

function ceilToEnding(price: number, block: number, ending: number): number {
  const base = Math.floor(price / block) * block;
  const candidate = base + ending;
  return candidate >= price ? candidate : candidate + block;
}

/** Format a number as currency using Intl, falling back gracefully for unknown codes. */
export function formatMoney(value: number, currency: string, opts: { compact?: boolean; decimals?: number } = {}): string {
  if (!isFinite(value)) return '—';
  const decimals = opts.decimals ?? (Math.abs(value) >= 1000 ? 0 : 2);
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      notation: opts.compact ? 'compact' : 'standard',
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(decimals)}`;
  }
}

export function formatPct(fraction: number, decimals = 1): string {
  if (!isFinite(fraction)) return '—';
  return `${(fraction * 100).toFixed(decimals)}%`;
}

export function signed(value: number, currency: string): string {
  const s = formatMoney(Math.abs(value), currency, { decimals: 0 });
  return value >= 0 ? `+${s}` : `−${s}`;
}
