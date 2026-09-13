/* ProfitPath live preview — vanilla JS port of the Angular pages, driven by the same compiled engine. */
(function () {
  const E = ProfitPathEngine;
  const root = document.getElementById('app');
  const money = (v, cur, d) => (v === null || v === undefined ? '—' : E.formatMoney(v, cur, { decimals: d }));
  const pct = (f, d = 1) => E.formatPct(f, d);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // ---------- state ----------
  const S = { offering: '', type: null, answers: {}, completedIds: [], complete: false, step: 0, selectedType: null, detection: null, errors: {}, formValues: {}, tab: 'overview', wi: {}, target: { profit: 0, units: 1 } };
  try { Object.assign(S, JSON.parse(sessionStorage.getItem('profitpath.preview.v1') || '{}')); } catch {}
  function persist() { try { sessionStorage.setItem('profitpath.preview.v1', JSON.stringify(S)); } catch {} }

  const model = () => (S.type && S.complete ? E.normalizeAnswers(S.type, S.answers, S.offering) : null);
  const pricing = () => { const m = model(); return m ? E.computePricing(m) : null; };
  const roadmap = () => { const m = model(); const p = pricing(); return m && p ? E.buildRoadmap(m, p, { completedIds: S.completedIds }) : null; };

  // ---------- AI boundary (template provider; rephrases computed numbers only) ----------
  function explainPrice(m, p) {
    const cur = m.meta.currency; const top = p.costBreakdown[0];
    return [
      `Based on the information you provided, one ${p.unitLabel} costs you about ${money(p.trueCostPerUnit, cur)} once every direct cost, selling cost and your share of monthly overhead is counted.`,
      top ? `${top.label} is the largest component at ${Math.round(top.share * 100)}% of that.` : '',
      p.marginBand.rationale,
      `Pricing at ${money(p.recommended.price, cur, 0)} is estimated to leave ${money(p.recommended.profitPerUnit, cur)} per ${p.unitLabel} (${pct(p.recommended.marginPct)} margin), or roughly ${money(p.recommended.monthlyProfit, cur, 0)} a month at ${p.expectedUnits} ${p.unitLabel}s.`,
      p.target.achievableAtRecommended ? `That is above your target of ${money(p.target.targetMonthlyProfit, cur, 0)}.` : `Your target of ${money(p.target.targetMonthlyProfit, cur, 0)} would need either ${money(p.target.requiredPrice, cur)} per ${p.unitLabel} at your current volume, or about ${p.target.requiredUnitsAtRecommended ?? '—'} ${p.unitLabel}s a month at the recommended price. The roadmap shows ways to close that gap without only raising the price.`,
    ].filter(Boolean).join(' ');
  }
  function explainRoadmap(m, r) {
    const cur = m.meta.currency; const first = r.recommendations[0];
    if (!first) return 'We could not find cost or revenue levers large enough to recommend with your current inputs.';
    return `Assuming the inputs you gave hold, the biggest single opportunity is "${first.title}", estimated at ${money(first.estimatedMonthlyImpact, cur, 0)} a month. Together, the ${r.recommendations.length} items listed could potentially lift monthly profit from ${money(r.current.monthlyProfit, cur, 0)} to around ${money(r.optimisedMonthlyProfit, cur, 0)} after allowing for overlap between them. Start with the high-priority items; each one lists the assumption its estimate depends on.`;
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
  const icon = (n, size) => `<svg class="pp-i" width="${size || 16}" height="${size || 16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  const typeIcon = (t) => BUSINESS_TYPE_ICONS[t] || 'package';
  const iconBadge = (n, mod, size) => `<span class="pp-icon-badge ${mod || ''}">${icon(n, size || 17)}</span>`;

  /* The hero figure sets its currency mark small and muted beside the digits.
     Mirrors app/src/app/shared/format.ts — keep the two in step. */
  const splitMoney = (v, cur) => { const s = money(v, cur, 0); const m = /^([^\d-]*)(.*)$/.exec(s); return m ? [m[1].trim(), m[2]] : ['', s]; };
  const heroFigure = (v, cur, cls) => { const [c, d] = splitMoney(v, cur); return `<div class="pp-kpi ${cls}"><span class="cur">${esc(c)}</span>${esc(d)}</div>`; };

  /* Current vs optimised — mirrors ProfitCompareComponent. Both figures come
     from the engine; the bar is their real proportion. */
  function compare(current, optimised, cur, count, compact) {
    const lift = optimised - current;
    const pct2 = current > 0 ? `+${Math.round((lift / current) * 100)}%` : 'more profit';
    const share = optimised > 0 ? Math.max(2, Math.min(100, (current / optimised) * 100)) : 100;
    const big = compact ? 'pp-kpi--lg' : 'pp-kpi--xl';
    return `<div class="pp-compare">
      <div class="pp-compare__row">
        <div class="pp-compare__side"><div class="k">${icon('wallet', 12)} Today</div><div class="pp-kpi ${big} pp-num">${money(current, cur, 0)}</div></div>
        <div class="pp-compare__arrow">${icon('arrow-right', compact ? 16 : 22)}</div>
        <div class="pp-compare__side"><div class="k">${icon('target', 12)} Following the roadmap</div><div class="pp-kpi ${big} pp-kpi--pos pp-num">${money(optimised, cur, 0)}</div></div>
        <div class="pp-compare__lift">${icon('trending-up', 15)} +${money(lift, cur, 0)}<span class="pp-muted">·</span>${pct2}</div>
      </div>
      <div>
        <div class="pp-compare__bar" role="img" aria-label="Profit today is ${Math.round(share)}% of the optimised figure">
          <span class="now" style="width:${share}%"></span><span class="lift" style="width:${100 - share}%"></span>
        </div>
        <div class="pp-compare__key mt-2">
          <span><i style="background:var(--pp-brand)"></i>Profit today</span>
          <span><i style="background:var(--pp-brand-2)"></i>Added by the ${count} recommendations</span>
          <span>Estimates from your own numbers · not a forecast</span>
        </div>
      </div>
    </div>`;
  }

  function renderShell(inner) {
    const has = !!pricing();
    const r = route();
    const nav = (p, l, ic) => `<a href="#/${p}" class="${r === p ? 'active' : ''}">${icon(ic, 15)} ${l}</a>`;
    return `<header class="pp-header"><div class="pp-container"><div class="pp-header-pill">
      <a href="#/" class="pp-logo"><svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="ppmark" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2f6bf6"/><stop offset="1" stop-color="#6c5ce7"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#ppmark)"/><path d="M14 44 L26 30 L36 38 L50 20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="50" cy="20" r="5" fill="#dbe7ff"/></svg>ProfitPath</a>
      <nav class="pp-nav d-none d-sm-flex">${nav('analyze', 'Calculator', 'calculator')}${has ? nav('results', 'Results', 'chart-column') + nav('roadmap', 'Roadmap', 'map') : ''}</nav>
      <a href="#/analyze" class="btn btn-pp btn-sm">Calculate my price ${icon('arrow-right', 14)}</a></div></div></header>
      <main>${inner}</main>
      <footer class="pp-footer"><div class="pp-container d-flex flex-wrap justify-content-between gap-3"><div>© ${new Date().getFullYear()} ProfitPath · Estimates based on your inputs, not financial advice or a guarantee of results.</div><div>Live preview of the Angular MVP · all calculations deterministic</div></div></footer>`;
  }

  // ---------- landing ----------
  function renderLanding() {
    /* Every figure below is the sample run through the real engine — nothing on
       this page is a hardcoded illustration. */
    const s = E.SAMPLES[0];
    const m = E.normalizeAnswers(s.type, s.answers, s.offering);
    const p = E.computePricing(m);
    const r = E.buildRoadmap(m, p);
    const cur = p.currency;
    const chips = E.BUSINESS_TYPE_LIST.map((t) => `<span class="pp-chip">${icon(typeIcon(t.type), 13)} ${t.shortLabel}</span>`).join('');
    const top3 = r.recommendations.slice(0, 3);
    const topMax = Math.max(1, ...top3.map((x) => x.estimatedMonthlyImpact));
    const recs = top3.map((x) => `<div class="item"><span>${esc(x.title)}</span><span class="pp-num">+${money(x.estimatedMonthlyImpact, cur, 0)}/mo</span><div class="track"><span style="width:${(x.estimatedMonthlyImpact / topMax) * 100}%"></span></div></div>`).join('');
    const ledger = p.costBreakdown.map((l) => `<span class="pp-muted">${esc(l.label)}</span><span class="pp-num">${money(l.amount, cur)}</span>`).join('');
    const how = [
      ['square-pen', 'Tell us what you sell', "Type it in plain words. We detect whether it's a product, service, food, digital or SaaS business and ask only the questions that matter for it."],
      ['list-checks', 'Answer a few questions', 'Costs, fees, fixed expenses and your goals — a few at a time, each with a plain explanation of why we ask.'],
      ['calculator', 'Get your price', 'True cost, break-even, three pricing scenarios and the price you need to hit your target profit — with the reasoning behind each number.'],
      ['map', 'Follow your roadmap', 'Prioritised, quantified ways to make more profit at that price: cheaper sourcing, lower acquisition cost, upsells, better channels.'],
    ];
    const plans = [
      ['Free', '$0', '', false, ['Pricing calculator', 'Recommended price &amp; three scenarios', 'Break-even analysis', 'One saved business']],
      ['Pro', '$9', '/month', true, ['Everything in Free', 'Full Profit Roadmap', 'What-if simulator', 'Unlimited saved businesses', 'PDF reports']],
      ['Business', '$19', '/month', false, ['Everything in Pro', 'Team members', 'Scenario comparison', 'Market research (coming)']],
    ];
    return `
    <section class="pp-hero pp-container pp-fade">
      <span class="pp-chip mb-4">${icon('sparkles', 13)} Pricing intelligence + profit roadmap</span>
      <h1>How much should <span class="pp-gradient-text">you charge?</span></h1>
      <p class="lead">Tell us what you're selling, what it costs you, and what you want to earn. We'll calculate your ideal price and show you how to improve your profit.</p>
      <div class="d-flex flex-wrap justify-content-center gap-2"><a href="#/analyze" class="btn btn-pp btn-pp-hero btn-pp-lg">Calculate My Price ${icon('arrow-right', 17)}</a><button type="button" class="btn btn-pp-glass btn-pp-lg" data-action="example">See an Example</button></div>
      <div class="d-flex flex-wrap justify-content-center gap-2 mt-4">${chips}</div>
    </section>
    <section class="pp-section pp-container"><div class="row g-4 align-items-start">
      <div class="col-lg-5"><div class="pp-card">
        <div class="d-flex align-items-center gap-2 mb-1">${icon('receipt', 15)}<span class="pp-eyebrow">Worked example</span></div>
        <h3 class="mb-3" style="font-weight:400">${esc(s.offering)}</h3>
        <div class="pp-ledger">${ledger}<span class="total">True cost per ${p.unitLabel}</span><span class="total pp-num">${money(p.trueCostPerUnit, cur)}</span></div>
        <div class="pp-subhead mt-3">${m.goals.expectedUnits} ${p.unitLabel}s a month · target profit ${money(m.goals.targetMonthlyProfit, cur, 0)}</div>
      </div></div>
      <div class="col-lg-7"><div class="pp-card pp-card--primary">
        <div class="d-flex justify-content-between align-items-start gap-3 mb-3"><span class="pp-eyebrow">What ProfitPath works out</span><button type="button" class="btn btn-pp btn-sm" data-action="example">Open this example ${icon('arrow-right', 13)}</button></div>
        ${heroFigure(p.recommended.price, cur, 'pp-kpi--xl')}
        <div class="pp-subhead mb-3">Recommended price per ${p.unitLabel} · ${pct(p.marginBand.mid, 0)} target margin</div>
        <div class="pp-stat-strip">
          <div class="pp-stat"><div class="k">${icon('wallet', 12)} True cost</div><div class="v pp-num">${money(p.trueCostPerUnit, cur, 0)}</div></div>
          <div class="pp-stat"><div class="k">${icon('coins', 12)} Profit / ${p.unitLabel}</div><div class="v pp-num">${money(p.recommended.profitPerUnit, cur, 0)}</div></div>
          <div class="pp-stat"><div class="k">${icon('scale', 12)} Margin</div><div class="v pp-num">${pct(p.recommended.marginPct)}</div></div>
        </div>
        <div class="d-flex align-items-center gap-2" style="margin:22px 0 12px">${icon('trending-up', 14)}<span class="pp-eyebrow">Where more profit comes from</span></div>
        <div class="pp-waterfall">${recs}</div>
        <div class="mt-4">${compare(r.current.monthlyProfit, r.optimisedMonthlyProfit, cur, r.recommendations.length, true)}</div>
      </div></div>
    </div></section>
    <section class="pp-section pp-container"><div class="text-center mb-4"><h2>How it works</h2><p class="pp-muted">A conversation, not a spreadsheet. Five minutes from idea to price.</p></div>
      <div class="pp-flow">${how.map(([ic, t, b], i) => `<div class="pp-card"><div class="d-flex align-items-center gap-2"><span class="pp-step-num">${i + 1}</span>${iconBadge(ic, 'pp-icon-badge--sm pp-icon-badge--plain', 14)}</div><h5>${t}</h5><p class="pp-muted mb-0">${b}</p></div>`).join('')}</div></section>
    <section class="pp-section pp-container"><div class="text-center mb-4"><h2>Simple pricing</h2><p class="pp-muted">Start free. Upgrade when the roadmap pays for itself.</p></div>
      <div class="row g-3 justify-content-center">${plans.map(([name, price, per, hot, items]) => `<div class="col-md-4"><div class="pp-card h-100 ${hot ? 'pp-card--dark' : ''}">
        <div class="d-flex justify-content-between align-items-center gap-2"><span class="pp-subhead">${name}</span>${hot ? `<span class="pp-badge recommended">${icon('sparkles', 11)} Most popular</span>` : ''}</div>
        <div class="pp-kpi pp-kpi--lg my-2">${price}<span class="pp-subhead">${per}</span></div>
        <ul class="pp-muted ps-3 mb-0" style="font-size:13px;line-height:1.9">${items.map((i) => `<li>${i}</li>`).join('')}</ul></div></div>`).join('')}</div></section>
    <section class="pp-section pp-container text-center"><div class="pp-card" style="padding-block:56px"><h2>Ready to find out what to charge?</h2><p class="pp-muted mb-4" style="font-size:13px">No sign-up needed for your first analysis.</p><a href="#/analyze" class="btn btn-pp btn-pp-hero btn-pp-lg">Calculate My Price ${icon('arrow-right', 17)}</a></div></section>`;
  }

  // ---------- analyze ----------
  const groups = () => (S.type ? E.questionGroupsFor(S.type) : []);
  const merged = () => ({ ...S.answers, ...S.formValues });
  function currentGroup() { return groups()[S.step - 1] || null; }
  const STEP_ICONS = ['users', 'receipt', 'megaphone', 'wallet', 'clock', 'target'];

  function detectBanner(d) {
    if (!d || d.confidence <= 0) return '';
    const conf = d.confidence >= 0.7 ? 'High confidence' : d.confidence >= 0.4 ? 'Fairly confident' : 'Best guess';
    return `<div class="pp-detect mb-4 pp-fade">${iconBadge(typeIcon(d.type))}<div><div class="title">Looks like: ${E.businessTypeDef(d.type).label}</div><div class="sub">${conf} · not right? Pick a type below.</div></div></div>`;
  }

  function renderAnalyze() {
    const total = groups().length + 1;
    const def = S.type ? E.businessTypeDef(S.type) : null;
    const g = currentGroup();
    const stepTitle = g ? g.title : "What you're selling";
    const stepIcon = S.step === 0 ? 'square-pen' : STEP_ICONS[(S.step - 1) % STEP_ICONS.length];
    let body;
    if (S.step === 0) {
      const cards = E.BUSINESS_TYPE_LIST.map((t) => `<button type="button" class="pp-type-card ${S.selectedType === t.type ? 'selected' : ''}" data-type="${t.type}">${iconBadge(typeIcon(t.type))}<span><span class="name">${t.label}</span><small>${t.description}</small></span></button>`).join('');
      body = `<div class="pp-card pp-card--primary pp-fade"><h2 class="mb-1">What are you planning to sell?</h2><p class="pp-body mb-4">Describe it in your own words. We'll tailor the next questions to your kind of business — you will never be asked about costs that do not apply to you.</p>
        <div class="pp-input-group mb-3"><span class="affix pre">${icon('search', 15)}</span><input id="offering" type="text" value="${esc(S.offering)}" placeholder="e.g. iPhone 17 Pro, wedding photography, soy candles, online course…" autofocus></div>
        <div id="detect">${detectBanner(S.detection)}</div><div class="pp-subhead mb-2">Business type</div><div class="pp-option-grid mb-4" id="typegrid">${cards}</div>
        <div class="d-flex justify-content-end"><button class="btn btn-pp" id="start" ${!S.selectedType || !S.offering.trim() ? 'disabled' : ''}>Continue ${icon('arrow-right', 14)}</button></div></div>`;
    } else {
      const cur = merged().currency || 'USD';
      const qs = E.visibleQuestions(g, merged()).map((q) => renderQuestion(q, cur)).join('');
      const last = S.step === groups().length;
      body = `<form class="pp-card pp-card--primary pp-fade" id="qform"><h2 class="mb-1">${g.title}</h2><p class="pp-body mb-4">${g.intro}</p>${qs}
        <div class="d-flex justify-content-between align-items-center mt-4"><button type="button" class="btn btn-pp-ghost" id="back">${icon('arrow-left', 14)} Back</button><button type="submit" class="btn btn-pp ${last ? 'btn-pp-hero' : ''}">${last ? 'Calculate my price' : 'Continue'} ${icon(last ? 'sparkles' : 'arrow-right', 14)}</button></div></form>
        <div class="mt-3 d-flex justify-content-center"><span class="pp-notice">${icon('info', 13)} Leave a cost at 0 if it doesn't apply. You can change every number later in the what-if simulator.</span></div>`;
    }
    const segs = Array.from({ length: total }, (_, i) => `<span class="seg ${i < S.step ? 'done' : ''} ${i === S.step ? 'current' : ''}"></span>`).join('');
    const context = S.step > 0 && def ? `<div class="d-flex flex-wrap gap-2 mb-3"><span class="pp-chip">${icon(typeIcon(def.type), 13)} ${def.label}</span><span class="pp-chip">${esc(S.offering)}</span></div>` : '';
    return `<div class="pp-container py-5"><div class="pp-narrow">
      <div class="pp-steps-meta"><span class="now">${icon(stepIcon, 14)} ${stepTitle}</span><span>Step ${S.step + 1} of ${total}</span></div>
      <div class="pp-steps mb-3">${segs}</div>${context}${body}</div></div>`;
  }

  function renderQuestion(q, cur) {
    const v = S.formValues[q.key];
    const err = S.errors[q.key];
    const tick = `<span class="tick">${icon('check', 14)}</span>`;
    let field;
    if (q.type === 'select') field = `<div class="pp-option-grid">${q.options.map((o) => `<button type="button" class="pp-option ${v === o.value ? 'selected' : ''}" data-select="${q.key}" data-value="${o.value}"><span>${o.label}${o.hint ? `<small>${o.hint}</small>` : ''}</span>${tick}</button>`).join('')}</div>`;
    else if (q.type === 'multiselect') field = `<div class="pp-option-grid">${q.options.map((o) => `<button type="button" class="pp-option ${Array.isArray(v) && v.includes(o.value) ? 'selected' : ''}" data-multi="${q.key}" data-value="${o.value}"><span>${o.label}</span>${tick}</button>`).join('')}</div>`;
    else if (q.type === 'currency') field = `<div class="pp-input-group ${err ? 'is-invalid' : ''}"><select id="${q.key}" data-field="${q.key}">${q.options.map((o) => `<option value="${o.value}" ${(v || q.defaultValue) === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}</select></div>`;
    else if (q.type === 'text') field = `<div class="pp-input-group ${err ? 'is-invalid' : ''}"><input id="${q.key}" type="text" data-field="${q.key}" value="${esc(v ?? '')}" placeholder="${esc(q.placeholder || '')}"></div>`;
    else field = `<div class="pp-input-group ${err ? 'is-invalid' : ''}">${q.money ? `<span class="affix pre">${cur}</span>` : ''}<input id="${q.key}" type="number" inputmode="decimal" step="any" ${q.min !== undefined ? `min="${q.min}"` : ''} data-field="${q.key}" value="${v ?? ''}" placeholder="${esc(q.placeholder || '')}">${q.suffix ? `<span class="affix">${q.suffix}</span>` : ''}</div>`;
    return `<div class="pp-q"><label class="pp-q-label d-block" for="${q.key}">${q.label}</label><div class="pp-q-help">${icon('lightbulb', 13)}<span>${q.help}</span></div>${field}${err ? `<div class="pp-error">${icon('triangle-alert', 13)}${err}</div>` : ''}</div>`;
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
  const STATUS_TEXT = { low: 'Thin margin', recommended: 'Recommended', premium: 'Higher margin', loss: 'Loses money' };
  function scenarioCard(sc, cur, unit) {
    return `<div class="pp-scenario ${sc.key === 'recommended' ? 'recommended' : ''}"><div class="d-flex justify-content-between align-items-center gap-2 mb-2"><span class="pp-subhead">${sc.label}</span><span class="pp-badge ${sc.status}">${icon(SCENARIO_ICONS[sc.status] || 'info', 11)}${STATUS_TEXT[sc.status] || sc.status}</span></div><div class="price pp-num">${money(sc.price, cur, 0)}</div>
      <div class="pp-ledger mt-3"><span class="pp-muted">Profit / ${unit}</span><span class="pp-num" style="${sc.profitPerUnit < 0 ? 'color:var(--pp-neg)' : ''}">${money(sc.profitPerUnit, cur)}</span><span class="pp-muted">Margin</span><span class="pp-num">${pct(sc.marginPct)}</span><span class="pp-muted">Monthly profit</span><span class="pp-num">${money(sc.monthlyProfit, cur, 0)}</span>${sc.breakEvenUnits !== null ? `<span class="pp-muted">Break-even</span><span class="pp-num">${sc.breakEvenUnits} ${unit}s</span>` : ''}</div>
      <p class="pp-muted mt-3 mb-0" style="font-size:12px">${sc.note}</p></div>`;
  }
  /** The blue→violet cost-composition series, named from the tokens in styles.css. */
  const PALETTE = {
    direct: ['var(--pp-series-1)', 'var(--pp-series-2)', 'var(--pp-series-3)', 'var(--pp-series-4)'],
    variable: ['var(--pp-series-5)', 'var(--pp-series-6)'],
    overhead: ['var(--pp-series-7)'],
    fees: ['var(--pp-series-8)', 'var(--pp-series-9)'],
  };
  function breakdown(lines, cur) {
    const c = {}; const colored = lines.map((l) => { const i = c[l.group] || 0; c[l.group] = i + 1; return { l, color: PALETTE[l.group][i % PALETTE[l.group].length] }; });
    return `<div class="pp-bar" role="img" aria-label="Cost breakdown">${colored.map((x) => `<span style="width:${x.l.share * 100}%;background:${x.color}" title="${x.l.label}"></span>`).join('')}</div>
      <div class="pp-legend mt-3">${colored.map((x) => `<div class="d-flex justify-content-between"><span><i class="dot" style="background:${x.color}"></i>${x.l.label}</span><span class="pp-num">${money(x.l.amount, cur)} <span class="pp-muted">· ${pct(x.l.share, 0)}</span></span></div>`).join('')}</div>`;
  }
  function delta(now, was, cur, lowerIsBetter) { const d = now - was; if (Math.abs(d) < 0.005) return 'unchanged'; const good = lowerIsBetter ? d < 0 : d > 0; return `${d > 0 ? '+' : '−'}${money(Math.abs(d), cur, Math.abs(d) < 100 ? 2 : 0)} ${good ? '▲' : '▼'}`; }
  function deltaPts(now, was) { const d = (now - was) * 100; return Math.abs(d) < 0.05 ? 'unchanged' : `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1)} pts`; }

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
    const v = S.wi; const cur = p.currency;
    const model = E.applyWhatIf(m, { units: v.units, purchase: v.purchase, materials: v.materials, labor: v.labor, shipping: v.shipping, marketingPerUnit: v.marketingPerUnit, fixedMonthlyTotal: v.fixedMonthlyTotal });
    const price = v.price ?? p.recommended.price;
    const pr = E.computePricing(model); const e = E.unitEconomics(model);
    const contrib = price * (1 - e.f) - e.D - e.V; const req = contrib > 0 ? Math.ceil((model.goals.targetMonthlyProfit + e.F) / contrib) : null;
    const sc = E.evaluatePrice(model, price, 'custom', 'What if');
    const better = sc.monthlyProfit >= p.recommended.monthlyProfit;
    return `<div class="pp-card pp-card--data"><div class="row g-3">
      <div class="col-6 col-md-4">${tile('trending-up', 'Monthly profit', money(sc.monthlyProfit, cur, 0), delta(sc.monthlyProfit, p.recommended.monthlyProfit, cur), better ? 'var(--pp-pos)' : 'var(--pp-neg)')}</div>
      <div class="col-6 col-md-4">${tile('banknote', 'Monthly revenue', money(sc.monthlyRevenue, cur, 0), delta(sc.monthlyRevenue, p.recommended.monthlyRevenue, cur))}</div>
      <div class="col-6 col-md-4">${tile('coins', 'Profit / ' + p.unitLabel, money(sc.profitPerUnit, cur), delta(sc.profitPerUnit, p.recommended.profitPerUnit, cur))}</div>
      <div class="col-6 col-md-4">${tile('scale', 'Margin', pct(sc.marginPct), deltaPts(sc.marginPct, p.recommended.marginPct))}</div>
      <div class="col-6 col-md-4">${tile('wallet', 'Break-even price', money(pr.breakEvenPrice, cur), delta(pr.breakEvenPrice, p.breakEvenPrice, cur, true))}</div>
      <div class="col-6 col-md-4">${tile('zap', 'Break-even units', sc.breakEvenUnits ?? '—', 'was ' + (p.recommended.breakEvenUnits ?? '—'))}</div>
      <div class="col-12">${tile('target', 'Units needed for your target', `${req ?? '—'} ${p.unitLabel}s`, `to reach ${money(p.target.targetMonthlyProfit, cur, 0)} at ${money(price, cur, 0)} — was ${p.target.requiredUnitsAtRecommended ?? '—'}`, '', true)}</div></div>
      <div class="mt-3 pp-body"><strong style="font-weight:500;color:var(--pp-ink)">${better ? 'This scenario looks stronger.' : 'This scenario looks weaker.'}</strong> Compared with your recommended setup, estimated monthly profit changes by <span class="pp-delta ${better ? 'up' : 'down'}">${E.signed(sc.monthlyProfit - p.recommended.monthlyProfit, cur)}</span>. Volume assumptions are yours; we don't predict demand.</div></div>`;
  }

  function targetMetrics(m, p) {
    const cur = p.currency; const model = E.applyWhatIf(m, { units: S.target.units }); model.goals.targetMonthlyProfit = S.target.profit; const tp = E.computePricing(model);
    const high = tp.target.requiredMarginPct > p.marginBand.high;
    return `<div class="pp-card pp-card--data"><div class="row g-3">
      <div class="col-6 col-md-4">${tile('coins', 'Required profit / ' + p.unitLabel, money(tp.target.requiredProfitPerUnit, cur))}</div>
      <div class="col-6 col-md-4">${tile('target', 'Required price', money(tp.target.requiredPrice, cur), `at ${S.target.units} ${p.unitLabel}s`)}</div>
      <div class="col-6 col-md-4">${tile('scale', 'Required margin', pct(tp.target.requiredMarginPct))}</div>
      <div class="col-6 col-md-4">${tile('wallet', 'True cost at that volume', money(tp.baseCostPerUnit, cur), 'excl. % fees')}</div>
      <div class="col-6 col-md-8">${tile('chart-column', `Or keep ${money(p.recommended.price, cur, 0)} and sell`, `${tp.target.requiredUnitsAtRecommended ?? '—'} ${p.unitLabel}s / month`, '', '', true)}</div></div>
      <div class="mt-3 ${high ? 'pp-warn pp-warn-block' : 'pp-ok pp-ok-block'}">${icon(high ? 'triangle-alert' : 'circle-check', 14)}<span>At ${money(tp.target.requiredPrice, cur, 0)}, your estimated margin would be ${pct(tp.target.requiredMarginPct)}. ${high ? `That is above the typical ${pct(p.marginBand.low, 0)}–${pct(p.marginBand.high, 0)} range for this kind of business — the roadmap focuses on reaching the target by lowering costs and raising volume instead.` : `That sits within the typical ${pct(p.marginBand.low, 0)}–${pct(p.marginBand.high, 0)} range for this kind of business.`}</span></div></div>`;
  }

  function renderResults() {
    const m = model(); const p = pricing(); const r = roadmap(); const cur = p.currency; const u = p.unitLabel;
    if (!S.target) S.target = { profit: m.goals.targetMonthlyProfit, units: m.goals.expectedUnits };
    const sl = sliders(m, p); if (!Object.keys(S.wi).length) sl.forEach((s) => (S.wi[s.key] = s.base));
    const tabs = [['overview', 'Pricing', 'receipt'], ['whatif', 'What if?', 'zap'], ['target', 'Target profit', 'target']]
      .map(([t, l, ic]) => `<button class="${S.tab === t ? 'active' : ''}" data-tab="${t}">${icon(ic, 14)} ${l}</button>`).join('');
    let panel;
    if (S.tab === 'overview') {
      panel = `<h3 class="mb-3">Three ways to price it</h3><div class="row g-3"><div class="col-md-4">${scenarioCard(p.scenarios.minimum, cur, u)}</div><div class="col-md-4">${scenarioCard(p.scenarios.recommended, cur, u)}</div><div class="col-md-4">${scenarioCard(p.scenarios.premium, cur, u)}</div></div>
        <div class="row g-4 mt-2"><div class="col-lg-7"><div class="pp-card pp-card--insight h-100">
          <div class="d-flex align-items-center gap-2 mb-1">${iconBadge('lightbulb', 'pp-icon-badge--sm', 14)}<h4 class="mb-0">Why ${money(p.recommended.price, cur, 0)}?</h4></div>
          <p class="pp-body" style="margin:12px 0 20px">${explainPrice(m, p)}</p><div class="pp-subhead mb-2">Where each ${cur} of cost goes</div>${breakdown(p.costBreakdown, cur)}</div></div>
        <div class="col-lg-5"><div class="pp-card h-100"><div class="d-flex align-items-center gap-2 mb-3">${icon('scale', 15)}<h4 class="mb-0">Break-even</h4></div><div class="pp-ledger">
          <span class="pp-muted">Break-even price</span><span class="pp-num">${money(p.breakEvenPrice, cur)}</span>
          <span class="pp-muted">Variable break-even</span><span class="pp-num">${money(p.variableBreakEvenPrice, cur)}</span>
          <span class="pp-muted">Monthly fixed costs</span><span class="pp-num">${money(p.fixedMonthly, cur, 0)}</span>
          <span class="total">Break-even sales at ${money(p.recommended.price, cur, 0)}</span><span class="total pp-num">${p.recommended.breakEvenUnits ?? '—'} ${u}s / month</span></div>
          <p class="pp-muted" style="font-size:12px;margin-top:14px">The break-even price is the lowest price that covers every cost — including your share of fixed costs — at ${p.expectedUnits} ${u}s a month. Below the variable break-even you lose money on every single sale, regardless of volume.</p>
          ${p.recommended.breakEvenUnits !== null ? `<div class="pp-ok">${icon('circle-check', 13)}Sell ${p.recommended.breakEvenUnits} of your expected ${p.expectedUnits} ${u}s and the rest is profit.</div>` : ''}</div></div></div>`;
    } else if (S.tab === 'whatif') {
      const fmtv = (s, v) => (s.money ? money(v, cur, s.step < 1 ? 2 : 0) : v + (s.unit ? ' ' + s.unit : ''));
      panel = `<div class="row g-4"><div class="col-lg-5"><div class="pp-card"><div class="d-flex justify-content-between align-items-center mb-3"><h4 class="mb-0">Experiment</h4><button class="btn btn-pp-ghost btn-sm" id="wi-reset">${icon('rotate-ccw', 13)} Reset</button></div>
        ${sl.map((s) => `<div class="pp-slider"><label>${s.label} <span id="wi-val-${s.key}">${fmtv(s, S.wi[s.key])}</span></label><input type="range" id="wi-${s.key}" data-wi="${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${S.wi[s.key]}"><small>Original: ${fmtv(s, s.base)}</small></div>`).join('')}</div></div>
        <div class="col-lg-7" id="wi-metrics">${whatIfMetrics(m, p)}</div></div>`;
    } else {
      panel = `<div class="row g-4"><div class="col-lg-5"><div class="pp-card"><h4 class="mb-1">How much do you want to make per month?</h4><p class="pp-body" style="margin:6px 0 18px">Change the target and volume to see what they demand from your price.</p>
        <label class="pp-q-label" for="tgt">Target monthly profit</label><div class="pp-input-group mb-3"><span class="affix pre">${cur}</span><input id="tgt" type="number" min="0" step="any" value="${S.target.profit}"></div>
        <label class="pp-q-label" for="tu">Expected ${u}s per month</label><div class="pp-input-group"><input id="tu" type="number" min="1" step="1" value="${S.target.units}"></div></div></div>
        <div class="col-lg-7" id="tgt-metrics">${targetMetrics(m, p)}</div></div>`;
    }
    const roadmapTeaser = r && r.recommendations.length ? `<div class="pp-card mt-3">
      <div class="d-flex justify-content-between align-items-start gap-3 mb-3 flex-wrap"><span class="pp-eyebrow">${icon('map', 14)} What your roadmap is worth</span><a href="#/roadmap" class="btn btn-pp-ghost btn-sm">Open the roadmap ${icon('arrow-right', 13)}</a></div>
      ${compare(r.current.monthlyProfit, r.optimisedMonthlyProfit, cur, r.recommendations.length, false)}</div>` : '';
    return `<div class="pp-container py-5 pp-fade">
      <div class="row g-4 align-items-start">
        <div class="col-lg-7"><div class="pp-card pp-card--primary">
          <div class="d-flex justify-content-between align-items-start gap-3 mb-2"><span class="pp-eyebrow">Your recommended price · ${esc(S.offering)}</span><span class="pp-badge recommended">${icon('badge-check', 12)} Recommended</span></div>
          ${heroFigure(p.recommended.price, cur, 'pp-kpi--hero')}
          <div class="pp-subhead" style="margin:4px 0 22px">per ${u} · priced for the ${pct(p.marginBand.mid, 0)} margin typical of this kind of business</div>
          <div class="pp-stat-strip">
            <div class="pp-stat"><div class="k">${icon('wallet', 12)} True cost</div><div class="v pp-num">${money(p.trueCostPerUnit, cur)}</div></div>
            <div class="pp-stat"><div class="k">${icon('coins', 12)} Profit per ${u}</div><div class="v pp-num">${money(p.recommended.profitPerUnit, cur)}</div></div>
            <div class="pp-stat"><div class="k">${icon('scale', 12)} Margin</div><div class="v pp-num">${pct(p.recommended.marginPct)}</div></div>
          </div>
          <div class="mt-4 d-flex flex-wrap gap-2"><a href="#/roadmap" class="btn btn-pp btn-pp-hero">See my Profit Roadmap ${icon('arrow-right', 15)}</a><a href="#/analyze" class="btn btn-pp-white" id="edit-answers">${icon('square-pen', 14)} Edit answers</a></div>
        </div></div>
        <div class="col-lg-5"><div class="pp-card pp-card--data h-100">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-3"><span class="pp-eyebrow">${icon('chart-column', 14)} Monthly outlook</span><span class="pp-subhead">at ${p.expectedUnits} ${u}s</span></div>
          <div class="d-grid" style="gap:10px">
            ${tile('banknote', 'Est. monthly revenue', money(p.recommended.monthlyRevenue, cur, 0))}
            ${tile('trending-up', 'Est. monthly profit', money(p.recommended.monthlyProfit, cur, 0), '', 'var(--pp-pos)')}
            ${tile('zap', 'Break-even sales', `${p.recommended.breakEvenUnits ?? '—'} ${u}s`, `of your expected ${p.expectedUnits}`)}
          </div>
          <div class="pp-subhead mt-3">Estimates from your inputs · not a guarantee</div>
        </div></div>
      </div>
      ${p.warnings.map((w) => `<div class="mt-3"><span class="pp-warn">${icon('triangle-alert', 13)}${w}</span></div>`).join('')}
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
    const cats = order.map((k) => ({ k, meta: E.CATEGORY_META[k], items: r.recommendations.filter((x) => x.category === k) }))
      .filter((c) => c.items.length)
      .map((c) => ({ ...c, total: c.items.reduce((s, x) => s + x.estimatedMonthlyImpact, 0) }));
    const top = r.recommendations.find((x) => !x.done) || r.recommendations[0] || null;
    const topShare = top && r.sumOfImpacts > 0 ? Math.round((top.estimatedMonthlyImpact / r.sumOfImpacts) * 100) : 0;
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    const card = (rec) => {
      const share = r.sumOfImpacts > 0 ? Math.round((rec.estimatedMonthlyImpact / r.sumOfImpacts) * 100) : 0;
      return `<article class="pp-rec ${rec.done ? 'done' : ''}"><div class="d-flex align-items-start" style="gap:14px">
      <button type="button" class="pp-check mt-1 ${rec.done ? 'on' : ''}" data-toggle="${rec.id}" aria-label="${rec.done ? 'Mark as not done' : 'Mark as done'}">${icon(rec.done ? 'check' : 'plus', 13)}</button>
      <div class="flex-grow-1" style="min-width:0">
        <div class="d-flex justify-content-between align-items-start" style="gap:16px"><h4>${esc(rec.title)}</h4><div class="pp-rec__impact"><div class="v">+${money(rec.estimatedMonthlyImpact, cur, 0)}</div><div class="pp-label">est. per month</div></div></div>
        <div class="pp-rec__meta mt-2"><span class="pp-badge ${rec.priority}">${icon('chevrons-up', 11)}${E.priorityLabel(rec.priority)} priority</span><span class="pp-badge ${rec.difficulty}">${icon(DIFFICULTY_ICONS[rec.difficulty] || 'signal-medium', 11)}${rec.difficulty} to do</span>${share > 0 ? `<span class="pp-label">${share}% of the total lift</span>` : ''}</div>
        <p class="pp-body mt-3">${esc(rec.why)}</p>
        <div class="pp-rec__action mt-3">${icon('arrow-up-right', 15)}<div><div class="k">Next action</div>${esc(rec.action)}</div></div>
        ${rec.assumptions.length ? `<details class="mt-3"><summary>${icon('chevron-right', 13)} Assumptions behind this estimate</summary><ul>${rec.assumptions.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></details>` : ''}
      </div></div></article>`;
    };

    return `<div class="pp-container py-5 pp-fade">
      <div class="pp-narrow text-center mb-4"><span class="pp-chip mb-3">${icon('map', 13)} Profit Roadmap · ${esc(S.offering)}</span><h1>How to make more profit at ${money(r.current.price, cur, 0)}</h1><p class="pp-muted" style="font-size:14px;margin:10px 0 0">There are more ways to grow profit than raising your price. These are the levers that matter most for your numbers, ranked by estimated impact and effort.</p></div>

      <div class="pp-card pp-card--primary">
        ${compare(r.current.monthlyProfit, r.optimisedMonthlyProfit, cur, r.recommendations.length, false)}
        <div class="row g-3 mt-1">
          <div class="col-md-7"><div class="pp-card-bare pp-card-bare--data h-100">
            <div class="d-flex align-items-center gap-2 mb-3">${icon('chart-column', 14)}<span class="pp-eyebrow">Where the lift comes from</span></div>
            <div class="pp-waterfall">${r.recommendations.map((x) => `<div class="item"><span>${esc(x.title)}</span><span class="pp-num">+${money(x.estimatedMonthlyImpact, cur, 0)}</span><div class="track"><span style="width:${(x.estimatedMonthlyImpact / max) * 100}%"></span></div></div>`).join('')}</div>
            <div class="pp-label mt-3">Sum of items ${money(r.sumOfImpacts, cur, 0)}, reduced by ${pct(r.interactionDiscountPct, 0)} because improvements overlap.</div>
          </div></div>
          <div class="col-md-5"><div class="pp-card-bare pp-card-bare--data h-100 d-flex flex-column">
            <div class="d-flex align-items-center gap-2 mb-3">${icon('list-checks', 14)}<span class="pp-eyebrow">Your progress</span></div>
            <div class="pp-kpi pp-kpi--lg">${done}<span class="pp-subhead"> / ${r.recommendations.length} done</span></div>
            <div class="pp-progress mt-2 mb-3"><div style="width:${r.recommendations.length ? (done / r.recommendations.length) * 100 : 0}%"></div></div>
            ${p.target.targetMonthlyProfit > 0 ? `<div class="mt-auto ${r.targetReached ? 'pp-ok pp-ok-block' : 'pp-warn pp-warn-block'}">${icon(r.targetReached ? 'circle-check' : 'triangle-alert', 14)}<span>${r.targetReached ? 'Reaches' : 'Still short of'} your ${money(p.target.targetMonthlyProfit, cur, 0)} monthly target.</span></div>` : ''}
          </div></div>
        </div>
      </div>

      ${top ? `<div class="pp-card pp-card--insight mt-3">
        <div class="pp-spot__head">${iconBadge('sparkles', 'pp-icon-badge--sm', 14)} Start here — your best next move</div>
        <div class="d-flex justify-content-between align-items-start flex-wrap" style="gap:16px">
          <div style="min-width:0;flex:1 1 320px"><h3 class="mb-2">${esc(top.title)}</h3><p class="pp-body mb-3">${esc(top.action)}</p>
            <div class="pp-spot__meta"><span class="pp-badge ${top.priority}">${icon('chevrons-up', 11)}${cap(top.priority)} priority</span><span class="pp-badge ${top.difficulty}">${icon(DIFFICULTY_ICONS[top.difficulty] || 'signal-medium', 11)}${top.difficulty} to do</span></div></div>
          <div class="pp-stat pp-stat--accent" style="flex:0 0 auto;min-width:190px"><div class="k">${icon('trending-up', 12)} Estimated impact</div><div class="v pp-num">+${money(top.estimatedMonthlyImpact, cur, 0)}</div><div class="pp-label mt-1">per month · ${topShare}% of the total lift</div></div>
        </div></div>` : ''}

      <div class="pp-card pp-card--insight mt-3"><div class="d-flex align-items-start gap-2">${iconBadge('lightbulb', 'pp-icon-badge--sm', 14)}<p class="pp-body mb-0">${explainRoadmap(m, r)}</p></div></div>

      ${cats.map((c) => `<div class="pp-cat-head">${iconBadge(CATEGORY_ICONS[c.k] || 'trending-up')}<div><h3 class="mb-0">${c.meta.label}</h3><div class="pp-muted" style="font-size:12px">${c.meta.blurb}</div></div><span class="pp-badge ms-auto">+${money(c.total, cur, 0)} / mo</span></div><div class="d-grid" style="gap:var(--pp-grid-gap)">${c.items.map(card).join('')}</div>`).join('')}

      <div class="pp-notice pp-notice-block mt-5">${icon('info', 14)}<span>${r.disclaimer}</span></div>
      <div class="d-flex flex-wrap gap-2 mt-4"><a href="#/results" class="btn btn-pp-white">${icon('arrow-left', 14)} Back to pricing</a><a href="#/analyze" class="btn btn-pp-ghost" id="new-analysis">${icon('rotate-ccw', 14)} Analyse another business</a></div></div>`;
  }

  // ---------- events ----------
  function bind() {
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
      root.querySelector('#wi-val-' + s.key).textContent = s.money ? money(el.valueAsNumber, p.currency, s.step < 1 ? 2 : 0) : el.valueAsNumber + (s.unit ? ' ' + s.unit : '');
      root.querySelector('#wi-metrics').innerHTML = whatIfMetrics(m, p); persist();
    }));
    root.querySelector('#wi-reset')?.addEventListener('click', () => { S.wi = {}; render(); });
    const onTarget = () => { S.target.profit = Number(root.querySelector('#tgt').value) || 0; S.target.units = Math.max(1, Number(root.querySelector('#tu').value) || 1); root.querySelector('#tgt-metrics').innerHTML = targetMetrics(m, p); persist(); };
    root.querySelector('#tgt')?.addEventListener('input', onTarget); root.querySelector('#tu')?.addEventListener('input', onTarget);
    root.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => { const id = b.dataset.toggle; S.completedIds = S.completedIds.includes(id) ? S.completedIds.filter((x) => x !== id) : [...S.completedIds, id]; render(); }));
  }

  if (S.step > 0 && S.type && !Object.keys(S.formValues).length) initForm();
  render();
})();
