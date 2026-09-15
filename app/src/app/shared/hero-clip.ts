/**
 * The landing hero's background clip.
 *
 * What ships is supplied footage — banknotes assembling into a heart — cut to
 * spec by `tools/hero-clip.mjs`, graded down 45% so the copy over it clears
 * WCAG AA, and capped to the source's own resolution instead of being upscaled
 * into the 1600x900 frame. `tools/ledger-clip.mjs` still renders the drawn
 * alternative if this is ever dropped.
 *
 * H.264 FIRST, WebM second — the reverse of the usual advice, and deliberate.
 * The browser takes the first source it can play, so the order is a preference,
 * not a fallback chain: VP9 normally wins on the smooth dark footage this hero
 * wants, but on this detailed live-action it lost outright (959 kB against
 * 784 kB), so H.264 leads and almost everyone gets the smaller file.
 *
 * WebM still earns its place behind it. The open-source Chromium build ships no
 * H.264 at all — that is what Playwright drives — so an mp4-only manifest gives
 * it no decodable source, `networkState` goes to NO_SOURCE after downloading
 * every byte, and `preview/hero-video.mjs` cannot measure the clip it is meant
 * to be checking. `hero-clip.mjs` prints both sizes; put the smaller first.
 *
 * To swap in different footage, cut it to the same filenames and leave this
 * alone:
 *
 *   node tools/hero-clip.mjs your-clip.mov --loop-blend=1 --dim=0.45
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
    { src: 'hero.mp4', type: 'video/mp4' },
    { src: 'hero.webm', type: 'video/webm' },
  ],
};
