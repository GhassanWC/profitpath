/**
 * Landing-page illustrations — drawn for this product, not licensed or generated.
 *
 * Each value is the inner markup of a viewBox="0 0 160 140" drawing built from
 * three stroke weights only (`ink`, `ink-thin`, `hatch`, defined in styles.css),
 * plus one accent-coloured mark per drawing. That restraint is what makes five
 * separate drawings read as one hand.
 *
 * `preview/build.mjs` reads this file and strips the `export ` keyword to reuse
 * it verbatim, so keep every declaration here valid plain JavaScript: no type
 * annotations, no imports.
 *
 * The category marks use a 0 0 48 48 box and half the detail: they sit at 46px,
 * where a third line would turn to mud.
 */

/** Step drawings, 160x140. */
export const ILLUSTRATIONS = {
  /** 01 — a phone rising out of an open carton, with what else you might sell. */
  product: `
    <g class="ink-thin">
      <rect x="14" y="28" width="26" height="26" rx="5"></rect>
      <path d="M22 42c0-3 2-5 5-5s5 2 5 5"></path><path d="M22 42v4h10v-4"></path>
    </g>
    <g class="ink-thin">
      <rect x="122" y="20" width="26" height="26" rx="5"></rect>
      <path d="M129 36v-4a6 6 0 0 1 12 0v4"></path>
      <rect x="127" y="35" width="5" height="7" rx="2"></rect><rect x="138" y="35" width="5" height="7" rx="2"></rect>
    </g>
    <g class="ink"><rect x="63" y="18" width="34" height="66" rx="6"></rect><rect x="69" y="25" width="22" height="50" rx="2" class="ink-thin"></rect><path d="M74 22h12" class="ink-thin"></path></g>
    <g class="ink-thin"><circle cx="76" cy="33" r="3.2"></circle><circle cx="85" cy="33" r="3.2"></circle><circle cx="80.5" cy="41" r="3.2"></circle></g>
    <g class="hatch"><path d="M52 34l-7-5"></path><path d="M50 46l-9-2"></path><path d="M108 30l7-5"></path><path d="M110 42l9-2"></path></g>
    <g class="ink">
      <path d="M36 88h88v34a4 4 0 0 1-4 4H40a4 4 0 0 1-4-4z"></path>
      <rect x="30" y="76" width="100" height="14" rx="3" class="ink-fill-paper"></rect>
      <path d="M80 90v36" stroke-dasharray="3 4" class="ink-thin"></path>
    </g>
    <g class="hatch"><path d="M46 106h18"></path><path d="M46 113h11"></path></g>
    <path d="M104 104l6-6 4 4 8-9" class="ink-accent"></path>`,

  /** 02 — a receipt with a torn foot and the double rule that means "total". */
  costs: `
    <g class="ink"><path d="M42 20h76v98l-6-5-6 5-6-5-6 5-6-5-6 5-6-5-6 5-6-5-6 5-6-5-6 5-4-3z"></path></g>
    <g class="ink"><rect x="66" y="12" width="28" height="12" rx="2" class="ink-fill-paper"></rect><path d="M74 12v-4h12v4" class="ink-thin"></path></g>
    <g class="hatch"><path d="M52 42h26"></path><path d="M52 58h32"></path><path d="M52 74h22"></path><path d="M52 90h30"></path></g>
    <g class="ink-thin" stroke-dasharray="1 3" opacity="0.55"><path d="M84 42h10"></path><path d="M90 58h4"></path><path d="M80 74h14"></path><path d="M88 90h6"></path></g>
    <g class="ink" stroke-width="2.4"><path d="M98 42h12"></path><path d="M100 58h10"></path><path d="M96 74h14"></path><path d="M102 90h8"></path></g>
    <path d="M52 100h58" class="ink"></path><path d="M52 104h58" class="ink-thin"></path>
    <path d="M84 112h26" class="ink-accent" stroke-width="3"></path>`,

  /** 03 — a swing tag carrying the price, with the margin on a ribbon. */
  price: `
    <path d="M52 34c-10-8-20-6-24 2s2 16 10 15" class="ink-thin"></path>
    <g class="ink"><path d="M62 24h56a6 6 0 0 1 6 6v56a6 6 0 0 1-6 6H62L40 62z"></path><circle cx="58" cy="62" r="6"></circle></g>
    <g class="ink" stroke-width="3"><path d="M74 54h34"></path></g>
    <g class="hatch"><path d="M74 68h26"></path><path d="M74 76h16"></path></g>
    <rect x="70" y="100" width="54" height="18" rx="9" class="ink-fill-pos"></rect>
    <path d="M80 111l5-6 4 4 6-7" class="ink-pos"></path>
    <path d="M100 109h14" class="ink-pos" stroke-width="2.4"></path>
    <path d="M74 42h20" class="ink-accent" stroke-width="2.6"></path>`,

  /** 04 — rising bars with the roadmap plotted across them, survey-style. */
  roadmap: `
    <g class="ink-thin" opacity="0.22"><path d="M24 36h116"></path><path d="M24 62h116"></path><path d="M24 88h116"></path></g>
    <g class="ink"><rect x="30" y="88" width="18" height="26"></rect><rect x="56" y="74" width="18" height="40"></rect><rect x="82" y="58" width="18" height="56"></rect><rect x="108" y="38" width="18" height="76"></rect></g>
    <g class="hatch"><path d="M110 44h14"></path><path d="M110 52h14"></path><path d="M110 60h14"></path><path d="M110 68h14"></path><path d="M110 76h14"></path><path d="M110 84h14"></path></g>
    <path d="M22 114h124" class="ink"></path>
    <g class="ink-thin"><path d="M39 114v5"></path><path d="M65 114v5"></path><path d="M91 114v5"></path><path d="M117 114v5"></path></g>
    <path d="M39 96l26-18 26-16 26-20" class="ink-accent"></path>
    <g class="ink-accent ink-fill-paper" stroke-width="1.8"><circle cx="39" cy="96" r="3.4"></circle><circle cx="65" cy="78" r="3.4"></circle><circle cx="91" cy="62" r="3.4"></circle><circle cx="117" cy="42" r="3.4"></circle></g>
    <path d="M126 34l10-6-2 8" class="ink-accent"></path>`,

  /** 05 — a seedling out of a coin stack; each coin occludes the one below. */
  compound: `
    <path d="M80 88V44" class="ink"></path>
    <g class="ink"><path d="M80 62c-4-14-16-20-26-18 0 12 10 22 26 18z"></path><path d="M80 52c4-14 16-19 26-17-1 12-11 21-26 17z"></path></g>
    <g class="hatch"><path d="M70 55l-8-5"></path><path d="M74 60l-10-4"></path><path d="M88 47l9-5"></path><path d="M91 52l10-4"></path></g>
    <g class="ink">
      <ellipse cx="80" cy="118" rx="34" ry="9"></ellipse><path d="M46 118v-8"></path><path d="M114 118v-8"></path>
      <ellipse cx="80" cy="110" rx="34" ry="9" class="ink-fill-paper"></ellipse><path d="M46 110v-8"></path><path d="M114 110v-8"></path>
      <ellipse cx="80" cy="102" rx="34" ry="9" class="ink-fill-paper"></ellipse><path d="M46 102v-8"></path><path d="M114 102v-8"></path>
      <ellipse cx="80" cy="94" rx="34" ry="9" class="ink-fill-paper"></ellipse>
    </g>
    <ellipse cx="80" cy="94" rx="22" ry="5.4" class="ink-thin"></ellipse>
    <path d="M118 74l10-8-1 9" class="ink-pos"></path>
    <path d="M100 86c10-2 18-8 24-16" class="ink-pos"></path>`,
};

