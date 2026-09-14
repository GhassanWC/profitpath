/**
 * The landing hero's background clip.
 *
 * `null` means there is no footage: the hero paints `.pp-lp-hero__plate` — the
 * animated CSS gradient — and makes no network request. That is the shipped
 * state, and it is a real design, not a placeholder.
 *
 * To ship footage:
 *
 *   node tools/hero-clip.mjs your-clip.mov --loop-blend=1
 *
 * which writes `hero.mp4`, `hero.webm` and `hero-poster.jpg` into `app/public/`,
 * then replace the `null` below with:
 *
 *   export const HERO_CLIP = {
 *     poster: 'hero-poster.jpg',
 *     sources: [
 *       { src: 'hero.webm', type: 'video/webm' },
 *       { src: 'hero.mp4', type: 'video/mp4' },
 *     ],
 *   };
 *
 * WebM first: the browser takes the first type it can play, and VP9 is about a
 * third smaller than the H.264 that everything else falls back to.
 *
 * The plate stays underneath whatever happens — a clip that 404s, stalls, or is
 * refused autoplay leaves the hero looking finished rather than black.
 *
 * `preview/build.mjs` reads this file and strips the `export ` keyword to reuse
 * it verbatim, the same trick as `icons.ts` and `illustrations.ts`, so keep
 * every declaration here valid plain JavaScript: no type annotations, no
 * imports. That is what stops the two surfaces disagreeing about the hero.
 */

/**
 * @type {null | { poster: string, sources: { src: string, type: string }[] }}
 */
export const HERO_CLIP = null;
