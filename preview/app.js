/* ProfitPath live preview — vanilla JS port of the Angular pages, driven by the
   same compiled engine and the same compiled message catalogue. Every string a
   reader sees comes from ProfitPathI18n, so a language that is complete here is
   complete in the app. */
(function () {
  const E = ProfitPathEngine;
  const I = ProfitPathI18n;
  const root = document.getElementById('app');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // ---------- language ----------
  const LOCALE_KEY = 'profitpath.locale.v1';
  function restoreLocale() {
    try {
      const saved = localStorage.getItem(LOCALE_KEY);
      if (saved && I.LOCALES.some((l) => l.code === saved)) return saved;
    } catch {}
    return I.matchLocale(navigator.languages || [navigator.language || I.DEFAULT_LOCALE]);
  }
  let TR = I.createTranslator(restoreLocale(), I.MESSAGES);
  function setLocale(code) {
    if (!I.LOCALES.some((l) => l.code === code)) return;
    TR = I.createTranslator(code, I.MESSAGES);
    try { localStorage.setItem(LOCALE_KEY, code); } catch {}
    applyDir();
    render();
  }
  /** Mirrors the choice onto <html> so CSS logical properties and screen readers follow. */
  function applyDir() {
    document.documentElement.setAttribute('lang', TR.def.code);
    document.documentElement.setAttribute('dir', TR.def.dir);
  }
  applyDir();

  const t = (k, p) => TR.t(k, p);
  /** A sentence the engine emitted: prefer the catalogue, fall back to its English. */
  const msg = (m, fallback) => (m && TR.has(m.key) ? TR.t(m.key, m.params) : fallback);
  /* The decimal rule is the engine's, so figures round the way engine prose rounds. */
  const money = (v, cur, d) => (v === null || v === undefined || !isFinite(v) ? '—' : TR.money(v, cur, d === undefined ? (Math.abs(v) >= 1000 ? 0 : 2) : d));
  const pct = (f, d = 1) => (f === null || f === undefined || !isFinite(f) ? '—' : TR.pct(f, d));

  // ---------- state ----------
  const S = { offering: '', type: null, answers: {}, completedIds: [], complete: false, step: 0, selectedType: null, detection: null, errors: {}, formValues: {}, tab: 'overview', wi: {}, target: { profit: 0, units: 1 }, langOpen: false };
  try { Object.assign(S, JSON.parse(sessionStorage.getItem('profitpath.preview.v1') || '{}')); } catch {}
  function persist() { try { sessionStorage.setItem('profitpath.preview.v1', JSON.stringify(S)); } catch {} }

  const model = () => (S.type && S.complete ? E.normalizeAnswers(S.type, S.answers, S.offering) : null);
  const pricing = () => { const m = model(); return m ? E.computePricing(m) : null; };
  const roadmap = () => { const m = model(); const p = pricing(); return m && p ? E.buildRoadmap(m, p, { completedIds: S.completedIds }) : null; };

  /* Unit nouns are catalogue keys so each locale inflects its own; `{x|t}` in a
     message translates the key it is handed. */
  const unitKey = (type) => `unit.${type || S.type || 'generic'}.one`;
  const unitsKey = (type) => `unit.${type || S.type || 'generic'}.other`;
  const unitOf = (type) => t(unitKey(type));
  const unitsOf = (type) => t(unitsKey(type));
  const unitParams = (type) => ({ unit: unitKey(type), units: unitsKey(type) });

  // ---------- AI boundary (template provider; rephrases computed numbers only) ----------
  /* Mirrors core/ai/explanation-provider.ts — same keys, same parameters. */
  function explainPrice(m, p) {
    const cur = m.meta.currency;
    const u = unitParams(m.meta.businessType);
    const top = p.costBreakdown[0];
    return [
      t('explain.price.cost', { cur, unit: u.unit, cost: p.trueCostPerUnit }),
      top ? t('explain.price.topLine', { label: t(['costLine.' + top.key], {}), share: top.share }) : '',
      // Without a requested margin the rationale is the static one for the
      // business type, which the catalogue already carries under its own key.
      p.marginBand.rationaleI18n ? t(p.marginBand.rationaleI18n.key, p.marginBand.rationaleI18n.params) : t(['businessType.' + m.meta.businessType + '.rationale']),
      t('explain.price.outcome', { cur, unit: u.unit, units: u.units, price: p.recommended.price, profit: p.recommended.profitPerUnit, margin: p.recommended.marginPct, monthly: p.recommended.monthlyProfit, count: p.expectedUnits }),
      p.target.achievableAtRecommended
        ? t('explain.price.targetMet', { cur, target: p.target.targetMonthlyProfit })
        : t('explain.price.targetShort', { cur, unit: u.unit, units: u.units, target: p.target.targetMonthlyProfit, required: p.target.requiredPrice, requiredUnits: p.target.requiredUnitsAtRecommended ?? '—' }),
    ].filter(Boolean).join(' ');
  }
  function explainRoadmap(m, r) {
    const first = r.recommendations[0];
    if (!first) return t('explain.roadmap.none');
    return t('explain.roadmap.summary', {
      cur: m.meta.currency,
      title: msg(first.i18n && first.i18n.title, first.title),
      impact: first.estimatedMonthlyImpact,
      count: r.recommendations.length,
      current: r.current.monthlyProfit,
      optimised: r.optimisedMonthlyProfit,
    });
  }

  // ---------- router ----------
  function route() { return (location.hash.replace(/^#\/?/, '') || '').split('?')[0]; }
  function go(path) { location.hash = '#/' + path; }
  window.addEventListener('hashchange', render);

  let lastRoute = null;
  function render() {
    const r = route();
    const routeChanged = r !== lastRoute; lastRoute = r;
    let page;
    if (r === 'analyze') page = renderAnalyze();
    else if (r === 'results') page = pricing() ? renderResults() : (go('analyze'), '');
    else if (r === 'roadmap') page = pricing() ? renderRoadmap() : (go('analyze'), '');
    else page = renderLanding();
    root.innerHTML = renderShell(page);
    bind();
    persist();
    if (routeChanged) window.scrollTo({ top: 0 });
  }

  // ---------- icons ----------
  /* ICONS and the semantic maps come from app/src/app/shared/icons.ts, injected
     by build.mjs, so the app and this preview cannot drift. */
  const icon = (n, size, cls) => `<svg class="pp-i ${cls || ''}" width="${size || 16}" height="${size || 16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  const typeIcon = (ty) => BUSINESS_TYPE_ICONS[ty] || 'package';
  const iconBadge = (n, mod, size) => `<span class="pp-icon-badge ${mod || ''}">${icon(n, size || 17)}</span>`;

  /* The hero figure sets its currency mark small and muted beside the digits.
     Mirrors app/src/app/shared/format.ts — keep the two in step. A locale that
     puts the currency after the number simply has no mark to demote. */
  const splitMoney = (s) => { const m = /^([^\d-]*)(.*)$/.exec(s); return m ? [m[1].trim(), m[2]] : ['', s]; };
  /* The landing figure sets its currency mark small and muted beside the digits. */
  const heroMark = (v, cur) => { const [c, d] = splitMoney(money(v, cur, 0)); return `<span style="font-size:0.42em;color:var(--pp-muted);vertical-align:top">${esc(c)}</span>${esc(d)}`; };
  const heroFigure = (v, cur, cls) => { const [c, d] = splitMoney(money(v, cur, 0)); return `<div class="pp-kpi ${cls}"><span class="cur">${esc(c)}</span>${esc(d)}</div>`; };

  /* Current vs optimised — mirrors ProfitCompareComponent. Both figures come
     from the engine; the bar is their real proportion. */
  function compare(current, optimised, cur, count, compact) {
    const lift = optimised - current;
    const pct2 = current > 0 ? '+' + pct(lift / current, 0) : t('compare.moreProfit');
    const share = optimised > 0 ? Math.max(2, Math.min(100, (current / optimised) * 100)) : 100;
    const big = compact ? 'pp-kpi--lg' : 'pp-kpi--xl';
    return `<div class="pp-compare">
      <div class="pp-compare__row">
        <div class="pp-compare__side"><div class="k">${icon('wallet', 12)} ${t('compare.today')}</div><div class="pp-kpi ${big} pp-num">${money(current, cur, 0)}</div></div>
        <div class="pp-compare__arrow">${icon('arrow-right', compact ? 16 : 22, 'pp-icon-flip')}</div>
        <div class="pp-compare__side"><div class="k">${icon('target', 12)} ${t('compare.following')}</div><div class="pp-kpi ${big} pp-kpi--pos pp-num">${money(optimised, cur, 0)}</div></div>
        <div class="pp-compare__lift">${icon('trending-up', 15)} +${money(lift, cur, 0)}<span class="pp-muted">·</span>${pct2}</div>
      </div>
      <div>
        <div class="pp-compare__bar" role="img" aria-label="${esc(t('compare.barLabel', { share: Math.round(share) }))}">
          <span class="now" style="width:${share}%"></span><span class="lift" style="width:${100 - share}%"></span>
        </div>
        <div class="pp-compare__key mt-2">
          <span><i style="background:var(--pp-brand)"></i>${t('compare.keyToday')}</span>
          <span><i style="background:var(--pp-brand-2)"></i>${t('compare.keyAdded', { count })}</span>
          <span>${t('compare.keyNote')}</span>
        </div>
      </div>
    </div>`;
  }

  /** Each language is listed in its own script: a reader who cannot read the
      current interface must still find their own name for their own language. */
  function languagePicker() {
    const items = I.LOCALES.map((l) => `<li><button type="button" role="option" aria-selected="${l.code === TR.def.code}" class="pp-lang__item ${l.code === TR.def.code ? 'selected' : ''}" lang="${l.code}" dir="${l.dir}" data-lang="${l.code}">
        <span class="name">${esc(l.label)}</span><span class="sub">${esc(l.englishLabel)}</span>${l.code === TR.def.code ? icon('check', 14) : ''}</button></li>`).join('');
    return `<div class="pp-lang" id="langpicker">
      <button type="button" class="pp-lang__button" id="langtoggle" aria-expanded="${S.langOpen}" aria-haspopup="listbox" aria-label="${esc(t('lang.change'))}">
        ${icon('languages', 15)}<span class="pp-lang__code">${TR.def.code.toUpperCase()}</span></button>
      ${S.langOpen ? `<ul class="pp-lang__menu" role="listbox" aria-label="${esc(t('lang.change'))}">${items}</ul>` : ''}
    </div>`;
  }

  function renderShell(inner) {
    const has = !!pricing();
    const r = route();
    const nav = (p, l, ic) => `<a href="#/${p}" class="${r === p ? 'active' : ''}">${icon(ic, 15)} ${t(l)}</a>`;
    return `<header class="pp-header"><div class="pp-container"><div class="pp-header-pill">
      <a href="#/" class="pp-logo"><svg viewBox="0 0 32 32" aria-hidden="true"><rect x="0.8" y="0.8" width="30.4" height="30.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M6 23l7-8 5 4 8-12" fill="none" stroke="var(--pp-brand)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="26" cy="7" r="2.4" fill="var(--pp-brand)"/></svg>ProfitPath</a>
      <nav class="pp-nav d-none d-sm-flex">${nav('analyze', 'nav.calculator', 'calculator')}${has ? nav('results', 'nav.results', 'chart-column') + nav('roadmap', 'nav.roadmap', 'map') : ''}</nav>
      <div class="d-flex align-items-center gap-2">${languagePicker()}<a href="#/analyze" class="btn btn-pp btn-sm">${t('nav.cta')} ${icon('arrow-right', 14, 'pp-icon-flip')}</a></div></div></div></header>
      <main>${inner}</main>
      <footer class="pp-footer"><div class="pp-container d-flex flex-wrap justify-content-between gap-3"><div>${t('footer.legal', { year: new Date().getFullYear() })}</div><div>${t('footer.deterministic')}</div></div></footer>`;
  }

  /* Drawings come from app/src/app/shared/illustrations.ts, injected by
     build.mjs, so the app and this preview cannot drift. */
  const illo = (n) => `<svg viewBox="0 0 160 140" aria-hidden="true" focusable="false">${ILLUSTRATIONS[n] || ''}</svg>`;
  const catArt = (t) => `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">${CATEGORY_ART[t] || ''}</svg>`;
  const stepNo = (i) => String(i + 1).padStart(2, '0');
  const seriesColor = (i) => `var(--pp-series-${(i % 9) + 1})`;
  const lpTick = (label) => `<svg class="pp-lp-tick" width="15" height="15" viewBox="0 0 24 24" role="img" aria-label="${esc(label)}"><path d="M4 12.5l5 5L20 6.5"></path></svg>`;
  const lpNone = '<span class="none" aria-hidden="true">—</span>';

  /* Which plans carry which capability — one list, so the table and the stacked
     mobile blocks can never disagree. Mirrors FEATURES in landing.component.ts. */
  const LP_FEATURES = [
    ['landing.plan.free.1', 1, 1, 1],
    ['landing.plan.free.2', 1, 1, 1],
    ['landing.plan.free.3', 1, 1, 1],
    ['landing.plan.pro.2', 0, 1, 1],
    ['landing.plan.pro.3', 0, 1, 1],
    ['landing.plan.pro.5', 0, 1, 1],
    ['landing.plan.business.2', 0, 0, 1],
    ['landing.plan.business.3', 0, 0, 1],
  ];
  const LP_PLANS = [['free', '$0', false], ['pro', '$9', true], ['business', '$19', true]];

  // ---------- landing ----------
  /* A reader who has asked for reduced motion gets the poster and no download. */
  const REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /**
   * The hero clip, or nothing. HERO_CLIP comes from
   * app/src/app/shared/hero-clip.ts, which build.mjs inlines the same way it
   * inlines the icons and the drawings — so the two surfaces cannot disagree
   * about whether footage exists.
   *
   * `oncanplay` rather than a listener because the preview re-renders by
   * replacing innerHTML, and an inline handler survives that without any
   * bookkeeping. The plate underneath shows until the class lands, and keeps
   * showing if the clip never loads — which is what happens by default here,
   * since the preview is one self-contained file with no assets beside it.
   */
  function heroVideo() {
    if (!HERO_CLIP) return '';
    const sources = HERO_CLIP.sources
      .map((s) => `<source src="${esc(s.src)}" type="${esc(s.type)}">`)
      .join('');
    return `<video class="pp-lp-hero__video" poster="${esc(HERO_CLIP.poster)}"` +
      ` preload="${REDUCED_MOTION ? 'none' : 'auto'}"${REDUCED_MOTION ? '' : ' autoplay'}` +
      ` muted loop playsinline disablepictureinpicture tabindex="-1" aria-hidden="true"` +
      ` oncanplay="this.classList.add('is-ready')">${sources}</video>`;
  }

  function renderLanding() {
    /* Every figure below is the sample run through the real engine — nothing on
       this page is a hardcoded illustration. */
    const s = E.SAMPLES[0];
    const m = E.normalizeAnswers(s.type, s.answers, s.offering);
    const p = E.computePricing(m);
    const r = E.buildRoadmap(m, p);
    const cur = p.currency;
    const u = unitParams(m.meta.businessType);
    const lift = r.optimisedMonthlyProfit - r.current.monthlyProfit;
    const topShare = p.costBreakdown[0] ? p.costBreakdown[0].share : 0;

    const steps = STEP_ILLUSTRATIONS.map((art, i) => `<div>
        <div class="n">${stepNo(i)}</div>${illo(art)}
        <h3>${t('landing.how.' + (i + 1) + '.title')}</h3>
        <p>${t('landing.how.' + (i + 1) + '.body')}</p>
      </div>`).join('');

    const ledger = p.costBreakdown.map((l) => `<span class="k">${esc(t(['costLine.' + l.key], {}) || l.label)}</span><span class="v">${money(l.amount, cur)} <small>· ${pct(l.share, 0)}</small></span>`).join('');
    const bar = p.costBreakdown.map((l, i) => `<span style="width:${l.share * 100}%;background:${seriesColor(i)}"></span>`).join('');

    const recs = r.recommendations.slice(0, 4).map((x, i) => `<div style="border-inline-end-color:rgba(242,239,232,0.14);padding-block:28px 30px">
        <div class="n" style="color:var(--pp-on-dark-muted)">${stepNo(i)}</div>
        <h3 style="margin-top:14px;color:var(--pp-on-dark)">${esc(msg(x.i18n && x.i18n.title, x.title))}</h3>
        <div class="impact">
          <div class="pp-lp-mono" style="font-size:22px;color:var(--pp-pos-dark)">+${money(x.estimatedMonthlyImpact, cur, 0)}</div>
          <div class="pp-lp-cap" style="margin-top:12px;color:var(--pp-on-dark-muted)">${t('roadmap.priority', { priority: t('priority.' + x.priority) })} · ${t('roadmap.difficulty', { difficulty: t('difficulty.' + x.difficulty) })}</div>
        </div>
      </div>`).join('');

    const range = E.BUSINESS_TYPE_LIST.map((x) => `<div>${catArt(x.type)}
        <div class="name">${t('businessType.' + x.type + '.label')}</div>
        <div class="pp-lp-mono mt-2" style="font-size:11px;color:var(--pp-muted)">${t('landing.range.band', { low: x.marginBand.low, high: x.marginBand.high })}</div>
      </div>`).join('');

    const planHeads = LP_PLANS.map(([id, price, per]) => `<div class="head">
        <div class="pp-lp-serif" style="font-size:30px">${t('landing.plan.' + id + '.name')}</div>
        <div class="pp-lp-mono mt-2" style="font-size:13px;color:${id === 'pro' ? 'var(--pp-brand-ink)' : 'var(--pp-muted)'}">${price}${per ? t('landing.pricing.perMonth') : ''}</div>
      </div>`).join('');
    const planRows = LP_FEATURES.map(([key, f, pr, b]) => `<div class="feat">${t(key)}</div>
      <div class="cell">${f ? lpTick(t('landing.plan.free.name')) : lpNone}</div>
      <div class="cell">${pr ? lpTick(t('landing.plan.pro.name')) : lpNone}</div>
      <div class="cell">${b ? lpTick(t('landing.plan.business.name')) : lpNone}</div>`).join('');
    const planFeet = LP_PLANS.map(([id]) => `<div class="foot"><a href="#/analyze" class="btn-lp pp-lp-mono ${id === 'pro' ? '' : 'btn-lp--ghost'}" style="font-size:12.5px;padding:12px 20px">${t('landing.cta.primary')}</a></div>`).join('');

    const arrow = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pp-icon-flip" aria-hidden="true"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg>`;

    return `<div class="pp-lp">
    <section class="pp-lp-hero">
      <div class="pp-lp-hero__plate"></div>${heroVideo()}<div class="pp-lp-hero__grain"></div>
      <div class="pp-lp-hero__scrim"></div><div class="pp-lp-hero__foot"></div>
      <div class="pp-lp-hero__copy pp-lp__inner">
        <div>
          <div class="pp-lp-eyebrow d-flex align-items-center gap-3" style="color:#b9c2d6">
            <span style="display:inline-block;width:30px;height:1px;background:var(--pp-brand-ink)"></span>${t('landing.chip')}
          </div>
          <h1>${t('landing.title.before')} <em>${t('landing.title.accent')}</em></h1>
          <p class="pp-lp-hero__lede">${t('landing.lead')}</p>
          <div class="d-flex flex-wrap align-items-center gap-3 mt-4">
            <a href="#/analyze" class="btn-lp pp-lp-mono">${t('landing.cta.primary')} ${arrow(15)}</a>
            <button type="button" class="btn-lp btn-lp--quiet pp-lp-mono" data-action="example">${t('landing.cta.example')}</button>
          </div>
          <div class="pp-lp-mono mt-4" style="font-size:11.5px;color:#8c93a6">${t('landing.final.sub')}</div>
        </div>
      </div>
      <div class="pp-lp-hero__ticker"><div class="pp-lp__inner">
        <span><b>${t('landing.example.eyebrow')}</b></span>
        <span>${esc(s.offering)}</span>
        <span>${t('results.trueCost')} <b>${money(p.trueCostPerUnit, cur)}</b></span>
        <span>${t('results.badge')} <b>${money(p.recommended.price, cur, 0)}</b></span>
        <span>${t('results.margin')} <b>${pct(p.recommended.marginPct)}</b></span>
        <span>${t('nav.roadmap')} <b class="pos">+${money(lift, cur, 0)}</b></span>
      </div></div>
    </section>

    <section class="pp-lp-section pp-lp__inner">
      <div class="pp-lp-head"><h2>${t('landing.how.title')}</h2>
        <p class="pp-lp-body mb-0" style="max-width:380px;font-size:14px">${t('landing.how.sub')}</p></div>
      <hr class="pp-lp-rule--ink">
      <div class="pp-lp-steps">${steps}</div>
      <hr class="pp-lp-rule">
    </section>

    <section class="pp-lp-section pp-lp__inner">
      <div class="pp-lp-head">
        <div><div class="pp-lp-eyebrow mb-3">${t('landing.example.eyebrow')}</div><h2>${esc(s.offering)}</h2></div>
        <p class="pp-lp-mono mb-0" style="max-width:330px;font-size:11.5px;line-height:1.9;color:var(--pp-muted)">${t('landing.example.note')}</p>
      </div>
      <hr class="pp-lp-rule--ink">
      <div class="pp-lp-split">
        <div>
          <div class="pp-lp-eyebrow">${t('landing.example.costs')}</div>
          <div class="pp-lp-ledger mt-4">${ledger}
            <span class="total">${t('landing.example.trueCost', u)}</span>
            <span class="total v">${money(p.trueCostPerUnit, cur)}</span>
          </div>
          <div class="pp-lp-bar mt-4">${bar}</div>
          <p class="pp-lp-body mt-4 mb-0" style="font-size:13.5px">${t('landing.example.lead', { share: topShare })}</p>
        </div>
        <div>
          <div class="pp-lp-eyebrow">${t('landing.calc.eyebrow')}</div>
          <div class="pp-lp-figure">${heroMark(p.recommended.price, cur)}</div>
          <div class="pp-lp-mono mt-3" style="font-size:12px;color:var(--pp-muted)">${t('landing.calc.sub', { unit: u.unit, margin: p.marginBand.mid })}</div>
          <div class="pp-lp-stats mt-4">
            <div><div class="pp-lp-cap">${t('results.trueCost')}</div><div class="v">${money(p.trueCostPerUnit, cur)}</div></div>
            <div><div class="pp-lp-cap">${t('results.profitPerUnit', u)}</div><div class="v">${money(p.recommended.profitPerUnit, cur)}</div></div>
            <div><div class="pp-lp-cap">${t('results.margin')}</div><div class="v">${pct(p.recommended.marginPct)}</div></div>
            <div><div class="pp-lp-cap">${t('results.revenue')}</div><div class="v">${money(p.recommended.monthlyRevenue, cur, 0)}</div></div>
            <div><div class="pp-lp-cap">${t('results.profit')}</div><div class="v pos">${money(p.recommended.monthlyProfit, cur, 0)}</div></div>
            <div><div class="pp-lp-cap">${t('results.breakEvenSales')}</div><div class="v">${p.recommended.breakEvenUnits ?? '—'} <span style="font-size:13px;color:var(--pp-muted)">${t('results.breakEvenSales.sub', { count: p.expectedUnits })}</span></div></div>
          </div>
          <p class="pp-lp-body mt-4 mb-0" style="font-size:13.5px;max-width:470px">${t('landing.example.goals', { cur, count: m.goals.expectedUnits, units: u.units, target: m.goals.targetMonthlyProfit })}</p>
        </div>
      </div>
    </section>

    <section class="pp-lp-plate"><div class="pp-lp__inner">
      <div class="pp-lp-head" style="padding-bottom:20px;border-bottom:1.5px solid rgba(242,239,232,0.28)">
        <h2>${t('results.roadmapWorth')}</h2>
        <p class="pp-lp-mono mb-0" style="font-size:11.5px;line-height:1.9;color:var(--pp-on-dark-muted);max-width:340px">${t('roadmap.intro')}</p>
      </div>
      <div class="mt-5">${compare(r.current.monthlyProfit, r.optimisedMonthlyProfit, cur, r.recommendations.length, false)}</div>
      <div class="pp-lp-steps pp-lp-steps--4 mt-5" style="border-top:1px solid rgba(242,239,232,0.22)">${recs}</div>
    </div></section>

    <section class="pp-lp-section pp-lp__inner">
      <div class="pp-lp-head"><h2>${t('landing.range.title')}</h2>
        <p class="pp-lp-body mb-0" style="max-width:400px;font-size:14px">${t('landing.range.sub')}</p></div>
      <hr class="pp-lp-rule--ink">
      <div class="pp-lp-range">${range}</div>
    </section>

    <section class="pp-lp-section pp-lp__inner">
      <div class="pp-lp-head"><h2>${t('landing.pricing.title')}</h2>
        <p class="pp-lp-body mb-0" style="max-width:330px;font-size:14px">${t('landing.pricing.sub')}</p></div>
      <hr class="pp-lp-rule--ink">
      <div class="pp-lp-plans"><div class="head"></div>${planHeads}${planRows}<div class="foot"></div>${planFeet}</div>
    </section>

    <section class="pp-lp-close"><div class="pp-lp__inner">
      <div>
        <h2>${t('landing.final.title')}</h2>
        <p class="pp-lp-body mt-3 mb-0" style="font-size:15px;max-width:460px">${t('landing.how.sub')} ${t('landing.final.sub')}</p>
      </div>
      <a href="#/analyze" class="btn-lp pp-lp-mono" style="font-size:14px;padding:18px 32px;white-space:nowrap">${t('landing.cta.primary')} ${arrow(16)}</a>
    </div></section>
    </div>`;
  }
  // ---------- analyze ----------
  const groups = () => (S.type ? E.questionGroupsFor(S.type) : []);
  const merged = () => ({ ...S.answers, ...S.formValues });
  function currentGroup() { return groups()[S.step - 1] || null; }
  const STEP_ICONS = ['users', 'receipt', 'megaphone', 'wallet', 'clock', 'target'];

  /* Question and group copy is static in the engine, so the catalogue holds it
     directly. Where a string differs by business type the key carries the type;
     where it differs only by the unit noun, one template serves every type. */
  function scoped(prefix, key, field) {
    const ty = S.type || S.selectedType;
    return ty ? [`${prefix}.${ty}.${key}.${field}`, `${prefix}.${key}.${field}`] : [`${prefix}.${key}.${field}`];
  }
  function qText(q, field) {
    const keys = scoped('question', q.key, field);
    return TR.has(keys) ? t(keys, unitParams()) : q[field] || '';
  }
  function optText(q, o, field) {
    const keys = scoped('option', `${q.key}.${o.value}`, field);
    return TR.has(keys) ? t(keys, unitParams()) : o[field] || '';
  }
  function groupText(g, field) {
    const keys = scoped('group', g.id, field);
    return TR.has(keys) ? t(keys, unitParams()) : g[field];
  }

  function detectBanner(d) {
    if (!d || d.confidence <= 0) return '';
    const conf = d.confidence >= 0.7 ? 'analyze.confidence.high' : d.confidence >= 0.4 ? 'analyze.confidence.fair' : 'analyze.confidence.guess';
    return `<div class="pp-detect mb-4 pp-fade">${iconBadge(typeIcon(d.type))}<div><div class="title">${t('analyze.detect.title', { label: t('businessType.' + d.type + '.label') })}</div><div class="sub">${t('analyze.detect.sub', { confidence: t(conf) })}</div></div></div>`;
  }

  function renderAnalyze() {
    const total = groups().length + 1;
    const g = currentGroup();
    const stepTitle = g ? groupText(g, 'title') : t('analyze.step0.title');
    const stepIcon = S.step === 0 ? 'square-pen' : STEP_ICONS[(S.step - 1) % STEP_ICONS.length];
    let body;
    if (S.step === 0) {
      const cards = E.BUSINESS_TYPE_LIST.map((x) => `<button type="button" class="pp-type-card ${S.selectedType === x.type ? 'selected' : ''}" data-type="${x.type}">${iconBadge(typeIcon(x.type))}<span><span class="name">${t('businessType.' + x.type + '.label')}</span><small>${t('businessType.' + x.type + '.description')}</small></span></button>`).join('');
      body = `<div class="pp-card pp-card--primary pp-fade"><h2 class="mb-1">${t('analyze.q0.title')}</h2><p class="pp-body mb-4">${t('analyze.q0.intro')}</p>
        <div class="pp-input-group mb-3"><span class="affix pre">${icon('search', 15)}</span><input id="offering" type="text" value="${esc(S.offering)}" placeholder="${esc(t('analyze.q0.placeholder'))}" autofocus></div>
        <div id="detect">${detectBanner(S.detection)}</div><div class="pp-subhead mb-2">${t('analyze.businessType')}</div><div class="pp-option-grid mb-4" id="typegrid">${cards}</div>
        <div class="d-flex justify-content-end"><button class="btn btn-pp" id="start" ${!S.selectedType || !S.offering.trim() ? 'disabled' : ''}>${t('analyze.continue')} ${icon('arrow-right', 14, 'pp-icon-flip')}</button></div></div>`;
    } else {
      const cur = merged().currency || 'USD';
      const qs = E.visibleQuestions(g, merged()).map((q) => renderQuestion(q, cur)).join('');
      const last = S.step === groups().length;
      body = `<form class="pp-card pp-card--primary pp-fade" id="qform"><h2 class="mb-1">${groupText(g, 'title')}</h2><p class="pp-body mb-4">${groupText(g, 'intro')}</p>${qs}
        <div class="d-flex justify-content-between align-items-center mt-4"><button type="button" class="btn btn-pp-ghost" id="back">${icon('arrow-left', 14, 'pp-icon-flip')} ${t('analyze.back')}</button><button type="submit" class="btn btn-pp ${last ? 'btn-pp-hero' : ''}">${last ? t('analyze.finish') : t('analyze.continue')} ${icon(last ? 'sparkles' : 'arrow-right', 14, last ? '' : 'pp-icon-flip')}</button></div></form>
        <div class="mt-3 d-flex justify-content-center"><span class="pp-notice">${icon('info', 13)} ${t('analyze.notice')}</span></div>`;
    }
    const segs = Array.from({ length: total }, (_, i) => `<span class="seg ${i < S.step ? 'done' : ''} ${i === S.step ? 'current' : ''}"></span>`).join('');
    const context = S.step > 0 && S.type ? `<div class="d-flex flex-wrap gap-2 mb-3"><span class="pp-chip">${icon(typeIcon(S.type), 13)} ${t('businessType.' + S.type + '.label')}</span><span class="pp-chip">${esc(S.offering)}</span></div>` : '';
    return `<div class="pp-container py-5"><div class="pp-narrow">
      <div class="pp-steps-meta"><span class="now">${icon(stepIcon, 14)} ${stepTitle}</span><span>${t('analyze.step', { current: S.step + 1, total })}</span></div>
      <div class="pp-steps mb-3">${segs}</div>${context}${body}</div></div>`;
  }

  function renderQuestion(q, cur) {
    const v = S.formValues[q.key];
    const err = S.errors[q.key];
    const tick = `<span class="tick">${icon('check', 14)}</span>`;
    const label = qText(q, 'label');
    const help = qText(q, 'help');
    const suffix = qText(q, 'suffix');
    const placeholder = qText(q, 'placeholder');
    let field;
    if (q.type === 'select') field = `<div class="pp-option-grid">${q.options.map((o) => `<button type="button" class="pp-option ${v === o.value ? 'selected' : ''}" data-select="${q.key}" data-value="${o.value}"><span>${optText(q, o, 'label')}${o.hint ? `<small>${optText(q, o, 'hint')}</small>` : ''}</span>${tick}</button>`).join('')}</div>`;
    else if (q.type === 'multiselect') field = `<div class="pp-option-grid">${q.options.map((o) => `<button type="button" class="pp-option ${Array.isArray(v) && v.includes(o.value) ? 'selected' : ''}" data-multi="${q.key}" data-value="${o.value}"><span>${optText(q, o, 'label')}</span>${tick}</button>`).join('')}</div>`;
    else if (q.type === 'currency') field = `<div class="pp-input-group ${err ? 'is-invalid' : ''}"><select id="${q.key}" data-field="${q.key}">${q.options.map((o) => `<option value="${o.value}" ${(v || q.defaultValue) === o.value ? 'selected' : ''}>${esc(optText(q, o, 'label'))}</option>`).join('')}</select></div>`;
    else if (q.type === 'text') field = `<div class="pp-input-group ${err ? 'is-invalid' : ''}"><input id="${q.key}" type="text" data-field="${q.key}" value="${esc(v ?? '')}" placeholder="${esc(placeholder)}"></div>`;
    else field = `<div class="pp-input-group ${err ? 'is-invalid' : ''}">${q.money ? `<span class="affix pre">${cur}</span>` : ''}<input id="${q.key}" type="number" inputmode="decimal" step="any" ${q.min !== undefined ? `min="${q.min}"` : ''} data-field="${q.key}" value="${v ?? ''}" placeholder="${esc(placeholder)}">${suffix ? `<span class="affix">${esc(suffix)}</span>` : ''}</div>`;
    return `<div class="pp-q"><label class="pp-q-label d-block" for="${q.key}">${label}</label><div class="pp-q-help">${icon('lightbulb', 13)}<span>${help}</span></div>${field}${err ? `<div class="pp-error">${icon('triangle-alert', 13)}${err}</div>` : ''}</div>`;
  }

  function initForm() {
    const g = currentGroup(); if (!g) return;
    const fv = {};
    for (const q of g.questions) {
      let v = S.answers[q.key];
      if ((v === undefined || v === null) && (q.type === 'currency' || q.type === 'select') && typeof q.defaultValue === 'string') v = q.defaultValue;
      if ((v === undefined || v === null) && q.type === 'multiselect') v = [];
      fv[q.key] = v ?? null;
    }
    S.formValues = fv; S.errors = {};
  }

  function nextStep() {
    const g = currentGroup(); const m = merged();
    const errs = E.validateGroup(g, m); S.errors = errs;
    if (Object.keys(errs).length) { render(); return; }
    const patch = {};
    for (const q of E.visibleQuestions(g, m)) { const v = S.formValues[q.key]; patch[q.key] = v === '' ? null : ['number', 'percent', 'hours'].includes(q.type) ? (v === null || v === undefined ? null : Number(v)) : v; }
    Object.assign(S.answers, patch);
    if (S.step === groups().length) { S.complete = true; S.wi = {}; S.target = null; go('results'); return; }
    S.step++; initForm(); render();
  }

  // ---------- results ----------
  function tile(ic, label, value, sub, color, small) {
    return `<div class="pp-metric"><div class="k">${icon(ic, 12)} ${label}</div><div class="pp-kpi ${small ? 'pp-kpi--sm' : ''}" style="${color ? 'color:' + color : ''}">${value}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
  }
  function scenarioCard(sc, cur) {
    const u = unitParams();
    return `<div class="pp-scenario ${sc.key === 'recommended' ? 'recommended' : ''}"><div class="d-flex justify-content-between align-items-center gap-2 mb-2"><span class="pp-subhead">${t('scenario.' + sc.key + '.label')}</span><span class="pp-badge ${sc.status}">${icon(SCENARIO_ICONS[sc.status] || 'info', 11)}${t('scenario.status.' + sc.status)}</span></div><div class="price pp-num">${money(sc.price, cur, 0)}</div>
      <div class="pp-ledger mt-3"><span class="pp-muted">${t('results.whatif.profitPerUnit', u)}</span><span class="pp-num" style="${sc.profitPerUnit < 0 ? 'color:var(--pp-neg)' : ''}">${money(sc.profitPerUnit, cur)}</span><span class="pp-muted">${t('results.margin')}</span><span class="pp-num">${pct(sc.marginPct)}</span><span class="pp-muted">${t('results.whatif.monthlyProfit')}</span><span class="pp-num">${money(sc.monthlyProfit, cur, 0)}</span>${sc.breakEvenUnits !== null ? `<span class="pp-muted">${t('results.breakEven')}</span><span class="pp-num">${sc.breakEvenUnits} ${unitsOf()}</span>` : ''}</div>
      <p class="pp-muted mt-3 mb-0" style="font-size:12px">${esc(msg(sc.noteI18n, sc.note))}</p></div>`;
  }
  /** The blue→violet cost-composition series, named from the tokens in styles.css. */
  const PALETTE = {
    direct: ['var(--pp-series-1)', 'var(--pp-series-2)', 'var(--pp-series-3)', 'var(--pp-series-4)'],
    variable: ['var(--pp-series-5)', 'var(--pp-series-6)'],
    overhead: ['var(--pp-series-7)'],
    fees: ['var(--pp-series-8)', 'var(--pp-series-9)'],
  };
  function breakdown(lines, cur) {
    const c = {}; const colored = lines.map((l) => { const i = c[l.group] || 0; c[l.group] = i + 1; return { l, color: PALETTE[l.group][i % PALETTE[l.group].length], label: t(['costLine.' + l.key], {}) || l.label }; });
    return `<div class="pp-bar" role="img" aria-label="${esc(t('chart.costBreakdown'))}">${colored.map((x) => `<span style="width:${x.l.share * 100}%;background:${x.color}" title="${esc(x.label)}"></span>`).join('')}</div>
      <div class="pp-legend mt-3">${colored.map((x) => `<div class="d-flex justify-content-between"><span><i class="dot" style="background:${x.color}"></i>${esc(x.label)}</span><span class="pp-num">${money(x.l.amount, cur)} <span class="pp-muted">· ${pct(x.l.share, 0)}</span></span></div>`).join('')}</div>`;
  }
  function delta(now, was, cur, lowerIsBetter) { const d = now - was; if (Math.abs(d) < 0.005) return t('results.unchanged'); const good = lowerIsBetter ? d < 0 : d > 0; return `${d > 0 ? '+' : '−'}${money(Math.abs(d), cur, Math.abs(d) < 100 ? 2 : 0)} ${good ? '▲' : '▼'}`; }
  function deltaPts(now, was) { const d = (now - was) * 100; return Math.abs(d) < 0.05 ? t('results.unchanged') : t('results.pts', { value: `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}` }); }

  /** Slider labels are UI copy, keyed by the economics field they drive. */
  function sliderLabel(s) {
    const key = 'results.slider.' + s.key;
    return TR.has(key) ? t(key, unitParams()) : s.label;
  }
  function sliders(m, p) {
    const e = E.unitEconomics(m);
    const mk = (key, label, base, isMoney, unit = '') => ({ key, label, base, money: isMoney, unit, min: 0, max: Math.max(10, Math.ceil(base * 2.5)), step: base < 20 ? 0.1 : base < 200 ? 1 : base < 2000 ? 5 : 50 });
    const list = [mk('price', 'Selling price', p.recommended.price, true), mk('units', `${m.meta.unitLabelPlural} per month`, e.U, false)];
    list[1].min = 1;
    if (m.direct.purchase > 0) list.push(mk('purchase', 'Purchase cost', m.direct.purchase, true));
    if (m.direct.materials > 0) list.push(mk('materials', 'Materials', m.direct.materials, true));
    if (m.direct.labor > 0) list.push(mk('labor', 'Labour cost', m.direct.labor, true));
    if (m.direct.shipping > 0) list.push(mk('shipping', 'Shipping', m.direct.shipping, true));
    list.push(mk('marketingPerUnit', 'Marketing per ' + m.meta.unitLabel, m.variable.marketingPerUnit, true));
    list.push(mk('fixedMonthlyTotal', 'Monthly fixed costs', e.F, true));
    return list;
  }

  function whatIfMetrics(m, p) {
    const v = S.wi; const cur = p.currency; const u = unitParams();
    const wiModel = E.applyWhatIf(m, { units: v.units, purchase: v.purchase, materials: v.materials, labor: v.labor, shipping: v.shipping, marketingPerUnit: v.marketingPerUnit, fixedMonthlyTotal: v.fixedMonthlyTotal });
    const price = v.price ?? p.recommended.price;
    const pr = E.computePricing(wiModel); const e = E.unitEconomics(wiModel);
    const contrib = price * (1 - e.f) - e.D - e.V; const req = contrib > 0 ? Math.ceil((wiModel.goals.targetMonthlyProfit + e.F) / contrib) : null;
    const sc = E.evaluatePrice(wiModel, price, 'custom', 'What if');
    const better = sc.monthlyProfit >= p.recommended.monthlyProfit;
    return `<div class="pp-card pp-card--data"><div class="row g-3">
      <div class="col-6 col-md-4">${tile('trending-up', t('results.whatif.monthlyProfit'), money(sc.monthlyProfit, cur, 0), delta(sc.monthlyProfit, p.recommended.monthlyProfit, cur), better ? 'var(--pp-pos)' : 'var(--pp-neg)')}</div>
      <div class="col-6 col-md-4">${tile('banknote', t('results.whatif.monthlyRevenue'), money(sc.monthlyRevenue, cur, 0), delta(sc.monthlyRevenue, p.recommended.monthlyRevenue, cur))}</div>
      <div class="col-6 col-md-4">${tile('coins', t('results.whatif.profitPerUnit', u), money(sc.profitPerUnit, cur), delta(sc.profitPerUnit, p.recommended.profitPerUnit, cur))}</div>
      <div class="col-6 col-md-4">${tile('scale', t('results.whatif.margin'), pct(sc.marginPct), deltaPts(sc.marginPct, p.recommended.marginPct))}</div>
      <div class="col-6 col-md-4">${tile('wallet', t('results.whatif.breakEvenPrice'), money(pr.breakEvenPrice, cur), delta(pr.breakEvenPrice, p.breakEvenPrice, cur, true))}</div>
      <div class="col-6 col-md-4">${tile('zap', t('results.whatif.breakEvenUnits'), sc.breakEvenUnits ?? '—', t('results.whatif.was', { value: p.recommended.breakEvenUnits ?? '—' }))}</div>
      <div class="col-12">${tile('target', t('results.whatif.unitsForTarget'), `${req ?? '—'} ${unitsOf()}`, t('results.whatif.unitsForTarget.sub', { cur, target: p.target.targetMonthlyProfit, price, was: p.target.requiredUnitsAtRecommended ?? '—' }), '', true)}</div></div>
      <div class="mt-3 pp-body"><strong style="font-weight:500;color:var(--pp-ink)">${better ? t('results.whatif.stronger') : t('results.whatif.weaker')}</strong> ${t('results.whatif.compared')} <span class="pp-delta ${better ? 'up' : 'down'}">${signedMoney(sc.monthlyProfit - p.recommended.monthlyProfit, cur)}</span>. ${t('results.whatif.volumeNote')}</div></div>`;
  }
  const signedMoney = (v, cur) => (v >= 0 ? '+' : '−') + money(Math.abs(v), cur, 0);

  function targetMetrics(m, p) {
    const cur = p.currency; const u = unitParams();
    const tModel = E.applyWhatIf(m, { units: S.target.units }); tModel.goals.targetMonthlyProfit = S.target.profit; const tp = E.computePricing(tModel);
    const high = tp.target.requiredMarginPct > p.marginBand.high;
    return `<div class="pp-card pp-card--data"><div class="row g-3">
      <div class="col-6 col-md-4">${tile('coins', t('results.target.requiredProfit', u), money(tp.target.requiredProfitPerUnit, cur))}</div>
      <div class="col-6 col-md-4">${tile('target', t('results.target.requiredPrice'), money(tp.target.requiredPrice, cur), t('results.target.requiredPrice.sub', { count: S.target.units, units: u.units }))}</div>
      <div class="col-6 col-md-4">${tile('scale', t('results.target.requiredMargin'), pct(tp.target.requiredMarginPct))}</div>
      <div class="col-6 col-md-4">${tile('wallet', t('results.target.trueCostAtVolume'), money(tp.baseCostPerUnit, cur), t('results.target.exclFees'))}</div>
      <div class="col-6 col-md-8">${tile('chart-column', t('results.target.orKeep', { cur, price: p.recommended.price }), t('results.target.perMonth', { count: tp.target.requiredUnitsAtRecommended ?? '—', units: u.units }), '', '', true)}</div></div>
      <div class="mt-3 ${high ? 'pp-warn pp-warn-block' : 'pp-ok pp-ok-block'}">${icon(high ? 'triangle-alert' : 'circle-check', 14)}<span>${t('results.target.verdict', { cur, price: tp.target.requiredPrice, margin: tp.target.requiredMarginPct })} ${high ? t('results.target.above', { low: p.marginBand.low, high: p.marginBand.high }) : t('results.target.within', { low: p.marginBand.low, high: p.marginBand.high })}</span></div></div>`;
  }

  function renderResults() {
    const m = model(); const p = pricing(); const r = roadmap(); const cur = p.currency; const u = unitParams();
    if (!S.target) S.target = { profit: m.goals.targetMonthlyProfit, units: m.goals.expectedUnits };
    const sl = sliders(m, p); if (!Object.keys(S.wi).length) sl.forEach((s) => (S.wi[s.key] = s.base));
    const tabs = [['overview', 'results.tab.pricing', 'receipt'], ['whatif', 'results.tab.whatif', 'zap'], ['target', 'results.tab.target', 'target']]
      .map(([tab, l, ic]) => `<button class="${S.tab === tab ? 'active' : ''}" data-tab="${tab}">${icon(ic, 14)} ${t(l)}</button>`).join('');
    let panel;
    if (S.tab === 'overview') {
      panel = `<h3 class="mb-3">${t('results.threeWays')}</h3><div class="row g-3"><div class="col-md-4">${scenarioCard(p.scenarios.minimum, cur)}</div><div class="col-md-4">${scenarioCard(p.scenarios.recommended, cur)}</div><div class="col-md-4">${scenarioCard(p.scenarios.premium, cur)}</div></div>
        <div class="row g-4 mt-2"><div class="col-lg-7"><div class="pp-card pp-card--insight h-100">
          <div class="d-flex align-items-center gap-2 mb-1">${iconBadge('lightbulb', 'pp-icon-badge--sm', 14)}<h4 class="mb-0">${t('results.why', { cur, price: p.recommended.price })}</h4></div>
          <p class="pp-body" style="margin:12px 0 20px">${explainPrice(m, p)}</p><div class="pp-subhead mb-2">${t('results.costGoes', { cur })}</div>${breakdown(p.costBreakdown, cur)}</div></div>
        <div class="col-lg-5"><div class="pp-card h-100"><div class="d-flex align-items-center gap-2 mb-3">${icon('scale', 15)}<h4 class="mb-0">${t('results.breakEven')}</h4></div><div class="pp-ledger">
          <span class="pp-muted">${t('results.breakEvenPrice')}</span><span class="pp-num">${money(p.breakEvenPrice, cur)}</span>
          <span class="pp-muted">${t('results.variableBreakEven')}</span><span class="pp-num">${money(p.variableBreakEvenPrice, cur)}</span>
          <span class="pp-muted">${t('results.fixedMonthly')}</span><span class="pp-num">${money(p.fixedMonthly, cur, 0)}</span>
          <span class="total">${t('results.breakEvenAt', { cur, price: p.recommended.price })}</span><span class="total pp-num">${t('results.unitsPerMonth', { count: p.recommended.breakEvenUnits ?? '—', units: u.units })}</span></div>
          <p class="pp-muted" style="font-size:12px;margin-top:14px">${t('results.breakEvenExplain', { count: p.expectedUnits, units: u.units })}</p>
          ${p.recommended.breakEvenUnits !== null ? `<div class="pp-ok">${icon('circle-check', 13)}${t('results.breakEvenOk', { breakEven: p.recommended.breakEvenUnits, count: p.expectedUnits, units: u.units })}</div>` : ''}</div></div></div>`;
    } else if (S.tab === 'whatif') {
      const fmtv = (s, v) => (s.money ? money(v, cur, s.step < 1 ? 2 : 0) : TR.num(v) + (s.unit ? ' ' + s.unit : ''));
      panel = `<div class="row g-4"><div class="col-lg-5"><div class="pp-card"><div class="d-flex justify-content-between align-items-center mb-3"><h4 class="mb-0">${t('results.experiment')}</h4><button class="btn btn-pp-ghost btn-sm" id="wi-reset">${icon('rotate-ccw', 13)} ${t('results.reset')}</button></div>
        ${sl.map((s) => `<div class="pp-slider"><label>${sliderLabel(s)} <span id="wi-val-${s.key}">${fmtv(s, S.wi[s.key])}</span></label><input type="range" id="wi-${s.key}" data-wi="${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${S.wi[s.key]}"><small>${t('results.original', { value: fmtv(s, s.base) })}</small></div>`).join('')}</div></div>
        <div class="col-lg-7" id="wi-metrics">${whatIfMetrics(m, p)}</div></div>`;
    } else {
      panel = `<div class="row g-4"><div class="col-lg-5"><div class="pp-card"><h4 class="mb-1">${t('results.target.title')}</h4><p class="pp-body" style="margin:6px 0 18px">${t('results.target.intro')}</p>
        <label class="pp-q-label" for="tgt">${t('results.target.profit')}</label><div class="pp-input-group mb-3"><span class="affix pre">${cur}</span><input id="tgt" type="number" min="0" step="any" value="${S.target.profit}"></div>
        <label class="pp-q-label" for="tu">${t('results.target.units', u)}</label><div class="pp-input-group"><input id="tu" type="number" min="1" step="1" value="${S.target.units}"></div></div></div>
        <div class="col-lg-7" id="tgt-metrics">${targetMetrics(m, p)}</div></div>`;
    }
    const roadmapTeaser = r && r.recommendations.length ? `<div class="pp-card mt-3">
      <div class="d-flex justify-content-between align-items-start gap-3 mb-3 flex-wrap"><span class="pp-eyebrow">${icon('map', 14)} ${t('results.roadmapWorth')}</span><a href="#/roadmap" class="btn btn-pp-ghost btn-sm">${t('results.openRoadmap')} ${icon('arrow-right', 13, 'pp-icon-flip')}</a></div>
      ${compare(r.current.monthlyProfit, r.optimisedMonthlyProfit, cur, r.recommendations.length, false)}</div>` : '';
    return `<div class="pp-container py-5 pp-fade">
      <div class="row g-4 align-items-start">
        <div class="col-lg-7"><div class="pp-card pp-card--primary">
          <div class="d-flex justify-content-between align-items-start gap-3 mb-2"><span class="pp-eyebrow">${t('results.eyebrow', { offering: esc(S.offering) })}</span><span class="pp-badge recommended">${icon('badge-check', 12)} ${t('results.badge')}</span></div>
          ${heroFigure(p.recommended.price, cur, 'pp-kpi--hero')}
          <div class="pp-subhead" style="margin:4px 0 22px">${t('results.sub', { unit: u.unit, margin: p.marginBand.mid })}</div>
          <div class="pp-stat-strip">
            <div class="pp-stat"><div class="k">${icon('wallet', 12)} ${t('results.trueCost')}</div><div class="v pp-num">${money(p.trueCostPerUnit, cur)}</div></div>
            <div class="pp-stat"><div class="k">${icon('coins', 12)} ${t('results.profitPerUnit', u)}</div><div class="v pp-num">${money(p.recommended.profitPerUnit, cur)}</div></div>
            <div class="pp-stat"><div class="k">${icon('scale', 12)} ${t('results.margin')}</div><div class="v pp-num">${pct(p.recommended.marginPct)}</div></div>
          </div>
          <div class="mt-4 d-flex flex-wrap gap-2"><a href="#/roadmap" class="btn btn-pp btn-pp-hero">${t('results.seeRoadmap')} ${icon('arrow-right', 15, 'pp-icon-flip')}</a><a href="#/analyze" class="btn btn-pp-white" id="edit-answers">${icon('square-pen', 14)} ${t('results.editAnswers')}</a></div>
        </div></div>
        <div class="col-lg-5"><div class="pp-card pp-card--data h-100">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-3"><span class="pp-eyebrow">${icon('chart-column', 14)} ${t('results.outlook')}</span><span class="pp-subhead">${t('results.outlook.at', { count: p.expectedUnits, units: u.units })}</span></div>
          <div class="d-grid" style="gap:10px">
            ${tile('banknote', t('results.revenue'), money(p.recommended.monthlyRevenue, cur, 0))}
            ${tile('trending-up', t('results.profit'), money(p.recommended.monthlyProfit, cur, 0), '', 'var(--pp-pos)')}
            ${tile('zap', t('results.breakEvenSales'), `${p.recommended.breakEvenUnits ?? '—'} ${unitsOf()}`, t('results.breakEvenSales.sub', { count: p.expectedUnits }))}
          </div>
          <div class="pp-subhead mt-3">${t('results.estimatesNote')}</div>
        </div></div>
      </div>
      ${p.warnings.map((w, i) => `<div class="mt-3"><span class="pp-warn">${icon('triangle-alert', 13)}${esc(msg(p.warningsI18n && p.warningsI18n[i], w))}</span></div>`).join('')}
      ${roadmapTeaser}
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-5 mb-3"><div class="pp-tabs">${tabs}</div></div>
      <div class="pp-fade">${panel}</div></div>`;
  }

  // ---------- roadmap ----------
  function renderRoadmap() {
    const m = model(); const p = pricing(); const r = roadmap(); const cur = p.currency;
    const max = Math.max(1, ...r.recommendations.map((x) => x.estimatedMonthlyImpact));
    const done = r.recommendations.filter((x) => x.done).length;
    const order = ['reduce_costs', 'reduce_cac', 'increase_revenue', 'increase_value'];
    const cats = order.map((k) => ({ k, items: r.recommendations.filter((x) => x.category === k) }))
      .filter((c) => c.items.length)
      .map((c) => ({ ...c, total: c.items.reduce((s, x) => s + x.estimatedMonthlyImpact, 0) }));
    const top = r.recommendations.find((x) => !x.done) || r.recommendations[0] || null;
    const topShare = top && r.sumOfImpacts > 0 ? Math.round((top.estimatedMonthlyImpact / r.sumOfImpacts) * 100) : 0;
    const badges = (rec) => `<span class="pp-badge ${rec.priority}">${icon('chevrons-up', 11)}${t('roadmap.priority', { priority: t('priority.' + rec.priority) })}</span><span class="pp-badge ${rec.difficulty}">${icon(DIFFICULTY_ICONS[rec.difficulty] || 'signal-medium', 11)}${t('roadmap.difficulty', { difficulty: t('difficulty.' + rec.difficulty) })}</span>`;

    const card = (rec) => {
      const share = r.sumOfImpacts > 0 ? Math.round((rec.estimatedMonthlyImpact / r.sumOfImpacts) * 100) : 0;
      const i18n = rec.i18n;
      return `<article class="pp-rec ${rec.done ? 'done' : ''}"><div class="d-flex align-items-start" style="gap:14px">
      <button type="button" class="pp-check mt-1 ${rec.done ? 'on' : ''}" data-toggle="${rec.id}" aria-label="${esc(t(rec.done ? 'roadmap.markNotDone' : 'roadmap.markDone'))}">${icon(rec.done ? 'check' : 'plus', 13)}</button>
      <div class="flex-grow-1" style="min-width:0">
        <div class="d-flex justify-content-between align-items-start" style="gap:16px"><h4>${esc(msg(i18n && i18n.title, rec.title))}</h4><div class="pp-rec__impact"><div class="v">+${money(rec.estimatedMonthlyImpact, cur, 0)}</div><div class="pp-label">${t('roadmap.estPerMonth')}</div></div></div>
        <div class="pp-rec__meta mt-2">${badges(rec)}${share > 0 ? `<span class="pp-label">${t('roadmap.shareOfLift', { share })}</span>` : ''}</div>
        <p class="pp-body mt-3">${esc(msg(i18n && i18n.why, rec.why))}</p>
        <div class="pp-rec__action mt-3">${icon('arrow-up-right', 15, 'pp-icon-flip')}<div><div class="k">${t('roadmap.nextAction')}</div>${esc(msg(i18n && i18n.action, rec.action))}</div></div>
        ${rec.assumptions.length ? `<details class="mt-3"><summary>${icon('chevron-right', 13, 'pp-icon-flip')} ${t('roadmap.assumptions')}</summary><ul>${rec.assumptions.map((a, i) => `<li>${esc(msg(i18n && i18n.assumptions[i], a))}</li>`).join('')}</ul></details>` : ''}
      </div></div></article>`;
    };

    return `<div class="pp-container py-5 pp-fade">
      <div class="pp-narrow text-center mb-4"><span class="pp-chip mb-3">${icon('map', 13)} ${t('roadmap.chip', { offering: esc(S.offering) })}</span><h1>${t('roadmap.title', { cur, price: r.current.price })}</h1><p class="pp-muted" style="font-size:14px;margin:10px 0 0">${t('roadmap.intro')}</p></div>

      <div class="pp-card pp-card--primary">
        ${compare(r.current.monthlyProfit, r.optimisedMonthlyProfit, cur, r.recommendations.length, false)}
        <div class="row g-3 mt-1">
          <div class="col-md-7"><div class="pp-card-bare pp-card-bare--data h-100">
            <div class="d-flex align-items-center gap-2 mb-3">${icon('chart-column', 14)}<span class="pp-eyebrow">${t('roadmap.liftFrom')}</span></div>
            <div class="pp-waterfall">${r.recommendations.map((x) => `<div class="item"><span>${esc(msg(x.i18n && x.i18n.title, x.title))}</span><span class="pp-num">+${money(x.estimatedMonthlyImpact, cur, 0)}</span><div class="track"><span style="width:${(x.estimatedMonthlyImpact / max) * 100}%"></span></div></div>`).join('')}</div>
            <div class="pp-label mt-3">${t('roadmap.sumNote', { cur, sum: r.sumOfImpacts, discount: r.interactionDiscountPct })}</div>
          </div></div>
          <div class="col-md-5"><div class="pp-card-bare pp-card-bare--data h-100 d-flex flex-column">
            <div class="d-flex align-items-center gap-2 mb-3">${icon('list-checks', 14)}<span class="pp-eyebrow">${t('roadmap.progress')}</span></div>
            <div class="pp-kpi pp-kpi--lg pp-num">${done}<span class="pp-subhead">${t('roadmap.doneOf', { total: r.recommendations.length })}</span></div>
            <div class="pp-progress mt-2 mb-3"><div style="width:${r.recommendations.length ? (done / r.recommendations.length) * 100 : 0}%"></div></div>
            ${p.target.targetMonthlyProfit > 0 ? `<div class="mt-auto ${r.targetReached ? 'pp-ok pp-ok-block' : 'pp-warn pp-warn-block'}">${icon(r.targetReached ? 'circle-check' : 'triangle-alert', 14)}<span>${t(r.targetReached ? 'roadmap.targetReached' : 'roadmap.targetShort', { cur, target: p.target.targetMonthlyProfit })}</span></div>` : ''}
          </div></div>
        </div>
      </div>

      ${top ? `<div class="pp-card pp-card--insight mt-3">
        <div class="pp-spot__head">${iconBadge('sparkles', 'pp-icon-badge--sm', 14)} ${t('roadmap.startHere')}</div>
        <div class="d-flex justify-content-between align-items-start flex-wrap" style="gap:16px">
          <div style="min-width:0;flex:1 1 320px"><h3 class="mb-2">${esc(msg(top.i18n && top.i18n.title, top.title))}</h3><p class="pp-body mb-3">${esc(msg(top.i18n && top.i18n.action, top.action))}</p>
            <div class="pp-spot__meta">${badges(top)}</div></div>
          <div class="pp-stat pp-stat--accent" style="flex:0 0 auto;min-width:190px"><div class="k">${icon('trending-up', 12)} ${t('roadmap.estimatedImpact')}</div><div class="v pp-num">+${money(top.estimatedMonthlyImpact, cur, 0)}</div><div class="pp-label mt-1">${t('roadmap.impactShare', { share: topShare })}</div></div>
        </div></div>` : ''}

      <div class="pp-card pp-card--insight mt-3"><div class="d-flex align-items-start gap-2">${iconBadge('lightbulb', 'pp-icon-badge--sm', 14)}<p class="pp-body mb-0">${explainRoadmap(m, r)}</p></div></div>

      ${cats.map((c) => `<div class="pp-cat-head">${iconBadge(CATEGORY_ICONS[c.k] || 'trending-up')}<div><h3 class="mb-0">${t('category.' + c.k + '.label')}</h3><div class="pp-muted" style="font-size:12px">${t('category.' + c.k + '.blurb')}</div></div><span class="pp-badge ms-auto">+${t('roadmap.perMonth', { amount: c.total, cur })}</span></div><div class="d-grid" style="gap:var(--pp-grid-gap)">${c.items.map(card).join('')}</div>`).join('')}

      <div class="pp-notice pp-notice-block mt-5">${icon('info', 14)}<span>${esc(msg(r.disclaimerI18n, r.disclaimer))}</span></div>
      <div class="d-flex flex-wrap gap-2 mt-4"><a href="#/results" class="btn btn-pp-white">${icon('arrow-left', 14, 'pp-icon-flip')} ${t('roadmap.backToPricing')}</a><a href="#/analyze" class="btn btn-pp-ghost" id="new-analysis">${icon('rotate-ccw', 14)} ${t('roadmap.analyseAnother')}</a></div></div>`;
  }

  // ---------- events ----------
  function bind() {
    root.querySelector('#langtoggle')?.addEventListener('click', (ev) => { ev.stopPropagation(); S.langOpen = !S.langOpen; render(); });
    root.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => { S.langOpen = false; setLocale(b.dataset.lang); }));
    root.querySelectorAll('[data-action="example"]').forEach((el) => el.addEventListener('click', () => { const s = E.SAMPLES[0]; Object.assign(S, { offering: s.offering, type: s.type, selectedType: s.type, answers: { ...s.answers }, completedIds: [], complete: true, step: 0, wi: {}, target: null, tab: 'overview' }); go('results'); }));
    const off = root.querySelector('#offering');
    if (off) off.addEventListener('input', (ev) => {
      S.offering = ev.target.value; const d = S.offering.trim().length >= 3 ? E.detectBusinessType(S.offering) : null; S.detection = d;
      if (d && d.confidence > 0) S.selectedType = d.type;
      root.querySelector('#detect').innerHTML = detectBanner(d);
      root.querySelectorAll('[data-type]').forEach((b) => b.classList.toggle('selected', b.dataset.type === S.selectedType));
      root.querySelector('#start').disabled = !S.selectedType || !S.offering.trim();
    });
    root.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => { S.selectedType = b.dataset.type; root.querySelectorAll('[data-type]').forEach((x) => x.classList.toggle('selected', x === b)); root.querySelector('#start').disabled = !S.offering.trim(); }));
    root.querySelector('#start')?.addEventListener('click', () => { const changed = S.selectedType !== S.type; S.type = S.selectedType; if (changed) { S.answers = {}; S.completedIds = []; S.complete = false; } S.step = 1; S.wi = {}; S.target = null; initForm(); render(); });
    root.querySelector('#qform')?.addEventListener('submit', (ev) => { ev.preventDefault(); nextStep(); });
    root.querySelector('#back')?.addEventListener('click', () => { S.step = Math.max(0, S.step - 1); if (S.step > 0) initForm(); render(); });
    root.querySelectorAll('[data-field]').forEach((el) => el.addEventListener('input', () => { S.formValues[el.dataset.field] = el.value; if (el.dataset.field === 'channels' || el.dataset.field === 'sourceRegion') render(); }));
    root.querySelectorAll('[data-select]').forEach((b) => b.addEventListener('click', () => { S.formValues[b.dataset.select] = b.dataset.value; render(); }));
    root.querySelectorAll('[data-multi]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.multi; const v = Array.isArray(S.formValues[k]) ? [...S.formValues[k]] : []; const i = v.indexOf(b.dataset.value); i >= 0 ? v.splice(i, 1) : v.push(b.dataset.value); S.formValues[k] = v; render(); }));
    root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { S.tab = b.dataset.tab; render(); }));
    root.querySelector('#edit-answers')?.addEventListener('click', () => { S.step = 1; initForm(); });
    root.querySelector('#new-analysis')?.addEventListener('click', () => { Object.assign(S, { offering: '', type: null, selectedType: null, detection: null, answers: {}, completedIds: [], complete: false, step: 0, wi: {}, target: null }); });
    const m = model(); const p = pricing();
    root.querySelectorAll('[data-wi]').forEach((el) => el.addEventListener('input', () => {
      S.wi[el.dataset.wi] = el.valueAsNumber; const s = sliders(m, p).find((x) => x.key === el.dataset.wi);
      root.querySelector('#wi-val-' + s.key).textContent = s.money ? money(el.valueAsNumber, p.currency, s.step < 1 ? 2 : 0) : TR.num(el.valueAsNumber) + (s.unit ? ' ' + s.unit : '');
      root.querySelector('#wi-metrics').innerHTML = whatIfMetrics(m, p); persist();
    }));
    root.querySelector('#wi-reset')?.addEventListener('click', () => { S.wi = {}; render(); });
    const onTarget = () => { S.target.profit = Number(root.querySelector('#tgt').value) || 0; S.target.units = Math.max(1, Number(root.querySelector('#tu').value) || 1); root.querySelector('#tgt-metrics').innerHTML = targetMetrics(m, p); persist(); };
    root.querySelector('#tgt')?.addEventListener('input', onTarget); root.querySelector('#tu')?.addEventListener('input', onTarget);
    root.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => { const id = b.dataset.toggle; S.completedIds = S.completedIds.includes(id) ? S.completedIds.filter((x) => x !== id) : [...S.completedIds, id]; render(); }));
  }

  document.addEventListener('click', (ev) => { if (S.langOpen && !ev.target.closest('#langpicker')) { S.langOpen = false; render(); } });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && S.langOpen) { S.langOpen = false; render(); } });

  if (S.step > 0 && S.type && !Object.keys(S.formValues).length) initForm();
  render();
})();