/** The five landing steps, in order, to the drawing that carries each. */
export const STEP_ILLUSTRATIONS = ['product', 'costs', 'price', 'roadmap', 'compound'];

/**
 * Category marks, 48x48 — one per business type the engine supports. Types that
 * sell the same silhouette share a mark rather than forcing a weak distinction.
 */
export const CATEGORY_ART = {
  resell: `<g class="ink"><rect x="15" y="7" width="18" height="34" rx="4"></rect></g><g class="ink-thin"><path d="M21 10h6"></path><circle cx="20" cy="16" r="2"></circle><circle cx="26" cy="16" r="2"></circle></g>`,
  import: `<g class="ink"><path d="M9 22h30l-4 15H13z"></path><path d="M17 22v-8h14v8"></path></g><path d="M17 29h14" class="ink-thin"></path>`,
  manufacture: `<g class="ink"><path d="M9 38V20l9 6v-6l9 6v-6l9 6v12z"></path></g><g class="ink-thin"><path d="M16 32v3"></path><path d="M24 32v3"></path><path d="M32 32v3"></path></g>`,
  handmade: `<g class="ink"><path d="M17 21h14v14a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4z"></path><path d="M24 18c3-2 3-5 0-8-3 3-3 6 0 8z"></path></g><path d="M17 27h14" class="ink-thin"></path>`,
  food: `<g class="ink"><path d="M16 17h16v18a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4z"></path><rect x="17" y="9" width="14" height="7" rx="2"></rect></g><path d="M16 24h16" class="ink-thin"></path><path d="M16 30h16" class="ink-thin"></path>`,
  service: `<g class="ink"><rect x="9" y="16" width="30" height="21" rx="3"></rect><path d="M18 16v-3a6 6 0 0 1 12 0v3"></path></g><path d="M9 26h30" class="ink-thin"></path>`,
  freelance: `<g class="ink"><rect x="12" y="12" width="24" height="17" rx="2"></rect><path d="M8 33h32l-3 4H11z"></path></g><path d="M17 24l4-5 3 3 3-4" class="ink-thin"></path>`,
  digital: `<g class="ink"><path d="M13 9h16l6 6v24a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2z"></path><path d="M29 9v6h6"></path></g><g class="ink-thin"><path d="M16 26h16"></path><path d="M16 32h10"></path></g>`,
  saas: `<g class="ink"><path d="M15 33a7 7 0 0 1-1-14 10 10 0 0 1 19 2 6 6 0 0 1 0 12z"></path></g><path d="M24 25v9" class="ink-thin"></path><path d="M20 30l4 4 4-4" class="ink-thin"></path>`,
};
