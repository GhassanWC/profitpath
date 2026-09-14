/**
 * The landing hero's background clip.
 *
 * What ships is the ledger clip — raking light moving across a ruled sheet,
 * rendered by `tools/ledger-clip.mjs` and cut to spec by `tools/hero-clip.mjs`.
 * Both are in the repo, so the three files in `app/public/` can be regenerated
 * rather than being binaries nobody can reproduce.
 *
 * WebM first: the browser takes the first type it can play, and VP9 is about a
 * third smaller than the H.264 that everything else falls back to.
 *
 * To swap in different footage, cut it to the same filenames and leave this
 * alone:
 *
 *   node tools/hero-clip.mjs your-clip.mov --loop-blend=1
 *
 * Setting this back to `null` is also a supported state, not a broken one: the
 * hero then paints `.pp-lp-hero__plate` — the animated CSS gradient — and makes
 * no network request at all. `preview/hero-video.mjs` checks both states.
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
export const HERO_CLIP = {
  poster: 'hero-poster.jpg',
  sources: [
    { src: 'hero.webm', type: 'video/webm' },
    { src: 'hero.mp4', type: 'video/mp4' },
  ],
};
