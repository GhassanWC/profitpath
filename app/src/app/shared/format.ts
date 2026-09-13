import { formatMoney } from '../core/engine';

/**
 * Splits a formatted money string into its currency mark and its digits, so a
 * hero figure can set the mark small and muted beside the number.
 *
 * The split is on the formatted output, never on the value, so the locale's own
 * symbol is preserved; a suffix-style currency simply yields an empty mark.
 *
 * `preview/build.mjs` reuses this shape in plain JS — keep the two in step.
 */
export function splitMoney(value: number, currency: string): [string, string] {
  const s = formatMoney(value, currency, { decimals: 0 });
  const m = /^([^\d-]*)(.*)$/.exec(s);
  return m ? [m[1].trim(), m[2]] : ['', s];
}
