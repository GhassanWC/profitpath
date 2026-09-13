/* ProfitPath live preview — vanilla JS port of the Angular pages, driven by the same compiled engine. */
(function () {
  const E = ProfitPathEngine;
  const root = document.getElementById('app');
  const money = (v, cur, d) => (v === null || v === undefined ? '—' : E.formatMoney(v, cur, { decimals: d }));
  const pct = (f, d = 1) => E.formatPct(f, d);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  /* The hero figure sets its currency mark at 0.45em and muted, so the two
     halves are rendered separately (no mark for suffix-style currencies). */
  const splitMoney = (v, cur) => { const s = money(v, cur, 0); const m = /^([^\d-]*)(.*)$/.exec(s); return m ? [m[1].trim(), m[2]] : ['', s]; };
  const currencyMark = (v, cur) => esc(splitMoney(v, cur)[0]);
  const figure = (v, cur) => esc(splitMoney(v, cur)[1]);

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

  function renderShell(inner) {
    const has = !!pricing();
    const r = route();
    const nav = (p, l) => `<a href="#/${p}" class="${r === p ? 'active' : ''}">${l}</a>`;
    return `<header class="pp-header"><div class="pp-container"><div class="pp-header-pill">
      <a href="#/" class="pp-logo"><svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#0f766e"/><path d="M14 44 L26 30 L36 38 L50 20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="50" cy="20" r="5" fill="#a7f3d0"/></svg>ProfitPath</a>
      <nav class="pp-nav d-none d-sm-block">${nav('analyze', 'Calculator')}${has ? nav('results', 'Results') + nav('roadmap', 'Roadmap') : ''}</nav>
      <a href="#/analyze" class="btn btn-pp btn-sm">Calculate my price</a></div></div></header>
      <main>${inner}</main>
      <footer class="pp-footer"><div class="pp-container d-flex flex-wrap justify-content-between gap-3"><div>© ${new Date().getFullYear()} ProfitPath · Estimates based on your inputs, not financial advice or a guarantee of results.</div><div>Live preview of the Angular MVP · all calculations deterministic</div></div></footer>`;
  }

  // ---------- landing ----------
  function renderLanding() {
    const s = E.SAMPLES[0]; const m = E.normalizeAnswers(s.type, s.answers, s.offering); const p = E.computePricing(m); const r = E.buildRoadmap(m, p);
    const chips = E.BUSINESS_TYPE_LIST.map((t) => `<span class="pp-chip">${t.icon} ${t.shortLabel}</span>`).join('');
    const recMax = Math.max(1, ...r.recommendations.slice(0, 3).map((x) => x.estimatedMonthlyImpact));
    const recs = r.recommendations.slice(0, 3).map((x) => `<div class="item"><span>${esc(x.title)}</span><span class="pp-num">+${money(x.estimatedMonthlyImpact, 'USD', 0)}/mo</span><div class="track"><span style="width:${(x.estimatedMonthlyImpact / recMax) * 100}%"></span></div></div>`).join('');
    return `
    <section class="pp-hero pp-container pp-fade">
      <span class="pp-chip mb-4">Pricing intelligence + profit roadmap</span>
      <h1>How much should <span class="pp-gradient-text">you charge?</span></h1>
      <p class="lead">Tell us what you're selling, what it costs you, and what you want to earn. We'll calculate your ideal price and show you how to improve your profit.</p>
      <div class="d-flex flex-wrap justify-content-center gap-2"><a href="#/analyze" class="btn btn-pp btn-pp-lg">Calculate My Price</a><button type="button" class="btn btn-pp-glass btn-pp-lg" data-action="example">See an Example</button></div>
      <div class="d-flex flex-wrap justify-content-center gap-2 mt-4">${chips}</div>
    </section>
    <section class="pp-section pp-container"><div class="row g-4 align-items-start">
      <div class="col-lg-5"><div class="pp-card h-100"><div class="pp-eyebrow">Example</div><div class="pp-subhead mb-3">30 units a month · target profit $5,000</div><h3 class="mb-3" style="font-size:20px">"I'm selling iPhones."</h3>
        <div class="pp-ledger"><span class="pp-muted">Purchase</span><span class="pp-num">${money(850, 'USD', 0)}</span><span class="pp-muted">Shipping</span><span class="pp-num">${money(45, 'USD', 0)}</span><span class="pp-muted">Marketing per unit</span><span class="pp-num">${money(35, 'USD', 0)}</span><span class="pp-muted">Overhead per unit</span><span class="pp-num">${money(p.allocatedOverhead, 'USD', 0)}</span><span class="total">True cost</span><span class="total pp-num">${money(p.trueCostPerUnit, 'USD', 0)}</span></div></div></div>
      <div class="col-lg-7"><div class="pp-card h-100"><div class="d-flex justify-content-between align-items-start gap-3 mb-3"><div class="pp-eyebrow">ProfitPath calculates</div><button type="button" class="btn btn-pp btn-sm" data-action="example">Open this example</button></div>
        <div class="row g-3"><div class="col-6 col-md-4"><div class="pp-metric"><div class="pp-eyebrow">Recommended price</div><div class="pp-kpi">${money(p.recommended.price, 'USD', 0)}</div></div></div><div class="col-6 col-md-4"><div class="pp-metric"><div class="pp-eyebrow">Profit / unit</div><div class="pp-kpi">${money(p.recommended.profitPerUnit, 'USD', 0)}</div></div></div><div class="col-6 col-md-4"><div class="pp-metric"><div class="pp-eyebrow">Margin</div><div class="pp-kpi">${pct(p.recommended.marginPct)}</div></div></div></div>
        <div class="pp-subhead" style="margin:20px 0 12px">Here's how you could make even more</div><div class="pp-waterfall">${recs}</div>
        <div class="d-flex justify-content-between align-items-center gap-3 pt-3 mt-3" style="border-top:1px solid var(--pp-line);font-size:13px"><span>Estimated monthly profit → optimised</span><span class="pp-kpi pp-kpi-sm">${money(p.recommended.monthlyProfit, 'USD', 0)} → ${money(r.optimisedMonthlyProfit, 'USD', 0)}</span></div>
        <p class="pp-muted mt-3 mb-0" style="font-size:11px">Estimates, not guarantees. Every number above is computed from the inputs on the left.</p></div></div>
    </div></section>
    <section class="pp-section pp-container"><div class="text-center mb-4"><h2>How it works</h2><p class="pp-muted">A conversation, not a spreadsheet. Five minutes from idea to price.</p></div>
      <div class="pp-flow">
        <div class="pp-card"><div class="pp-step-num">1</div><h5>Tell us what you sell</h5><p class="pp-muted mb-0">Type it in plain words. We detect whether it's a product, service, food, digital or SaaS business and ask only the questions that matter for it.</p></div>
        <div class="pp-card"><div class="pp-step-num">2</div><h5>Answer a few questions</h5><p class="pp-muted mb-0">Costs, fees, fixed expenses and your goals — a few at a time, each with a plain explanation of why we ask.</p></div>
        <div class="pp-card"><div class="pp-step-num">3</div><h5>Get your price</h5><p class="pp-muted mb-0">True cost, break-even, three pricing scenarios and the price you need to hit your target profit — with the reasoning behind each number.</p></div>
        <div class="pp-card"><div class="pp-step-num">4</div><h5>Follow your roadmap</h5><p class="pp-muted mb-0">Prioritised, quantified ways to make more profit at that price: cheaper sourcing, lower acquisition cost, upsells, better channels.</p></div>
      </div></section>
    <section class="pp-section pp-container"><div class="text-center mb-4"><h2>Simple pricing</h2><p class="pp-muted">Start free. Upgrade when the roadmap pays for itself.</p></div>
      <div class="row g-3 justify-content-center">
        <div class="col-md-4"><div class="pp-card h-100"><div class="pp-subhead">Free</div><div class="pp-kpi pp-kpi-lg my-2">$0</div><ul class="pp-muted ps-3 mb-0" style="font-size:13px;line-height:1.9"><li>Pricing calculator</li><li>Recommended price &amp; three scenarios</li><li>Break-even analysis</li><li>One saved business</li></ul></div></div>
        <div class="col-md-4"><div class="pp-card pp-card-dark h-100"><div class="pp-subhead">Pro</div><div class="pp-kpi pp-kpi-lg my-2">$9<span class="pp-muted" style="font-size:13px">/month</span></div><ul class="ps-3 mb-0" style="font-size:13px;line-height:1.9"><li>Everything in Free</li><li>Full Profit Roadmap</li><li>What-if simulator</li><li>Unlimited saved businesses</li><li>PDF reports</li></ul></div></div>
        <div class="col-md-4"><div class="pp-card h-100"><div class="pp-subhead">Business</div><div class="pp-kpi pp-kpi-lg my-2">$19<span class="pp-muted" style="font-size:13px">/month</span></div><ul class="pp-muted ps-3 mb-0" style="font-size:13px;line-height:1.9"><li>Everything in Pro</li><li>Team members</li><li>Scenario comparison</li><li>Market research (coming)</li></ul></div></div>
      </div></section>
    <section class="pp-section pp-container text-center"><div class="pp-card" style="padding-block:60px"><h2>Ready to find out what to charge?</h2><p class="pp-muted mb-4" style="font-size:13px">No sign-up needed for your first analysis.</p><a href="#/analyze" class="btn btn-pp btn-pp-lg">Calculate My Price</a></div></section>`;
  }

  // ---------- analyze ----------
  const groups = () => (S.type ? E.questionGroupsFor(S.type) : []);
  const merged = () => ({ ...S.answers, ...S.formValues });
  function currentGroup() { return groups()[S.step - 1] || null; }

  function renderAnalyze() {
    const total = groups().length + 1;
    const def = S.type ? E.businessTypeDef(S.type) : null;
    let body;
    if (S.step === 0) {
      const d = S.detection;
      const detect = d && d.confidence > 0 ? `<div class="pp-detect mb-4 pp-fade"><span class="icon">${E.businessTypeDef(d.type).icon}</span><div><div class="title">Looks like: ${E.businessTypeDef(d.type).label}</div><div style="font-size:12px;color:var(--pp-ink-2)">${d.confidence >= 0.7 ? 'High confidence' : d.confidence >= 0.4 ? 'Fairly confident' : 'Best guess'} · Not right? Pick a type below.</div></div></div>` : '';
      const cards = E.BUSINESS_TYPE_LIST.map((t) => `<button type="button" class="pp-type-card ${S.selectedType === t.type ? 'selected' : ''}" data-type="${t.type}"><div class="icon">${t.icon}</div><div class="name">${t.label}</div><small>${t.description}</small></button>`).join('');
      body = `<div class="pp-card pp-fade"><h2 class="mb-1">What are you planning to sell?</h2><p class="pp-muted mb-4">Describe it in your own words. We'll tailor the next questions to your kind of business.</p>
        <div class="pp-input-group mb-3"><input id="offering" type="text" value="${esc(S.offering)}" placeholder="e.g. iPhone 17 Pro, wedding photography, soy candles, online course…" autofocus></div>
        <div id="detect">${detect}</div><div class="pp-subhead mb-2">Business type</div><div class="pp-option-grid mb-4" id="typegrid">${cards}</div>
        <div class="d-flex justify-content-end"><button class="btn btn-pp" id="start" ${!S.selectedType || !S.offering.trim() ? 'disabled' : ''}>Continue →</button></div></div>`;
    } else {
      const g = currentGroup();
      const cur = merged().currency || 'USD';
      const qs = E.visibleQuestions(g, merged()).map((q) => renderQuestion(q, cur)).join('');
      const last = S.step === groups().length;
      body = `<form class="pp-card pp-fade" id="qform"><h2 class="mb-1">${g.title}</h2><p class="pp-muted mb-4">${g.intro}</p>${qs}
        <div class="d-flex justify-content-between align-items-center mt-2"><button type="button" class="btn btn-pp-ghost" id="back">← Back</button><button type="submit" class="btn btn-pp">${last ? 'Calculate my price' : 'Continue →'}</button></div></form>
        <p class="pp-notice mt-3 text-center">Leave a cost at 0 if it doesn't apply. You can change every number later in the what-if simulator.</p>`;
    }
    return `<div class="pp-container py-5"><div class="pp-narrow">
      <div class="d-flex justify-content-between align-items-center mb-2" style="font-size:12px;color:var(--pp-ink-2)"><span>Step ${S.step + 1} of ${total}</span>${S.step > 0 ? `<span>${def.icon} ${def.label} · ${esc(S.offering)}</span>` : ''}</div>
      <div class="pp-progress mb-4"><div style="width:${((S.step + 1) / total) * 100}%"></div></div>${body}</div></div>`;
  }

  function renderQuestion(q, cur) {
    const v = S.formValues[q.key];
    const err = S.errors[q.key];
    let field;
    if (q.type === 'select') field = `<div class="pp-option-grid">${q.options.map((o) => `<button type="button" class="pp-option ${v === o.value ? 'selected' : ''}" data-select="${q.key}" data-value="${o.value}"><span>${o.label}${o.hint ? `<small>${o.hint}</small>` : ''}</span></button>`).join('')}</div>`;
    else if (q.type === 'multiselect') field = `<div class="pp-option-grid">${q.options.map((o) => `<button type="button" class="pp-option ${Array.isArray(v) && v.includes(o.value) ? 'selected' : ''}" data-multi="${q.key}" data-value="${o.value}"><span>${o.label}</span></button>`).join('')}</div>`;
    else if (q.type === 'currency') field = `<div class="pp-input-group ${err ? 'is-invalid' : ''}"><select id="${q.key}" data-field="${q.key}">${q.options.map((o) => `<option value="${o.value}" ${(v || q.defaultValue) === o.value ? 'selected' : ''}>${o.label}</option>`).join('')}</select></div>`;
    else if (q.type === 'text') field = `<div class="pp-input-group ${err ? 'is-invalid' : ''}"><input id="${q.key}" type="text" data-field="${q.key}" value="${esc(v ?? '')}" placeholder="${esc(q.placeholder || '')}"></div>`;
    else field = `<div class="pp-input-group ${err ? 'is-invalid' : ''}">${q.money ? `<span class="affix pre">${cur}</span>` : ''}<input id="${q.key}" type="number" inputmode="decimal" step="any" ${q.min !== undefined ? `min="${q.min}"` : ''} data-field="${q.key}" value="${v ?? ''}" placeholder="${esc(q.placeholder || '')}">${q.suffix ? `<span class="affix">${q.suffix}</span>` : ''}</div>`;
    return `<div class="mb-4"><label class="pp-q-label d-block" for="${q.key}">${q.label}</label><div class="pp-q-help">${q.help}</div>${field}${err ? `<div class="pp-error">${err}</div>` : ''}</div>`;
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
  function tile(label, value, sub, color, small) { return `<div class="pp-metric"><div class="pp-eyebrow">${label}</div><div class="pp-kpi ${small ? 'pp-kpi-sm' : ''}" style="${color ? 'color:' + color : ''}">${value}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`; }
  function scenarioCard(sc, cur, unit) {
    const st = sc.status === 'low' ? '⚠️ Thin margin' : sc.status === 'recommended' ? '🟢 Recommended' : sc.status === 'premium' ? '🔵 Higher margin' : '🔴 Loss';
    return `<div class="pp-scenario ${sc.key === 'recommended' ? 'recommended' : ''}"><div class="d-flex justify-content-between align-items-center gap-2 mb-2"><span class="pp-muted" style="font-size:12px">${sc.label}</span><span class="pp-badge ${sc.status}">${st}</span></div><div class="price pp-num">${money(sc.price, cur, 0)}</div>
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
    return `<div class="pp-card"><div class="row g-3">
      <div class="col-6 col-md-4">${tile('Monthly profit', money(sc.monthlyProfit, cur, 0), delta(sc.monthlyProfit, p.recommended.monthlyProfit, cur), better ? 'var(--pp-pos)' : 'var(--pp-neg)')}</div>
      <div class="col-6 col-md-4">${tile('Monthly revenue', money(sc.monthlyRevenue, cur, 0), delta(sc.monthlyRevenue, p.recommended.monthlyRevenue, cur))}</div>
      <div class="col-6 col-md-4">${tile('Profit / ' + p.unitLabel, money(sc.profitPerUnit, cur), delta(sc.profitPerUnit, p.recommended.profitPerUnit, cur))}</div>
      <div class="col-6 col-md-4">${tile('Margin', pct(sc.marginPct), deltaPts(sc.marginPct, p.recommended.marginPct))}</div>
      <div class="col-6 col-md-4">${tile('Break-even price', money(pr.breakEvenPrice, cur), delta(pr.breakEvenPrice, p.breakEvenPrice, cur, true))}</div>
      <div class="col-6 col-md-4">${tile('Break-even units', sc.breakEvenUnits ?? '—', 'was ' + (p.recommended.breakEvenUnits ?? '—'))}</div>
      <div class="col-12">${tile('Units needed for your target', `${req ?? '—'} ${p.unitLabel}s`, `to reach ${money(p.target.targetMonthlyProfit, cur, 0)} at ${money(price, cur, 0)} — was ${p.target.requiredUnitsAtRecommended ?? '—'}`, '', true)}</div></div>
      <div class="mt-3" style="font-size:13px;color:var(--pp-ink-2)"><strong style="font-weight:500;color:var(--pp-ink)">${better ? 'This scenario looks stronger.' : 'This scenario looks weaker.'}</strong> Compared with your recommended setup, estimated monthly profit changes by <span class="pp-delta ${better ? 'up' : 'down'}">${E.signed(sc.monthlyProfit - p.recommended.monthlyProfit, cur)}</span>. Volume assumptions are yours; we don't predict demand.</div></div>`;
  }
  function targetMetrics(m, p) {
    const cur = p.currency; const model = E.applyWhatIf(m, { units: S.target.units }); model.goals.targetMonthlyProfit = S.target.profit; const tp = E.computePricing(model);
    const high = tp.target.requiredMarginPct > p.marginBand.high;
    return `<div class="pp-card"><div class="row g-3">
      <div class="col-6 col-md-4">${tile('Required profit / ' + p.unitLabel, money(tp.target.requiredProfitPerUnit, cur))}</div>
      <div class="col-6 col-md-4">${tile('Required price', money(tp.target.requiredPrice, cur), `at ${S.target.units} ${p.unitLabel}s`, 'var(--pp-accent)')}</div>
      <div class="col-6 col-md-4">${tile('Required margin', pct(tp.target.requiredMarginPct))}</div>
      <div class="col-6 col-md-4">${tile('True cost at that volume', money(tp.baseCostPerUnit, cur), 'excl. % fees')}</div>
      <div class="col-6 col-md-8">${tile(`Or keep ${money(p.recommended.price, cur, 0)} and sell`, `${tp.target.requiredUnitsAtRecommended ?? '—'} ${p.unitLabel}s / month`, '', '', true)}</div></div>
      <div class="mt-3 ${high ? 'pp-warn pp-warn-block' : 'pp-ok pp-ok-block'}">At ${money(tp.target.requiredPrice, cur, 0)}, your estimated margin would be ${pct(tp.target.requiredMarginPct)}. ${high ? `That is above the typical ${pct(p.marginBand.low, 0)}–${pct(p.marginBand.high, 0)} range for this kind of business — the roadmap focuses on reaching the target by lowering costs and raising volume instead.` : `That sits within the typical ${pct(p.marginBand.low, 0)}–${pct(p.marginBand.high, 0)} range for this kind of business.`}</div></div>`;
  }

  function renderResults() {
    const m = model(); const p = pricing(); const cur = p.currency; const u = p.unitLabel;
    if (!S.target) S.target = { profit: m.goals.targetMonthlyProfit, units: m.goals.expectedUnits };
    const sl = sliders(m, p); if (!Object.keys(S.wi).length) sl.forEach((s) => (S.wi[s.key] = s.base));
    const tabs = ['overview', 'whatif', 'target'].map((t) => `<button class="${S.tab === t ? 'active' : ''}" data-tab="${t}">${t === 'overview' ? 'Pricing' : t === 'whatif' ? 'What if?' : 'Target profit'}</button>`).join('');
    let panel;
    if (S.tab === 'overview') {
      panel = `<h3 class="mb-3">Three ways to price it</h3><div class="row g-3"><div class="col-md-4">${scenarioCard(p.scenarios.minimum, cur, u)}</div><div class="col-md-4">${scenarioCard(p.scenarios.recommended, cur, u)}</div><div class="col-md-4">${scenarioCard(p.scenarios.premium, cur, u)}</div></div>
        <div class="row g-4 mt-2"><div class="col-lg-7"><div class="pp-card h-100"><h4 class="mb-1">Why ${money(p.recommended.price, cur, 0)}?</h4><div class="pp-subhead">Where each ${cur} of cost goes</div><p style="color:var(--pp-ink-2);font-size:13px;margin:12px 0 20px">${explainPrice(m, p)}</p>${breakdown(p.costBreakdown, cur)}</div></div>
        <div class="col-lg-5"><div class="pp-card h-100"><h4 class="mb-3">Break-even</h4><div class="pp-ledger">
          <span class="pp-muted">Break-even price</span><span class="pp-num">${money(p.breakEvenPrice, cur)}</span>
          <span class="pp-muted">Variable break-even</span><span class="pp-num">${money(p.variableBreakEvenPrice, cur)}</span>
          <span class="pp-muted">Monthly fixed costs</span><span class="pp-num">${money(p.fixedMonthly, cur, 0)}</span>
          <span class="total">Break-even sales at ${money(p.recommended.price, cur, 0)}</span><span class="total pp-num">${p.recommended.breakEvenUnits ?? '—'} ${u}s / month</span></div>
          <p class="pp-muted" style="font-size:12px;margin-top:14px">The break-even price is the lowest price that covers every cost — including your share of fixed costs — at ${p.expectedUnits} ${u}s a month. Below the variable break-even you lose money on every single sale, regardless of volume.</p>
          ${p.recommended.breakEvenUnits !== null ? `<div class="pp-ok">Sell ${p.recommended.breakEvenUnits} of your expected ${p.expectedUnits} ${u}s and the rest is profit.</div>` : ''}</div></div></div>`;
    } else if (S.tab === 'whatif') {
      const fmtv = (s, v) => (s.money ? money(v, cur, s.step < 1 ? 2 : 0) : v + (s.unit ? ' ' + s.unit : ''));
      panel = `<div class="row g-4"><div class="col-lg-5"><div class="pp-card"><div class="d-flex justify-content-between align-items-center mb-3"><h4 class="mb-0">Experiment</h4><button class="btn btn-pp-ghost btn-sm" id="wi-reset">Reset</button></div>
        ${sl.map((s) => `<div class="pp-slider mb-3"><label>${s.label} <span id="wi-val-${s.key}">${fmtv(s, S.wi[s.key])}</span></label><input type="range" id="wi-${s.key}" data-wi="${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${S.wi[s.key]}"><small>Original: ${fmtv(s, s.base)}</small></div>`).join('')}</div></div>
        <div class="col-lg-7" id="wi-metrics">${whatIfMetrics(m, p)}</div></div>`;
    } else {
      panel = `<div class="row g-4"><div class="col-lg-5"><div class="pp-card"><h4 class="mb-1">How much do you want to make per month?</h4><p class="pp-muted">Change the target and volume to see what they demand from your price.</p>
        <label class="pp-q-label" for="tgt">Target monthly profit</label><div class="pp-input-group mb-3"><span class="affix pre">${cur}</span><input id="tgt" type="number" min="0" step="any" value="${S.target.profit}"></div>
        <label class="pp-q-label" for="tu">Expected ${u}s per month</label><div class="pp-input-group"><input id="tu" type="number" min="1" step="1" value="${S.target.units}"></div></div></div>
        <div class="col-lg-7" id="tgt-metrics">${targetMetrics(m, p)}</div></div>`;
    }
    return `<div class="pp-container py-5 pp-fade">
      <div class="row g-4 align-items-stretch"><div class="col-lg-5"><div class="pp-card h-100 d-flex flex-column justify-content-between"><div><div class="pp-eyebrow mb-3">Your recommended price · ${esc(S.offering)}</div>
        <div class="pp-kpi pp-kpi-xl"><span class="cur">${currencyMark(p.recommended.price, cur)}</span>${figure(p.recommended.price, cur)}</div><div class="pp-subhead mt-1">per ${u} · ${pct(p.marginBand.mid, 0)} target margin</div>
        <div class="pp-split mt-4"><div class="side left"><div class="fig">${money(p.trueCostPerUnit, cur, 0)}</div><div class="cap">True cost</div></div>
          <div class="pp-orb"><div><div class="fig">${money(p.recommended.profitPerUnit, cur, 0)}</div><div class="cap">Profit / ${u}</div></div></div>
          <div class="side right"><div class="fig">${pct(p.recommended.marginPct)}</div><div class="cap">Margin</div></div></div></div>
        <div class="mt-4 d-flex flex-wrap gap-2"><a href="#/roadmap" class="btn btn-pp">See my Profit Roadmap →</a><a href="#/analyze" class="btn btn-pp-white" id="edit-answers">Edit answers</a></div></div></div>
        <div class="col-lg-7"><div class="pp-card h-100"><div class="d-flex justify-content-between align-items-start gap-3 mb-3"><div class="pp-eyebrow">Monthly outlook</div><span class="pp-notice">Estimates · not a guarantee</span></div><div class="row g-3">
          <div class="col-6 col-md-4">${tile('True cost', money(p.trueCostPerUnit, cur), `per ${u} incl. overhead &amp; fees`)}</div>
          <div class="col-6 col-md-4">${tile('Profit per ' + u, money(p.recommended.profitPerUnit, cur))}</div>
          <div class="col-6 col-md-4">${tile('Profit margin', pct(p.recommended.marginPct))}</div>
          <div class="col-6 col-md-4">${tile('Expected monthly sales', p.expectedUnits, u + 's per month')}</div>
          <div class="col-6 col-md-4">${tile('Est. monthly revenue', money(p.recommended.monthlyRevenue, cur, 0))}</div>
          <div class="col-6 col-md-4">${tile('Est. monthly profit', money(p.recommended.monthlyProfit, cur, 0), '', 'var(--pp-pos)')}</div></div></div></div></div>
      ${p.warnings.map((w) => `<div class="mt-3"><span class="pp-warn">${w}</span></div>`).join('')}
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-5 mb-3"><div class="pp-tabs">${tabs}</div><span class="pp-notice">Estimates from your inputs · not a guarantee</span></div>
      <div class="pp-fade">${panel}</div></div>`;
  }

  // ---------- roadmap ----------
  function renderRoadmap() {
    const m = model(); const p = pricing(); const r = roadmap(); const cur = p.currency; const u = p.unitLabel;
    const max = Math.max(1, ...r.recommendations.map((x) => x.estimatedMonthlyImpact));
    const done = r.recommendations.filter((x) => x.done).length;
    const order = ['reduce_costs', 'reduce_cac', 'increase_revenue', 'increase_value'];
    const cats = order.map((k) => ({ k, meta: E.CATEGORY_META[k], items: r.recommendations.filter((x) => x.category === k) })).filter((c) => c.items.length);
    const card = (rec) => `<article class="pp-rec ${rec.done ? 'done' : ''}"><div class="d-flex align-items-start" style="gap:14px"><button type="button" class="pp-check mt-1 ${rec.done ? 'on' : ''}" data-toggle="${rec.id}" aria-label="${rec.done ? 'Mark as not done' : 'Mark as done'}">${rec.done ? '✓' : ''}</button><div class="flex-grow-1" style="min-width:0">
      <div class="d-flex flex-wrap gap-2 align-items-center"><span class="pp-badge ${rec.priority}">${E.priorityLabel(rec.priority)} priority</span><span class="pp-badge ${rec.difficulty}">${rec.difficulty}</span></div>
      <div class="d-flex justify-content-between align-items-start" style="gap:16px"><h4>${esc(rec.title)}</h4><div class="text-end"><div class="impact">+${money(rec.estimatedMonthlyImpact, cur, 0)}</div><div class="pp-muted" style="font-size:11px">est. per month</div></div></div>
      <div style="margin-top:12px"><div class="label">Why</div><p>${esc(rec.why)}</p><div class="label">Suggested action</div><p>${esc(rec.action)}</p></div>
      ${rec.assumptions.length ? `<details><summary>Assumptions behind this estimate</summary><ul>${rec.assumptions.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></details>` : ''}</div></div></article>`;
    return `<div class="pp-container py-5 pp-fade">
      <div class="pp-narrow text-center mb-4"><span class="pp-chip mb-3">🗺️ Profit Roadmap · ${esc(S.offering)}</span><h1>How to make more profit at ${money(r.current.price, cur, 0)}</h1><p class="pp-muted" style="font-size:14px;margin:10px 0 0">There are more ways to grow profit than raising your price. These are the levers that matter most for your numbers, ranked by estimated impact and effort.</p></div>
      <div class="row g-4 align-items-start"><div class="col-lg-4"><div class="pp-card h-100"><div class="pp-eyebrow mb-3">Current situation</div><div class="pp-ledger">
        <span class="pp-muted">Selling price</span><span class="pp-num">${money(r.current.price, cur, 0)}</span><span class="pp-muted">True cost</span><span class="pp-num">${money(r.current.trueCostPerUnit, cur)}</span><span class="pp-muted">Profit / ${u}</span><span class="pp-num">${money(r.current.profitPerUnit, cur)}</span><span class="pp-muted">${u}s / month</span><span class="pp-num">${r.current.units}</span><span class="pp-muted">Margin</span><span class="pp-num">${pct(r.current.marginPct)}</span><span class="total">Monthly profit</span><span class="total pp-num">${money(r.current.monthlyProfit, cur, 0)}</span></div></div></div>
        <div class="col-lg-8"><div class="pp-panel h-100"><div class="row g-3 align-items-stretch"><div class="col-md-5"><div class="pp-trend h-100"><div class="pp-eyebrow">Optimised estimated monthly profit</div><div class="pp-kpi pp-kpi-lg mt-2">${money(r.optimisedMonthlyProfit, cur, 0)}</div><div class="pp-muted" style="font-size:11px">from ${money(r.current.monthlyProfit, cur, 0)} today · <strong>+${money(r.optimisedMonthlyProfit - r.current.monthlyProfit, cur, 0)}</strong></div>
          <div style="position:relative;margin-top:14px;height:64px"><svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;overflow:visible" role="img" aria-label="Cumulative profit as each roadmap item lands"><path d="${trendPath(r)}" fill="none" stroke="#fff" stroke-width="1.4" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"></path></svg><span style="position:absolute;left:0;bottom:-4px;font-size:10px;color:rgba(255,255,255,.8)">today</span><span style="position:absolute;right:0;top:-6px;font-size:10px;color:rgba(255,255,255,.8)">optimised</span></div></div></div>
          <div class="col-md-7"><div class="pp-card-bare h-100"><div class="pp-eyebrow mb-3">Where the lift comes from</div><div class="pp-waterfall">${r.recommendations.map((x) => `<div class="item"><span>${esc(x.title)}</span><span class="pp-num">+${money(x.estimatedMonthlyImpact, cur, 0)}</span><div class="track"><span style="width:${(x.estimatedMonthlyImpact / max) * 100}%"></span></div></div>`).join('')}</div><div class="pp-muted mt-3" style="font-size:11px">Sum of items ${money(r.sumOfImpacts, cur, 0)}, reduced by ${pct(r.interactionDiscountPct, 0)} because improvements overlap.${p.target.targetMonthlyProfit > 0 ? ` ${r.targetReached ? 'Reaches' : 'Still short of'} your ${money(p.target.targetMonthlyProfit, cur, 0)} target.` : ''}</div></div></div></div></div></div></div>
      <div class="pp-card mt-3"><div class="d-flex justify-content-between flex-wrap gap-2 align-items-center"><div style="font-size:13px"><strong style="font-weight:500">Roadmap progress:</strong> ${done}/${r.recommendations.length} completed</div><div class="pp-progress" style="width:min(320px,100%)"><div style="width:${(done / r.recommendations.length) * 100}%"></div></div></div><p class="mb-0 mt-2" style="font-size:13px;color:var(--pp-ink-2)">${explainRoadmap(m, r)}</p></div>
      ${cats.map((c) => `<div class="pp-cat-head"><span class="icon">${c.meta.icon}</span><div><h3 class="mb-0">${c.meta.label}</h3><div class="pp-muted" style="font-size:12px">${c.meta.blurb}</div></div></div><div class="d-grid" style="gap:var(--pp-grid-gap)">${c.items.map(card).join('')}</div>`).join('')}
      <div class="pp-notice pp-notice-block mt-5">${r.disclaimer}</div>
      <div class="d-flex flex-wrap gap-2 mt-4"><a href="#/results" class="btn btn-pp-white">← Back to pricing</a><a href="#/analyze" class="btn btn-pp-ghost" id="new-analysis">Analyse another business</a></div></div>`;
  }

  /* The trend line is cumulative, not decorative: profit today, then each
     recommendation's share of the (discounted) lift in rank order, so the last
     point is exactly the optimised figure shown above it. */
  function trendPath(r) {
    const lift = r.optimisedMonthlyProfit - r.current.monthlyProfit;
    const sum = r.sumOfImpacts || 1;
    let cumulative = 0;
    const points = [r.current.monthlyProfit].concat(r.recommendations.map((rec) => {
      cumulative += rec.estimatedMonthlyImpact;
      return r.current.monthlyProfit + (cumulative / sum) * lift;
    }));
    if (points.length < 2) return '';
    const hi = Math.max(...points); const lo = Math.min(...points);
    return points.map((v, i) => `${i ? 'L' : 'M'}${((i / (points.length - 1)) * 100).toFixed(2)} ${(100 - ((v - lo) / (hi - lo || 1)) * 100).toFixed(2)}`).join(' ');
  }

  // ---------- events ----------
  function bind() {
    root.querySelectorAll('[data-action="example"]').forEach((el) => el.addEventListener('click', () => { const s = E.SAMPLES[0]; Object.assign(S, { offering: s.offering, type: s.type, selectedType: s.type, answers: { ...s.answers }, completedIds: [], complete: true, step: 0, wi: {}, target: null, tab: 'overview' }); go('results'); }));
    const off = root.querySelector('#offering');
    if (off) off.addEventListener('input', (ev) => {
      S.offering = ev.target.value; const d = S.offering.trim().length >= 3 ? E.detectBusinessType(S.offering) : null; S.detection = d;
      if (d && d.confidence > 0) S.selectedType = d.type;
      const det = root.querySelector('#detect'); det.innerHTML = d && d.confidence > 0 ? `<div class="pp-detect mb-4 pp-fade"><span class="icon">${E.businessTypeDef(d.type).icon}</span><div><div class="title">Looks like: ${E.businessTypeDef(d.type).label}</div><div style="font-size:12px;color:var(--pp-ink-2)">${d.confidence >= 0.7 ? 'High confidence' : d.confidence >= 0.4 ? 'Fairly confident' : 'Best guess'} · Not right? Pick a type below.</div></div></div>` : '';
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
