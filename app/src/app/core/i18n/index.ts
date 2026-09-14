import { Messages } from './catalogue';
import { EN } from './messages.en';
import { AR } from './messages.ar';
import { FR } from './messages.fr';
import { ES } from './messages.es';

export * from './catalogue';

/**
 * Every catalogue, keyed by locale code. English is the source: the other three
 * are checked against it for key parity by `preview/i18n-check.mjs`, which also
 * asserts that rendering the English entries reproduces the engine's own prose.
 *
 * To add a language: write `messages.<code>.ts` as a copy of the English keys,
 * add it here, and add its LOCALES entry in catalogue.ts. Nothing else changes.
 */
export const MESSAGES: Record<string, Messages> = { en: EN, ar: AR, fr: FR, es: ES };
