/**
 * Splits an already-formatted money string into its currency mark and its
 * digits, so a hero figure can set the mark small and muted beside the number.
 *
 * The split is on the formatted output, never on the value, so the active
 * locale's own symbol and placement are preserved. A locale that puts the
 * currency after the number (French, Spanish) yields an empty mark and keeps
 * the whole string with the digits, which is the right answer — there is no
 * prefix to demote.
 *
 * `preview/build.mjs` reuses this shape in plain JS — keep the two in step.
 */
export function splitMoney(formatted: string): [string, string] {
  const m = /^([^\d-]*)(.*)$/.exec(formatted);
  return m ? [m[1].trim(), m[2]] : ['', formatted];
}
