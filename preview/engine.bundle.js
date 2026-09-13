var ProfitPathEngine = (function () {
  var defs = {}, cache = {};
  function req(name) {
    var key = name.replace(/^\.\//, '').replace(/\.js$/, '');
    if (cache[key]) return cache[key].exports;
    var module = { exports: {} };
    cache[key] = module;
    defs[key](module, module.exports, req);
    return module.exports;
  }
  defs["business-types"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUSINESS_TYPE_LIST = exports.BUSINESS_TYPES = void 0;
exports.businessTypeDef = businessTypeDef;
exports.BUSINESS_TYPES = {
    resell: {
        type: 'resell',
        label: 'Reselling a product',
        shortLabel: 'Reselling',
        icon: '📦',
        description: 'You buy finished products and sell them on (phones, sneakers, cosmetics).',
        unitLabel: 'unit',
        unitLabelPlural: 'units',
        marginBand: {
            low: 0.08,
            mid: 0.16,
            high: 0.24,
            rationale: 'Resellers of branded goods typically operate on 8–24% net margins because buyers can compare prices easily.',
        },
        floorMargin: 0.05,
        repeatable: false,
        examples: ['iPhone 17 Pro', 'Nike sneakers', 'perfume'],
    },
    import: {
        type: 'import',
        label: 'Importing products',
        shortLabel: 'Importing',
        icon: '🚢',
        description: 'You source abroad, handle shipping and customs, and sell locally.',
        unitLabel: 'unit',
        unitLabelPlural: 'units',
        marginBand: {
            low: 0.12,
            mid: 0.22,
            high: 0.32,
            rationale: 'Importers carry shipping, customs and inventory risk, so 12–32% net margins are typical.',
        },
        floorMargin: 0.06,
        repeatable: false,
        examples: ['electronics from China', 'furniture', 'car parts'],
    },
    manufacture: {
        type: 'manufacture',
        label: 'Manufacturing a product',
        shortLabel: 'Manufacturing',
        icon: '🏭',
        description: 'You produce the product yourself or through a factory.',
        unitLabel: 'unit',
        unitLabelPlural: 'units',
        marginBand: {
            low: 0.18,
            mid: 0.28,
            high: 0.38,
            rationale: 'Manufacturers control their input costs and differentiate their product, supporting 18–38% net margins.',
        },
        floorMargin: 0.08,
        repeatable: true,
        examples: ['private-label skincare', 'furniture', 'apparel'],
    },
    service: {
        type: 'service',
        label: 'Offering a service',
        shortLabel: 'Service',
        icon: '📷',
        description: 'Photography, cleaning, consulting, repairs — you sell your time and expertise.',
        unitLabel: 'booking',
        unitLabelPlural: 'bookings',
        marginBand: {
            low: 0.2,
            mid: 0.32,
            high: 0.45,
            rationale: 'Service businesses have few material costs but must cover the owner’s time and idle capacity; 20–45% net margins are typical.',
        },
        floorMargin: 0.1,
        repeatable: true,
        examples: ['wedding photography', 'home cleaning', 'car detailing'],
    },
    freelance: {
        type: 'freelance',
        label: 'Freelancing',
        shortLabel: 'Freelancing',
        icon: '💻',
        description: 'Design, development, writing, video editing — project or hourly work.',
        unitLabel: 'project',
        unitLabelPlural: 'projects',
        marginBand: {
            low: 0.25,
            mid: 0.38,
            high: 0.5,
            rationale: 'Freelancers carry almost no cost of goods, but must price in unbilled time, taxes and downtime; 25–50% net margins over your own labour cost are typical.',
        },
        floorMargin: 0.1,
        repeatable: true,
        examples: ['logo design', 'web development', 'video editing'],
    },
    handmade: {
        type: 'handmade',
        label: 'Handmade products',
        shortLabel: 'Handmade',
        icon: '🕯️',
        description: 'Candles, jewellery, crafts — you make each item yourself.',
        unitLabel: 'item',
        unitLabelPlural: 'items',
        marginBand: {
            low: 0.3,
            mid: 0.42,
            high: 0.55,
            rationale: 'Handmade goods compete on uniqueness rather than price; 30–55% net margins are needed to make the labour worthwhile.',
        },
        floorMargin: 0.12,
        repeatable: true,
        examples: ['soy candles', 'resin jewellery', 'knitted wear'],
    },
    food: {
        type: 'food',
        label: 'Food & beverages',
        shortLabel: 'Food',
        icon: '🍰',
        description: 'Cakes, meals, coffee, catering — made fresh and sold per order.',
        unitLabel: 'order',
        unitLabelPlural: 'orders',
        marginBand: {
            low: 0.15,
            mid: 0.25,
            high: 0.35,
            rationale: 'Food businesses run 15–35% net margins once ingredients, packaging, delivery and waste are counted.',
        },
        floorMargin: 0.08,
        repeatable: true,
        examples: ['custom cakes', 'meal prep', 'specialty coffee'],
    },
    digital: {
        type: 'digital',
        label: 'Digital product',
        shortLabel: 'Digital',
        icon: '🎓',
        description: 'Courses, templates, e-books — built once and sold many times.',
        unitLabel: 'sale',
        unitLabelPlural: 'sales',
        marginBand: {
            low: 0.45,
            mid: 0.6,
            high: 0.75,
            rationale: 'Digital products have near-zero marginal cost; margins of 45–75% are typical after platform fees and acquisition cost.',
        },
        floorMargin: 0.2,
        repeatable: false,
        examples: ['online course', 'Notion templates', 'stock presets'],
    },
    saas: {
        type: 'saas',
        label: 'SaaS / subscription software',
        shortLabel: 'SaaS',
        icon: '☁️',
        description: 'Recurring subscriptions with hosting, API and support costs.',
        unitLabel: 'subscriber-month',
        unitLabelPlural: 'subscriber-months',
        marginBand: {
            low: 0.5,
            mid: 0.65,
            high: 0.78,
            rationale: 'Healthy SaaS businesses target 50–78% margins per subscriber-month after hosting, AI/API, support and amortised acquisition cost.',
        },
        floorMargin: 0.25,
        repeatable: true,
        examples: ['invoicing app', 'AI writing tool', 'booking software'],
    },
};
exports.BUSINESS_TYPE_LIST = Object.values(exports.BUSINESS_TYPES);
function businessTypeDef(type) {
    return exports.BUSINESS_TYPES[type] ?? exports.BUSINESS_TYPES.resell;
}

  };
  defs["detect"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectBusinessType = detectBusinessType;
/** Weighted keyword lists. Lower-cased substrings; weight reflects how diagnostic the word is. */
const KEYWORDS = {
    saas: [
        ['saas', 5], ['subscription', 3], ['software', 2], ['app ', 2], ['platform', 2], ['api', 2], ['ai tool', 3],
        ['dashboard', 2], ['crm', 3], ['web app', 3], ['mobile app', 3], ['startup', 1], ['users', 1], ['monthly plan', 3],
    ],
    digital: [
        ['course', 4], ['ebook', 4], ['e-book', 4], ['template', 3], ['preset', 3], ['pdf', 2], ['digital', 3], ['notion', 3],
        ['printable', 3], ['tutorial', 2], ['masterclass', 4], ['online class', 3], ['coaching program', 2], ['stock photo', 3], ['plugin', 2], ['font', 2],
    ],
    freelance: [
        ['freelance', 5], ['logo', 3], ['graphic design', 3], ['web design', 3], ['web development', 3], ['developer', 2], ['copywriting', 3],
        ['writing', 2], ['video editing', 3], ['editing', 1], ['translation', 3], ['ui/ux', 3], ['ux design', 3], ['voice over', 3], ['seo', 2], ['social media management', 3], ['virtual assistant', 3], ['per hour', 2],
    ],
    service: [
        ['photography', 4], ['photographer', 4], ['cleaning', 4], ['consulting', 3], ['repair', 3], ['tutoring', 3], ['lessons', 2], ['salon', 3],
        ['barber', 3], ['makeup', 3], ['detailing', 3], ['landscaping', 3], ['plumbing', 3], ['electrician', 3], ['wedding', 2], ['event planning', 3],
        ['catering service', 2], ['personal trainer', 3], ['fitness coaching', 3], ['massage', 3], ['delivery service', 3], ['service', 2], ['booking', 2], ['session', 2], ['dj', 3], ['videography', 4],
    ],
    food: [
        ['cake', 4], ['cakes', 4], ['bakery', 4], ['cookies', 3], ['coffee', 3], ['restaurant', 4], ['meal', 3], ['catering', 3], ['juice', 3],
        ['food', 4], ['snack', 3], ['chocolate', 3], ['dessert', 3], ['pastry', 3], ['bread', 3], ['pizza', 4], ['burger', 4], ['kitchen', 3], ['sauce', 3], ['dates', 2], ['halwa', 4], ['tea', 2], ['smoothie', 3], ['meal prep', 4],
    ],
    handmade: [
        ['handmade', 5], ['hand made', 5], ['candle', 4], ['candles', 4], ['jewellery', 3], ['jewelry', 3], ['crochet', 4], ['knit', 3], ['resin', 3],
        ['soap', 3], ['pottery', 4], ['ceramic', 3], ['embroidery', 4], ['crafts', 3], ['craft', 2], ['handcrafted', 5], ['artisan', 3], ['macrame', 4], ['painting', 2], ['art print', 2],
    ],
    manufacture: [
        ['manufactur', 5], ['produce', 2], ['factory', 4], ['private label', 4], ['own brand', 3], ['production', 3], ['make and sell', 3], ['our own', 2], ['formulate', 3],
    ],
    import: [
        ['import', 5], ['from china', 5], ['alibaba', 5], ['aliexpress', 4], ['from turkey', 4], ['from uae', 3], ['from usa', 3], ['wholesale', 3], ['container', 4], ['shipment', 3], ['customs', 3], ['ship from', 3],
    ],
    resell: [
        ['resell', 5], ['reselling', 5], ['iphone', 4], ['samsung', 3], ['phone', 3], ['laptop', 3], ['sneaker', 3], ['shoes', 2], ['perfume', 3], ['watch', 2],
        ['clothes', 2], ['clothing', 2], ['cosmetics', 2], ['gadget', 3], ['electronics', 2], ['playstation', 3], ['ps5', 3], ['xbox', 3], ['airpods', 3], ['macbook', 3], ['ipad', 3], ['dropship', 4], ['buy and sell', 4], ['retail', 2], ['boutique', 2], ['abaya', 2],
    ],
};
function detectBusinessType(text) {
    const t = ` ${(text || '').toLowerCase().trim()} `;
    const scores = {
        resell: { score: 0, matched: [] }, import: { score: 0, matched: [] }, manufacture: { score: 0, matched: [] },
        service: { score: 0, matched: [] }, freelance: { score: 0, matched: [] }, handmade: { score: 0, matched: [] },
        food: { score: 0, matched: [] }, digital: { score: 0, matched: [] }, saas: { score: 0, matched: [] },
    };
    Object.keys(KEYWORDS).forEach((type) => {
        for (const [kw, w] of KEYWORDS[type]) {
            if (t.includes(kw)) {
                scores[type].score += w;
                scores[type].matched.push(kw.trim());
            }
        }
    });
    const ranked = Object.keys(scores).sort((a, b) => scores[b].score - scores[a].score);
    const top = ranked[0];
    const topScore = scores[top].score;
    const total = ranked.reduce((s, k) => s + scores[k].score, 0);
    if (topScore === 0) {
        return { type: 'resell', confidence: 0, matched: [], alternatives: ['service', 'handmade', 'food', 'digital'] };
    }
    // Confidence: dominance of the top score plus absolute evidence.
    const dominance = topScore / total;
    const evidence = Math.min(1, topScore / 6);
    const confidence = Math.round(Math.min(0.98, 0.5 * dominance + 0.5 * evidence) * 100) / 100;
    return {
        type: top,
        confidence,
        matched: scores[top].matched,
        alternatives: ranked.slice(1, 4).filter((k) => scores[k].score > 0),
    };
}

  };
  defs["index"] = function (module, exports, require) {
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./types"), exports);
__exportStar(require("./money"), exports);
__exportStar(require("./business-types"), exports);
__exportStar(require("./pricing"), exports);
__exportStar(require("./detect"), exports);
__exportStar(require("./questions"), exports);
__exportStar(require("./normalize"), exports);
__exportStar(require("./roadmap"), exports);
__exportStar(require("./samples"), exports);

  };
  defs["money"] = function (module, exports, require) {
"use strict";
/** Money helpers: rounding and formatting. Pure functions. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.round2 = round2;
exports.safeDiv = safeDiv;
exports.charmRound = charmRound;
exports.formatMoney = formatMoney;
exports.formatPct = formatPct;
exports.signed = signed;
function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}
function safeDiv(a, b) {
    if (!isFinite(b) || b <= 0)
        return null;
    return a / b;
}
/**
 * Charm-round a price upward to a psychologically "clean" number.
 * The output is always >= input so rounding never erodes the targeted margin.
 *   12.3   -> 12.5      (steps of .5 under 20)
 *   47.2   -> 49        (…4 / …9 under 100)
 *   312    -> 319       (…9 under 1,000)
 *   1,063  -> 1,099     (…49 / …99 under 10,000)
 *   23,400 -> 23,499    (…499 / …999 above)
 * Rounding never adds more than ~5% so the targeted margin is preserved, not inflated.
 */
function charmRound(price) {
    if (!isFinite(price) || price <= 0)
        return 0;
    if (price < 5)
        return Math.ceil(price * 10) / 10;
    if (price < 20)
        return Math.ceil(price * 2) / 2;
    if (price < 100)
        return ceilToEnding(price, 5, 4); // 24, 29, 34 …
    if (price < 1000)
        return ceilToEnding(price, 10, 9); // 319, 329 …
    if (price < 10000)
        return ceilToEnding(price, 50, 49); // 1,099, 1,149 …
    return ceilToEnding(price, 500, 499); // 23,499, 23,999 …
}
function ceilToEnding(price, block, ending) {
    const base = Math.floor(price / block) * block;
    const candidate = base + ending;
    return candidate >= price ? candidate : candidate + block;
}
/** Format a number as currency using Intl, falling back gracefully for unknown codes. */
function formatMoney(value, currency, opts = {}) {
    if (!isFinite(value))
        return '—';
    const decimals = opts.decimals ?? (Math.abs(value) >= 1000 ? 0 : 2);
    try {
        return new Intl.NumberFormat('en', {
            style: 'currency',
            currency,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
            notation: opts.compact ? 'compact' : 'standard',
        }).format(value);
    }
    catch {
        return `${currency} ${value.toFixed(decimals)}`;
    }
}
function formatPct(fraction, decimals = 1) {
    if (!isFinite(fraction))
        return '—';
    return `${(fraction * 100).toFixed(decimals)}%`;
}
function signed(value, currency) {
    const s = formatMoney(Math.abs(value), currency, { decimals: 0 });
    return value >= 0 ? `+${s}` : `−${s}`;
}

  };
  defs["normalize"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyModel = emptyModel;
exports.normalizeAnswers = normalizeAnswers;
const business_types_1 = require("./business-types");
function num(a, key, fallback = 0) {
    const v = a[key];
    if (v === undefined || v === null || v === '')
        return fallback;
    const n = Number(v);
    return isFinite(n) ? n : fallback;
}
function str(a, key, fallback = '') {
    const v = a[key];
    return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}
function arr(a, key) {
    const v = a[key];
    return Array.isArray(v) ? v : [];
}
function emptyModel(type, offering = '') {
    const def = (0, business_types_1.businessTypeDef)(type);
    return {
        meta: { businessType: type, offering, currency: 'USD', country: '', channels: [], unitLabel: def.unitLabel, unitLabelPlural: def.unitLabelPlural },
        direct: { purchase: 0, materials: 0, labor: 0, shipping: 0, customs: 0, packaging: 0, other: 0 },
        variable: { marketingPerUnit: 0, otherPerUnit: 0, paymentFeePct: 0, platformFeePct: 0, commissionPct: 0, returnsPct: 0, wastagePct: 0 },
        fixedMonthly: { rent: 0, software: 0, salaries: 0, storage: 0, equipment: 0, insurance: 0, other: 0 },
        goals: { expectedUnits: 1, targetMonthlyProfit: 0 },
    };
}
function normalizeAnswers(type, answers, offering = '') {
    const m = emptyModel(type, offering);
    m.meta.currency = str(answers, 'currency', 'USD');
    m.meta.country = str(answers, 'country');
    m.meta.channels = arr(answers, 'channels');
    const hourly = num(answers, 'hourlyValue');
    switch (type) {
        case 'resell':
        case 'import':
        case 'manufacture': {
            m.direct.purchase = num(answers, 'purchase');
            m.direct.materials = num(answers, 'materials');
            m.direct.labor = num(answers, 'labor');
            m.direct.shipping = num(answers, 'shipping');
            const base = m.direct.purchase + m.direct.materials;
            m.direct.customs = (num(answers, 'customsPct') / 100) * base;
            m.direct.packaging = num(answers, 'packaging');
            m.variable.returnsPct = num(answers, 'returnsPct');
            m.fixedMonthly.storage = num(answers, 'storage');
            break;
        }
        case 'service':
        case 'freelance': {
            const h = num(answers, 'deliveryHours') + num(answers, 'prepHours');
            m.direct.labor = h * hourly;
            m.direct.materials = num(answers, 'materials');
            m.direct.other = num(answers, 'travel') + num(answers, 'assistant');
            m.fixedMonthly.equipment = num(answers, 'equipment');
            m.fixedMonthly.insurance = num(answers, 'insurance');
            break;
        }
        case 'handmade': {
            m.direct.materials = num(answers, 'materials');
            m.direct.labor = num(answers, 'laborHours') * hourly;
            m.direct.packaging = num(answers, 'packaging');
            m.direct.shipping = num(answers, 'shipping');
            m.variable.wastagePct = num(answers, 'wastagePct', 5);
            m.fixedMonthly.equipment = num(answers, 'equipment');
            break;
        }
        case 'food': {
            m.direct.materials = num(answers, 'materials');
            m.direct.packaging = num(answers, 'packaging');
            m.direct.labor = num(answers, 'laborHours') * hourly;
            m.direct.shipping = num(answers, 'shipping');
            m.variable.wastagePct = num(answers, 'wastagePct', 10);
            m.fixedMonthly.equipment = num(answers, 'equipment');
            m.fixedMonthly.insurance = num(answers, 'insurance');
            break;
        }
        case 'digital': {
            m.direct.other = num(answers, 'otherDirect');
            m.variable.returnsPct = num(answers, 'returnsPct');
            m.fixedMonthly.other += num(answers, 'devAmortised');
            break;
        }
        case 'saas': {
            m.direct.other = num(answers, 'hostingPerUser') + num(answers, 'apiPerUser') + num(answers, 'supportPerUser');
            const churn = num(answers, 'churnPct', 5);
            const cac = num(answers, 'cacPerCustomer');
            m.meta.churnPct = churn;
            m.meta.cacPerCustomer = cac;
            // Acquisition cost amortised over expected lifetime (1/churn months)
            m.variable.marketingPerUnit = cac * (churn / 100);
            m.fixedMonthly.other += num(answers, 'devAmortised');
            break;
        }
    }
    if (type !== 'saas')
        m.variable.marketingPerUnit = num(answers, 'marketingPerUnit');
    m.variable.paymentFeePct = num(answers, 'paymentFeePct', 2.9);
    m.variable.platformFeePct = num(answers, 'platformFeePct');
    m.fixedMonthly.rent = num(answers, 'rent');
    m.fixedMonthly.software = num(answers, 'software');
    m.fixedMonthly.salaries = num(answers, 'salaries');
    m.fixedMonthly.other += num(answers, 'otherFixed');
    let units = num(answers, 'expectedUnits', 1);
    if (type === 'food')
        units = units * num(answers, 'daysPerMonth', 24);
    m.goals.expectedUnits = Math.max(1, Math.round(units));
    m.goals.targetMonthlyProfit = num(answers, 'targetMonthlyProfit');
    const dm = num(answers, 'desiredMarginPct');
    if (dm > 0)
        m.goals.desiredMarginPct = dm;
    return m;
}

  };
  defs["pricing"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unitEconomics = unitEconomics;
exports.priceForMargin = priceForMargin;
exports.profitPerUnitAt = profitPerUnitAt;
exports.contributionAt = contributionAt;
exports.breakEvenUnitsAt = breakEvenUnitsAt;
exports.evaluatePrice = evaluatePrice;
exports.computePricing = computePricing;
exports.applyWhatIf = applyWhatIf;
const business_types_1 = require("./business-types");
const money_1 = require("./money");
function unitEconomics(m, overrides = {}) {
    const U = Math.max(1, overrides.units ?? m.goals.expectedUnits);
    const wastage = clampPct(m.variable.wastagePct);
    const d = m.direct;
    const D = d.purchase * (1 + wastage) +
        d.materials * (1 + wastage) +
        d.labor +
        d.shipping +
        d.customs +
        d.packaging +
        d.other;
    const V = m.variable.marketingPerUnit + m.variable.otherPerUnit;
    const fx = m.fixedMonthly;
    const F = fx.rent + fx.software + fx.salaries + fx.storage + fx.equipment + fx.insurance + fx.other;
    const O = F / U;
    const f = Math.min(0.95, clampPct(m.variable.paymentFeePct) +
        clampPct(m.variable.platformFeePct) +
        clampPct(m.variable.commissionPct) +
        clampPct(m.variable.returnsPct));
    const B = D + V + O;
    return { D, V, F, U, O, f, B };
}
function clampPct(p) {
    if (!p || !isFinite(p) || p < 0)
        return 0;
    return p / 100;
}
function priceForMargin(e, margin) {
    const denom = 1 - e.f - margin;
    if (denom <= 0.01)
        return e.B / 0.01; // margin not reachable; return an extreme price
    return e.B / denom;
}
function profitPerUnitAt(e, price) {
    return price * (1 - e.f) - e.D - e.V - e.O;
}
function contributionAt(e, price) {
    return price * (1 - e.f) - e.D - e.V;
}
function breakEvenUnitsAt(e, price) {
    const c = contributionAt(e, price);
    if (c <= 0)
        return null;
    if (e.F === 0)
        return 0;
    return Math.ceil(e.F / c);
}
/** Evaluate any price at the model's (or overridden) volume. Used by scenarios and the what-if simulator. */
function evaluatePrice(m, price, key = 'custom', label = 'Custom', opts = {}) {
    const e = unitEconomics(m, { units: opts.units });
    const profitPerUnit = profitPerUnitAt(e, price);
    const marginPct = price > 0 ? profitPerUnit / price : 0;
    const monthlyRevenue = price * e.U;
    const monthlyProfit = contributionAt(e, price) * e.U - e.F;
    const band = (0, business_types_1.businessTypeDef)(m.meta.businessType).marginBand;
    let status = opts.status ?? 'recommended';
    if (!opts.status) {
        if (profitPerUnit <= 0)
            status = 'loss';
        else if (marginPct < band.low)
            status = 'low';
        else if (marginPct > band.high)
            status = 'premium';
    }
    return {
        key,
        label,
        price: (0, money_1.round2)(price),
        profitPerUnit: (0, money_1.round2)(profitPerUnit),
        marginPct,
        monthlyRevenue: (0, money_1.round2)(monthlyRevenue),
        monthlyProfit: (0, money_1.round2)(monthlyProfit),
        breakEvenUnits: breakEvenUnitsAt(e, price),
        status,
        note: opts.note ?? '',
    };
}
function computePricing(m) {
    const def = (0, business_types_1.businessTypeDef)(m.meta.businessType);
    const e = unitEconomics(m);
    const warnings = [];
    const breakEvenPrice = e.B / (1 - e.f);
    const variableBreakEvenPrice = (e.D + e.V) / (1 - e.f);
    // Margin targets
    const band = { ...def.marginBand };
    const desired = m.goals.desiredMarginPct && m.goals.desiredMarginPct > 0 ? m.goals.desiredMarginPct / 100 : undefined;
    const midTarget = desired ?? band.mid;
    if (desired !== undefined) {
        band.rationale = `You asked for a ${Math.round(desired * 100)}% margin. For reference, ${def.shortLabel.toLowerCase()} businesses typically run ${pct(def.marginBand.low)}–${pct(def.marginBand.high)}.`;
    }
    const lowTarget = Math.max(def.floorMargin, Math.min(band.low, midTarget - 0.05));
    const highTarget = Math.max(midTarget + 0.05, band.high);
    // Raw prices, then charm-round upward so the rounded price still meets the target.
    const minimumPrice = (0, money_1.charmRound)(Math.max(priceForMargin(e, lowTarget), breakEvenPrice * 1.03));
    let recommendedPrice = (0, money_1.charmRound)(priceForMargin(e, midTarget));
    let premiumPrice = (0, money_1.charmRound)(priceForMargin(e, highTarget));
    if (recommendedPrice <= minimumPrice)
        recommendedPrice = (0, money_1.charmRound)(minimumPrice * 1.05 + 0.01);
    if (premiumPrice <= recommendedPrice)
        premiumPrice = (0, money_1.charmRound)(recommendedPrice * 1.08 + 0.01);
    const minimum = evaluatePrice(m, minimumPrice, 'minimum', 'Minimum', {
        status: 'low',
        note: 'Covers every cost with a thin safety margin. Little room for surprises.',
    });
    const recommended = evaluatePrice(m, recommendedPrice, 'recommended', 'Recommended', {
        status: 'recommended',
        note: `Targets a ${pct(midTarget)} net margin — ${desired !== undefined ? 'your requested margin' : `the midpoint for ${def.shortLabel.toLowerCase()} businesses`}.`,
    });
    const premium = evaluatePrice(m, premiumPrice, 'premium', 'Premium', {
        status: 'premium',
        note: 'Higher margin per sale, but you will likely need stronger positioning or fewer, better customers.',
    });
    const trueCostPerUnit = e.B + recommended.price * e.f;
    // Target profit analysis at expected units
    const T = Math.max(0, m.goals.targetMonthlyProfit || 0);
    const requiredProfitPerUnit = T / e.U;
    const requiredPrice = (e.D + e.V + e.O + requiredProfitPerUnit) / (1 - e.f);
    const requiredMarginPct = requiredPrice > 0 ? requiredProfitPerUnit / requiredPrice : 0;
    const contribRec = contributionAt(e, recommended.price);
    const requiredUnitsAtRecommended = contribRec > 0 ? Math.ceil((T + e.F) / contribRec) : null;
    const gapAtRecommended = recommended.monthlyProfit - T;
    const target = {
        targetMonthlyProfit: T,
        requiredProfitPerUnit: (0, money_1.round2)(requiredProfitPerUnit),
        requiredPrice: (0, money_1.round2)(requiredPrice),
        requiredMarginPct,
        requiredUnitsAtRecommended,
        gapAtRecommended: (0, money_1.round2)(gapAtRecommended),
        achievableAtRecommended: gapAtRecommended >= 0,
    };
    // Cost breakdown at recommended price
    const wastage = clampPct(m.variable.wastagePct);
    const lines = [];
    const push = (key, label, amount, group) => {
        if (amount > 0.004)
            lines.push({ key, label, amount: (0, money_1.round2)(amount), share: 0, group });
    };
    push('purchase', 'Purchase cost', m.direct.purchase * (1 + wastage), 'direct');
    push('materials', 'Materials', m.direct.materials * (1 + wastage), 'direct');
    push('labor', 'Labour', m.direct.labor, 'direct');
    push('shipping', 'Shipping', m.direct.shipping, 'direct');
    push('customs', 'Customs & duties', m.direct.customs, 'direct');
    push('packaging', 'Packaging', m.direct.packaging, 'direct');
    push('otherDirect', 'Other direct costs', m.direct.other, 'direct');
    push('marketing', 'Marketing / acquisition', m.variable.marketingPerUnit, 'variable');
    push('otherVariable', 'Other variable costs', m.variable.otherPerUnit, 'variable');
    push('overhead', 'Allocated monthly overhead', e.O, 'overhead');
    push('paymentFees', 'Payment fees', recommended.price * clampPct(m.variable.paymentFeePct), 'fees');
    push('platformFees', 'Platform / marketplace fees', recommended.price * clampPct(m.variable.platformFeePct), 'fees');
    push('commission', 'Commission', recommended.price * clampPct(m.variable.commissionPct), 'fees');
    push('returns', 'Returns & refunds', recommended.price * clampPct(m.variable.returnsPct), 'fees');
    const total = lines.reduce((s, l) => s + l.amount, 0) || 1;
    lines.forEach((l) => (l.share = l.amount / total));
    lines.sort((a, b) => b.amount - a.amount);
    // Warnings (conservative, plain language)
    if (e.O / e.B > 0.4)
        warnings.push(`Fixed costs are ${pct(e.O / e.B)} of your cost per ${def.unitLabel}. Your price depends heavily on actually selling ${e.U} ${def.unitLabelPlural} a month.`);
    if (e.f > 0.2)
        warnings.push(`Percentage fees take ${pct(e.f)} of every sale before you see any profit.`);
    if (!target.achievableAtRecommended && T > 0)
        warnings.push(`At the recommended price and ${e.U} ${def.unitLabelPlural}/month you would be about ${Math.round(-gapAtRecommended)} ${m.meta.currency} short of your ${T} ${m.meta.currency} target. See the target panel and roadmap.`);
    if (desired !== undefined && desired > def.marginBand.high + 0.1)
        warnings.push(`A ${pct(desired)} margin is well above the typical ${pct(def.marginBand.low)}–${pct(def.marginBand.high)} for this business type; expect a harder sell.`);
    return {
        currency: m.meta.currency,
        unitLabel: def.unitLabel,
        expectedUnits: e.U,
        unitDirectCost: (0, money_1.round2)(e.D),
        unitVariableCost: (0, money_1.round2)(e.V),
        allocatedOverhead: (0, money_1.round2)(e.O),
        fixedMonthly: (0, money_1.round2)(e.F),
        feeFraction: e.f,
        baseCostPerUnit: (0, money_1.round2)(e.B),
        breakEvenPrice: (0, money_1.round2)(breakEvenPrice),
        variableBreakEvenPrice: (0, money_1.round2)(variableBreakEvenPrice),
        trueCostPerUnit: (0, money_1.round2)(trueCostPerUnit),
        marginBand: { low: lowTarget, mid: midTarget, high: highTarget, rationale: band.rationale },
        scenarios: { minimum, recommended, premium },
        recommended,
        target,
        costBreakdown: lines,
        warnings,
    };
}
function applyWhatIf(m, o) {
    const next = JSON.parse(JSON.stringify(m));
    if (o.units !== undefined)
        next.goals.expectedUnits = Math.max(1, o.units);
    if (o.purchase !== undefined)
        next.direct.purchase = Math.max(0, o.purchase);
    if (o.materials !== undefined)
        next.direct.materials = Math.max(0, o.materials);
    if (o.labor !== undefined)
        next.direct.labor = Math.max(0, o.labor);
    if (o.shipping !== undefined)
        next.direct.shipping = Math.max(0, o.shipping);
    if (o.marketingPerUnit !== undefined)
        next.variable.marketingPerUnit = Math.max(0, o.marketingPerUnit);
    if (o.platformFeePct !== undefined)
        next.variable.platformFeePct = Math.max(0, o.platformFeePct);
    if (o.fixedMonthlyTotal !== undefined) {
        const e = unitEconomics(m);
        const scale = e.F > 0 ? Math.max(0, o.fixedMonthlyTotal) / e.F : 0;
        const fx = next.fixedMonthly;
        if (e.F > 0) {
            Object.keys(fx).forEach((k) => (fx[k] = fx[k] * scale));
        }
        else {
            fx.other = Math.max(0, o.fixedMonthlyTotal);
        }
    }
    return next;
}
function pct(fraction) {
    return `${Math.round(fraction * 100)}%`;
}

  };
  defs["questions"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENCY_OPTIONS = void 0;
exports.questionGroupsFor = questionGroupsFor;
exports.visibleQuestions = visibleQuestions;
exports.validateGroup = validateGroup;
exports.appliedDefaults = appliedDefaults;
const business_types_1 = require("./business-types");
const CURRENCIES = [
    ['USD', 'US Dollar'], ['EUR', 'Euro'], ['GBP', 'British Pound'], ['OMR', 'Omani Rial'], ['AED', 'UAE Dirham'], ['SAR', 'Saudi Riyal'],
    ['QAR', 'Qatari Riyal'], ['KWD', 'Kuwaiti Dinar'], ['BHD', 'Bahraini Dinar'], ['EGP', 'Egyptian Pound'], ['INR', 'Indian Rupee'], ['PKR', 'Pakistani Rupee'],
    ['TRY', 'Turkish Lira'], ['CAD', 'Canadian Dollar'], ['AUD', 'Australian Dollar'], ['NGN', 'Nigerian Naira'], ['KES', 'Kenyan Shilling'], ['ZAR', 'South African Rand'],
    ['MYR', 'Malaysian Ringgit'], ['PHP', 'Philippine Peso'], ['IDR', 'Indonesian Rupiah'], ['BRL', 'Brazilian Real'], ['MXN', 'Mexican Peso'], ['JPY', 'Japanese Yen'],
].map(([value, label]) => ({ value, label: `${value} — ${label}` }));
exports.CURRENCY_OPTIONS = CURRENCIES;
const CHANNELS = [
    { value: 'online_store', label: 'My own online store' },
    { value: 'instagram', label: 'Instagram / TikTok' },
    { value: 'whatsapp', label: 'WhatsApp / direct' },
    { value: 'marketplace', label: 'Marketplace (Amazon, Noon, Etsy…)' },
    { value: 'physical', label: 'Physical shop or stall' },
    { value: 'delivery_app', label: 'Delivery app (Talabat, Uber Eats…)' },
    { value: 'referrals', label: 'Referrals / word of mouth' },
    { value: 'platform', label: 'Freelance platform (Upwork, Fiverr…)' },
];
function contextGroup(type) {
    const def = (0, business_types_1.businessTypeDef)(type);
    const qs = [];
    if (type === 'resell' || type === 'import' || type === 'manufacture') {
        qs.push({
            key: 'sourceRegion',
            label: 'Where will you source it?',
            help: 'Sourcing location changes which shipping and customs questions matter.',
            type: 'select',
            required: true,
            options: [
                { value: 'local', label: 'Local supplier' }, { value: 'uae', label: 'UAE' }, { value: 'china', label: 'China' },
                { value: 'usa', label: 'USA' }, { value: 'europe', label: 'Europe' }, { value: 'turkey', label: 'Turkey' }, { value: 'other', label: 'Other / not sure' },
            ],
        });
    }
    qs.push({
        key: 'channels',
        label: `Where will you sell your ${def.unitLabelPlural}?`,
        help: 'Channels decide which fees (payment, marketplace, delivery apps) apply to every sale.',
        type: 'multiselect',
        required: true,
        options: CHANNELS.filter((c) => {
            if (type === 'food')
                return c.value !== 'platform';
            if (type === 'freelance')
                return !['physical', 'delivery_app', 'marketplace'].includes(c.value);
            if (type === 'service')
                return !['delivery_app', 'marketplace'].includes(c.value);
            if (type === 'saas' || type === 'digital')
                return ['online_store', 'instagram', 'marketplace', 'referrals', 'platform'].includes(c.value);
            return c.value !== 'delivery_app' && c.value !== 'platform';
        }),
    });
    qs.push({
        key: 'country',
        label: 'Which country are you selling in?',
        help: 'Used for labels and later for market data. It never changes your numbers today.',
        type: 'text',
        placeholder: 'e.g. Oman',
        required: true,
    });
    qs.push({
        key: 'currency',
        label: 'Which currency should we use for the analysis?',
        help: 'Enter every cost in this one currency. If a supplier quotes in another currency, convert it first.',
        type: 'currency',
        required: true,
        options: CURRENCIES,
        defaultValue: 'USD',
    });
    return { id: 'context', title: 'A bit of context', intro: 'Three quick questions so the rest of the analysis fits your situation.', questions: qs };
}
function money(key, label, help, extra = {}) {
    return { key, label, help, type: 'number', money: true, min: 0, ...extra };
}
function percent(key, label, help, extra = {}) {
    return { key, label, help, type: 'percent', suffix: '%', min: 0, max: 100, ...extra };
}
function hours(key, label, help, extra = {}) {
    return { key, label, help, type: 'hours', suffix: 'hours', min: 0, ...extra };
}
const PAYMENT_FEE = percent('paymentFeePct', 'Payment processing fee', 'Card processors and payment links typically charge 2–3.5% per transaction.', { placeholder: '2.9', defaultValue: 2.9 });
const PLATFORM_FEE = percent('platformFeePct', 'Marketplace or platform fee', 'Marketplaces usually take 5–15% of each sale; delivery apps 15–30%. Enter 0 if you sell directly.', {
    placeholder: '0',
    defaultValue: 0,
    showIf: (a) => Array.isArray(a['channels']) && a['channels'].some((c) => ['marketplace', 'delivery_app', 'platform'].includes(c)),
});
const MARKETING = (unit) => money('marketingPerUnit', `Advertising or acquisition cost per ${unit}`, `Total monthly ad spend divided by ${unit}s sold. Enter 0 if you rely only on organic reach — we will still flag it as an assumption.`, { placeholder: '0', suffix: `per ${unit}`, defaultValue: 0 });
function fixedGroup(items) {
    return {
        id: 'fixed',
        title: 'Monthly fixed costs',
        intro: 'Costs you pay whether you sell one or a hundred. We spread them across your expected monthly volume.',
        questions: items,
    };
}
const RENT = money('rent', 'Rent or workspace', 'Shop, kitchen, studio or office rent per month. Enter 0 if you work from home.', { placeholder: '0', suffix: 'per month', defaultValue: 0 });
const SOFTWARE = money('software', 'Software & subscriptions', 'Website, accounting, design tools, booking systems — per month.', { placeholder: '0', suffix: 'per month', defaultValue: 0 });
const SALARIES = money('salaries', 'Staff or assistants', 'Monthly wages for anyone you pay regularly. Exclude yourself — we treat your profit as your income.', { placeholder: '0', suffix: 'per month', defaultValue: 0 });
const OTHER_FIXED = money('otherFixed', 'Other monthly costs', 'Internet, phone, insurance, licences, storage, equipment payments.', { placeholder: '0', suffix: 'per month', defaultValue: 0 });
function goalsGroup(type) {
    const def = (0, business_types_1.businessTypeDef)(type);
    return {
        id: 'goals',
        title: 'Your goals',
        intro: 'This is what turns a cost list into a strategy.',
        questions: [
            {
                key: 'expectedUnits',
                label: type === 'food' ? 'How many orders do you expect per day?' : type === 'saas' ? 'How many paying subscribers do you expect?' : `How many ${def.unitLabelPlural} do you expect to sell each month?`,
                help: 'Volume decides how your fixed costs are spread. Be conservative — you can test optimistic numbers in the simulator.',
                type: 'number',
                suffix: type === 'food' ? 'per day' : type === 'saas' ? 'subscribers' : 'per month',
                required: true,
                min: 1,
                placeholder: type === 'food' ? '10' : '30',
            },
            money('targetMonthlyProfit', 'How much profit do you want to make each month?', 'We calculate the price and volume needed to reach this, and the roadmap is built around closing any gap.', { placeholder: '5000', suffix: 'per month', required: true }),
            percent('desiredMarginPct', 'Do you have a target margin in mind? (optional)', 'Leave blank and we will use a typical margin for your business type and explain why.', { placeholder: `e.g. ${Math.round(def.marginBand.mid * 100)}` }),
        ],
    };
}
function physicalGroups(type) {
    const direct = [];
    if (type === 'manufacture') {
        direct.push(money('materials', 'Materials per unit', 'Raw materials and components for one finished unit.', { required: true, suffix: 'per unit' }));
        direct.push(money('labor', 'Production labour per unit', 'What you pay to produce one unit (factory price or hourly labour ÷ units per hour).', { placeholder: '0', suffix: 'per unit', defaultValue: 0 }));
    }
    else {
        direct.push(money('purchase', 'Purchase cost per unit', 'What you pay the supplier for one unit, before shipping.', { required: true, suffix: 'per unit' }));
    }
    direct.push(money('shipping', 'Shipping / freight per unit', 'Inbound freight divided by units in the shipment, plus any delivery to the customer you pay for.', { placeholder: '0', suffix: 'per unit', defaultValue: 0 }));
    direct.push(percent('customsPct', 'Customs & duties', 'Percentage of purchase value charged at import. GCC standard rate is often 5%; check your HS code. Enter 0 for local sourcing.', {
        placeholder: '5',
        defaultValue: 0,
        showIf: (a) => a['sourceRegion'] !== undefined && a['sourceRegion'] !== 'local',
    }));
    direct.push(money('packaging', 'Packaging per unit', 'Boxes, labels, protective material, inserts.', { placeholder: '0', suffix: 'per unit', defaultValue: 0 }));
    return [
        { id: 'direct', title: 'Cost of one unit', intro: 'Everything it costs to get one unit into a customer’s hands.', questions: direct },
        {
            id: 'selling',
            title: 'Selling costs',
            intro: 'Costs that only occur when a sale happens.',
            questions: [
                MARKETING('unit'),
                PAYMENT_FEE,
                PLATFORM_FEE,
                percent('returnsPct', 'Returns, warranty & write-offs', 'Share of revenue lost to returns, warranty claims or damaged stock. 1–3% is common for electronics.', { placeholder: '1', defaultValue: 0 }),
            ],
        },
        fixedGroup([RENT, money('storage', 'Storage / warehousing', 'Monthly cost of storing stock, if any.', { placeholder: '0', suffix: 'per month', defaultValue: 0 }), SOFTWARE, SALARIES, OTHER_FIXED]),
    ];
}
function serviceGroups(type) {
    const unit = (0, business_types_1.businessTypeDef)(type).unitLabel;
    return [
        {
            id: 'time',
            title: `Your time per ${unit}`,
            intro: 'In a service business your time is the biggest cost. We price it explicitly so it is never given away.',
            questions: [
                hours('deliveryHours', type === 'freelance' ? `Hours of work per ${unit}` : `Hours on site per ${unit}`, 'The hands-on time (shooting, cleaning, coding, designing).', { required: true }),
                hours('prepHours', type === 'freelance' ? 'Hours of revisions, calls and admin per project' : `Hours of preparation, editing and admin per ${unit}`, 'Unbilled time still costs you. Editing, travel, calls, invoicing.', { placeholder: '0', defaultValue: 0 }),
                money('hourlyValue', 'What is one hour of your time worth?', 'The wage you would need to earn per hour to make this worthwhile. This becomes your labour cost; profit is calculated on top of it.', { required: true, suffix: 'per hour' }),
            ],
        },
        {
            id: 'direct',
            title: `Other costs per ${unit}`,
            intro: 'Out-of-pocket costs each job creates.',
            questions: [
                money('materials', 'Materials & consumables', 'Cleaning products, prints, props, licences bought per job.', { placeholder: '0', suffix: `per ${unit}`, defaultValue: 0 }),
                money('travel', 'Travel / transport', 'Fuel, parking, flights or delivery per job.', { placeholder: '0', suffix: `per ${unit}`, defaultValue: 0 }),
                money('assistant', 'Assistants or subcontractors', 'Second shooter, helper, subcontracted developer — per job.', { placeholder: '0', suffix: `per ${unit}`, defaultValue: 0 }),
            ],
        },
        {
            id: 'selling',
            title: 'Winning the work',
            intro: 'What it costs you to get a client.',
            questions: [MARKETING(unit), PAYMENT_FEE, PLATFORM_FEE],
        },
        fixedGroup([
            money('equipment', 'Equipment depreciation', 'Camera, laptop, tools: purchase price ÷ months of useful life. A $3,000 camera over 36 months ≈ $83/month.', { placeholder: '0', suffix: 'per month', defaultValue: 0 }),
            SOFTWARE,
            RENT,
            money('insurance', 'Insurance & licences', 'Liability insurance, professional licences, trade registration.', { placeholder: '0', suffix: 'per month', defaultValue: 0 }),
            OTHER_FIXED,
        ]),
    ];
}
function handmadeGroups() {
    return [
        {
            id: 'direct',
            title: 'Making one item',
            intro: 'Materials plus your own time — both are real costs.',
            questions: [
                money('materials', 'Raw materials per item', 'Wax, wicks, beads, yarn, fabric — for one finished item.', { required: true, suffix: 'per item' }),
                hours('laborHours', 'Hours to make one item', 'Include finishing and photographing. Batch time ÷ items in the batch.', { required: true }),
                money('hourlyValue', 'What is one hour of your time worth?', 'Handmade sellers often forget to pay themselves. This is your labour cost; profit is on top.', { required: true, suffix: 'per hour' }),
                percent('wastagePct', 'Wastage or failed items', 'Share of materials lost to mistakes, tests and breakage. 5–10% is common.', { placeholder: '5', defaultValue: 5 }),
                money('packaging', 'Packaging per item', 'Box, tissue, labels, thank-you card.', { placeholder: '0', suffix: 'per item', defaultValue: 0 }),
                money('shipping', 'Shipping you pay for', 'Only what you absorb; enter 0 if customers pay shipping.', { placeholder: '0', suffix: 'per item', defaultValue: 0 }),
            ],
        },
        { id: 'selling', title: 'Selling costs', intro: 'Costs that occur only when you sell.', questions: [MARKETING('item'), PAYMENT_FEE, PLATFORM_FEE] },
        fixedGroup([RENT, money('equipment', 'Tools & equipment depreciation', 'Moulds, kiln, sewing machine: price ÷ months of useful life.', { placeholder: '0', suffix: 'per month', defaultValue: 0 }), SOFTWARE, OTHER_FIXED]),
    ];
}
function foodGroups() {
    return [
        {
            id: 'direct',
            title: 'Cost of one order',
            intro: 'Ingredients, packaging and the time to make it.',
            questions: [
                money('materials', 'Ingredients per order', 'Recipe cost for one portion or one cake.', { required: true, suffix: 'per order' }),
                money('packaging', 'Packaging per order', 'Box, cup, bag, cutlery, labels.', { placeholder: '0', suffix: 'per order', defaultValue: 0 }),
                hours('laborHours', 'Hours of work per order', 'Preparation, cooking, decorating, cleaning ÷ orders in the batch.', { required: true }),
                money('hourlyValue', 'What is one hour of your time worth?', 'Your labour cost. Profit is calculated on top of it.', { required: true, suffix: 'per hour' }),
                percent('wastagePct', 'Waste & spoilage', 'Share of ingredients thrown away or unsold. 5–15% is typical.', { placeholder: '10', defaultValue: 10 }),
                money('shipping', 'Delivery cost you absorb', 'Per order, if you deliver or pay a courier.', { placeholder: '0', suffix: 'per order', defaultValue: 0 }),
            ],
        },
        { id: 'selling', title: 'Selling costs', intro: 'Costs that occur only when an order comes in.', questions: [MARKETING('order'), PAYMENT_FEE, PLATFORM_FEE] },
        fixedGroup([money('rent', 'Kitchen or shop rent', 'Commercial kitchen hire or shop rent per month; 0 if home-based.', { placeholder: '0', suffix: 'per month', defaultValue: 0 }), money('equipment', 'Equipment depreciation', 'Oven, mixer, fridge: price ÷ months of useful life.', { placeholder: '0', suffix: 'per month', defaultValue: 0 }), money('insurance', 'Licences & insurance', 'Food licence, municipality fees, insurance.', { placeholder: '0', suffix: 'per month', defaultValue: 0 }), SALARIES, OTHER_FIXED]),
        {
            id: 'sellingDays',
            title: 'Operating days',
            intro: 'We convert your daily orders into monthly volume.',
            questions: [{ key: 'daysPerMonth', label: 'Days you sell per month', help: 'Used to turn orders per day into orders per month.', type: 'number', suffix: 'days', min: 1, max: 31, placeholder: '24', defaultValue: 24 }],
        },
    ];
}
function digitalGroups() {
    return [
        {
            id: 'direct',
            title: 'Cost per sale',
            intro: 'Digital products cost almost nothing to deliver — but not nothing.',
            questions: [
                money('otherDirect', 'Delivery & support cost per sale', 'Email tool, file hosting, time answering buyers — per sale.', { placeholder: '0', suffix: 'per sale', defaultValue: 0 }),
                MARKETING('sale'),
                PAYMENT_FEE,
                percent('platformFeePct', 'Platform fee', 'Gumroad, Udemy, Etsy, app stores take 5–50%. Enter 0 if selling from your own site.', { placeholder: '10', defaultValue: 0 }),
                percent('returnsPct', 'Refund rate', 'Share of sales refunded. 2–5% is common for courses.', { placeholder: '3', defaultValue: 0 }),
            ],
        },
        fixedGroup([
            money('devAmortised', 'Creation cost, spread monthly', 'What it cost to build (your time included) ÷ months you expect to sell it. A $6,000 course sold over 24 months ≈ $250/month.', { placeholder: '0', suffix: 'per month', defaultValue: 0 }),
            money('software', 'Hosting & tools', 'Course platform, website, email marketing — per month.', { placeholder: '0', suffix: 'per month', defaultValue: 0 }),
            OTHER_FIXED,
        ]),
    ];
}
function saasGroups() {
    return [
        {
            id: 'direct',
            title: 'Cost per subscriber each month',
            intro: 'The variable costs one paying user creates every month.',
            questions: [
                money('hostingPerUser', 'Hosting & infrastructure per user', 'Servers, database, storage divided by active users.', { placeholder: '0', suffix: 'per user / month', defaultValue: 0 }),
                money('apiPerUser', 'AI / API costs per user', 'LLM tokens, maps, SMS, third-party APIs — per user per month.', { placeholder: '0', suffix: 'per user / month', defaultValue: 0 }),
                money('supportPerUser', 'Support cost per user', 'Support time or tooling divided by users.', { placeholder: '0', suffix: 'per user / month', defaultValue: 0 }),
                PAYMENT_FEE,
            ],
        },
        {
            id: 'growth',
            title: 'Acquisition & retention',
            intro: 'In SaaS, acquisition cost is spread over how long a customer stays.',
            questions: [
                money('cacPerCustomer', 'Cost to acquire one customer (CAC)', 'Monthly marketing spend ÷ new paying customers per month.', { placeholder: '0', suffix: 'per new customer', defaultValue: 0 }),
                percent('churnPct', 'Monthly churn', 'Share of subscribers who cancel each month. 3–8% is typical for small B2B tools, higher for consumer apps.', { placeholder: '5', defaultValue: 5, required: true }),
            ],
        },
        fixedGroup([
            money('devAmortised', 'Development cost, spread monthly', 'Build cost (your time included) ÷ months to recover it, plus ongoing development.', { placeholder: '0', suffix: 'per month', defaultValue: 0 }),
            money('software', 'Base hosting & tools', 'Fixed part of hosting, domains, monitoring, SaaS tools.', { placeholder: '0', suffix: 'per month', defaultValue: 0 }),
            SALARIES,
            OTHER_FIXED,
        ]),
    ];
}
const TYPE_GROUPS = {
    resell: () => physicalGroups('resell'),
    import: () => physicalGroups('import'),
    manufacture: () => physicalGroups('manufacture'),
    service: () => serviceGroups('service'),
    freelance: () => serviceGroups('freelance'),
    handmade: handmadeGroups,
    food: foodGroups,
    digital: digitalGroups,
    saas: saasGroups,
};
/** Full ordered list of groups for a business type, including shared context and goals. */
function questionGroupsFor(type) {
    return [contextGroup(type), ...TYPE_GROUPS[type](), goalsGroup(type)];
}
/** Only the questions whose showIf passes for the current answers. */
function visibleQuestions(group, answers) {
    return group.questions.filter((q) => !q.showIf || q.showIf(answers));
}
/** Validation: returns a map of key -> message for the visible questions of a group. */
function validateGroup(group, answers) {
    const errors = {};
    for (const q of visibleQuestions(group, answers)) {
        const v = answers[q.key];
        const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
        if (q.required && empty) {
            errors[q.key] = 'This one is needed for the calculation.';
            continue;
        }
        if (!empty && (q.type === 'number' || q.type === 'percent' || q.type === 'hours')) {
            const n = Number(v);
            if (!isFinite(n))
                errors[q.key] = 'Please enter a number.';
            else if (q.min !== undefined && n < q.min)
                errors[q.key] = `Must be at least ${q.min}.`;
            else if (q.max !== undefined && n > q.max)
                errors[q.key] = `Must be at most ${q.max}.`;
        }
    }
    return errors;
}
/** List of defaults that were applied because the user left a field blank — surfaced as assumptions. */
function appliedDefaults(type, answers) {
    const out = [];
    for (const g of questionGroupsFor(type)) {
        for (const q of visibleQuestions(g, answers)) {
            const v = answers[q.key];
            const empty = v === undefined || v === null || v === '';
            if (empty && q.defaultValue !== undefined && q.defaultValue !== 0 && q.defaultValue !== '0')
                out.push({ key: q.key, label: q.label, value: q.defaultValue });
        }
    }
    return out;
}

  };
  defs["roadmap"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATEGORY_META = exports.ROADMAP_ASSUMPTIONS = void 0;
exports.buildRoadmap = buildRoadmap;
exports.priorityLabel = priorityLabel;
const business_types_1 = require("./business-types");
const pricing_1 = require("./pricing");
const money_1 = require("./money");
exports.ROADMAP_ASSUMPTIONS = {
    supplierReductionPct: 0.05,
    materialsReductionPct: 0.07,
    shippingReductionPct: 0.15,
    cacReductionPct: 0.3,
    feeShiftShare: 0.3, // share of volume moved to a lower-fee channel
    feeShiftSavingPts: 3, // percentage points saved on that share
    priceTestIncrease: 0.05,
    priceTestVolumeLoss: 0.08,
    volumeIncrease: 0.2,
    upsellAttachRate: 0.25,
    upsellPriceShare: 0.1,
    upsellMargin: 0.5,
    repeatUplift: 0.1,
    overheadReduction: 0.1,
    laborEfficiency: 0.15,
    returnsReduction: 0.33,
    interactionDiscount: 0.15,
};
const A = exports.ROADMAP_ASSUMPTIONS;
const money = (v, cur) => (0, money_1.formatMoney)(v, cur, { decimals: v < 100 ? 2 : 0 });
const RULES = [
    {
        id: 'supplier_cost',
        category: 'reduce_costs',
        difficulty: 'medium',
        applies: (c) => c.m.direct.purchase > 0 && c.m.direct.purchase / c.p.trueCostPerUnit >= 0.3,
        build: (c) => {
            const share = c.m.direct.purchase / c.p.trueCostPerUnit;
            const saving = c.m.direct.purchase * A.supplierReductionPct;
            const target = c.m.direct.purchase - saving;
            return {
                title: `Find a supplier below ${money(target, c.cur)} per ${c.unit}`,
                why: `Purchase cost is ${(0, money_1.formatPct)(share, 0)} of your true cost per ${c.unit} — the single biggest lever you have. Every ${c.cur} saved here goes straight to profit.`,
                action: 'Request quotes from 3–5 suppliers for your volume. Compare landed cost (price + shipping + duties), minimum order quantity, warranty and payment terms — not just the unit price.',
                estimatedMonthlyImpact: (0, money_1.round2)(saving * c.e.U),
                assumptions: [`A ${(0, money_1.formatPct)(A.supplierReductionPct, 0)} lower purchase price is achievable at your volume (conservative for most categories).`, `Volume stays at ${c.e.U} ${c.units}/month.`],
            };
        },
    },
    {
        id: 'materials_cost',
        category: 'reduce_costs',
        difficulty: 'medium',
        applies: (c) => c.m.direct.materials > 0 && c.m.direct.materials / c.p.trueCostPerUnit >= 0.25,
        build: (c) => {
            const saving = c.m.direct.materials * A.materialsReductionPct;
            return {
                title: `Cut materials cost by ~${(0, money_1.formatPct)(A.materialsReductionPct, 0)} through bulk buying`,
                why: `Materials are ${(0, money_1.formatPct)(c.m.direct.materials / c.p.trueCostPerUnit, 0)} of your cost per ${c.unit}. Buying in larger quantities or from a wholesaler usually brings this down.`,
                action: 'Price your three most expensive ingredients or materials at wholesale quantities. Check whether a slightly cheaper grade would be noticed by customers.',
                estimatedMonthlyImpact: (0, money_1.round2)(saving * c.e.U),
                assumptions: [`Materials cost drops by ${(0, money_1.formatPct)(A.materialsReductionPct, 0)} at wholesale quantities.`, 'No change in quality or sales volume.'],
            };
        },
    },
    {
        id: 'shipping_cost',
        category: 'reduce_costs',
        difficulty: 'easy',
        applies: (c) => c.m.direct.shipping > 0 && c.m.direct.shipping / c.p.trueCostPerUnit >= 0.06,
        build: (c) => {
            const saving = c.m.direct.shipping * A.shippingReductionPct;
            return {
                title: `Reduce shipping from ${money(c.m.direct.shipping, c.cur)} to about ${money(c.m.direct.shipping - saving, c.cur)} per ${c.unit}`,
                why: `Shipping is ${(0, money_1.formatPct)(c.m.direct.shipping / c.p.trueCostPerUnit, 0)} of your cost per ${c.unit}. Consolidated shipments and negotiated courier rates typically cut this.`,
                action: 'Get quotes from two freight forwarders or couriers for consolidated monthly shipments. Ask about volume-based rates once you reach a steady order count.',
                estimatedMonthlyImpact: (0, money_1.round2)(saving * c.e.U),
                assumptions: [`${(0, money_1.formatPct)(A.shippingReductionPct, 0)} lower shipping through consolidation or negotiated rates.`],
            };
        },
    },
    {
        id: 'cac',
        category: 'reduce_cac',
        difficulty: 'medium',
        applies: (c) => c.m.variable.marketingPerUnit > 0 &&
            (c.m.variable.marketingPerUnit / c.price >= 0.02 || c.m.variable.marketingPerUnit / Math.max(1, c.p.recommended.profitPerUnit) >= 0.1),
        build: (c) => {
            const cur = c.m.variable.marketingPerUnit;
            const saving = cur * A.cacReductionPct;
            return {
                title: `Bring acquisition cost from ${money(cur, c.cur)} to ~${money(cur - saving, c.cur)} per ${c.unit}`,
                why: `You spend ${(0, money_1.formatPct)(cur / c.price, 1)} of every sale on acquiring the customer. Channels like referrals, organic content, WhatsApp broadcast lists and email cost far less per sale than paid ads.`,
                action: 'Launch a referral offer for existing customers, post consistently on one organic channel, and retarget past visitors instead of cold audiences. Track cost per sale weekly.',
                estimatedMonthlyImpact: (0, money_1.round2)(saving * c.e.U),
                assumptions: [`Acquisition cost per ${c.unit} falls by ${(0, money_1.formatPct)(A.cacReductionPct, 0)} within 2–3 months.`, 'Sales volume is unchanged.'],
            };
        },
    },
    {
        id: 'platform_fees',
        category: 'reduce_costs',
        difficulty: 'medium',
        applies: (c) => c.m.variable.platformFeePct >= 8,
        build: (c) => {
            const saving = c.price * (A.feeShiftSavingPts / 100) * A.feeShiftShare;
            return {
                title: `Move ${(0, money_1.formatPct)(A.feeShiftShare, 0)} of sales to a lower-fee channel`,
                why: `Platform fees of ${c.m.variable.platformFeePct}% take ${money(c.price * (c.m.variable.platformFeePct / 100), c.cur)} from every ${c.unit}. Direct channels (your own store, WhatsApp) keep most of that.`,
                action: 'Add a "reorder directly" card or WhatsApp link in every delivery. Offer a small direct-order incentive that is still cheaper than the platform fee.',
                estimatedMonthlyImpact: (0, money_1.round2)(saving * c.e.U),
                assumptions: [`${(0, money_1.formatPct)(A.feeShiftShare, 0)} of volume moves to a channel with fees ${A.feeShiftSavingPts} points lower.`, 'Total volume is unchanged.'],
            };
        },
    },
    {
        id: 'price_test',
        category: 'increase_revenue',
        difficulty: 'easy',
        applies: (c) => {
            const newPrice = c.price * (1 + A.priceTestIncrease);
            const newUnits = c.e.U * (1 - A.priceTestVolumeLoss);
            const newProfit = (0, pricing_1.contributionAt)(c.e, newPrice) * newUnits - c.e.F;
            return newProfit - c.monthlyProfit > Math.max(20, c.monthlyProfit * 0.03) && c.p.recommended.marginPct < c.p.marginBand.high;
        },
        build: (c) => {
            const newPrice = c.price * (1 + A.priceTestIncrease);
            const newUnits = c.e.U * (1 - A.priceTestVolumeLoss);
            const newProfit = (0, pricing_1.contributionAt)(c.e, newPrice) * newUnits - c.e.F;
            return {
                title: `Test a ${(0, money_1.formatPct)(A.priceTestIncrease, 0)} higher price (${money(newPrice, c.cur)})`,
                why: `Your recommended margin (${(0, money_1.formatPct)(c.p.recommended.marginPct, 1)}) is below the top of the typical range for ${(0, business_types_1.businessTypeDef)(c.m.meta.businessType).shortLabel.toLowerCase()} businesses (${(0, money_1.formatPct)(c.p.marginBand.high, 0)}). Even if a few customers drop off, the higher price is likely to earn more.`,
                action: 'Run the higher price for 2–4 weeks on new customers only. Keep the offer identical and watch conversion, not just complaints. Keep it if profit rises.',
                estimatedMonthlyImpact: (0, money_1.round2)(newProfit - c.monthlyProfit),
                assumptions: [`A ${(0, money_1.formatPct)(A.priceTestIncrease, 0)} price rise loses ${(0, money_1.formatPct)(A.priceTestVolumeLoss, 0)} of volume (a cautious elasticity assumption).`],
            };
        },
    },
    {
        id: 'upsell',
        category: 'increase_value',
        difficulty: 'easy',
        applies: (c) => c.price > 0,
        build: (c) => {
            const addon = c.price * A.upsellPriceShare;
            const perUnit = addon * A.upsellMargin * A.upsellAttachRate;
            const t = c.m.meta.businessType;
            const example = t === 'resell' || t === 'import' ? 'accessories, cases, protection plans or extended warranty' :
                t === 'service' || t === 'freelance' ? 'an express-delivery option, extra deliverables or a maintenance package' :
                    t === 'food' ? 'drinks, sides or a "party size" option' :
                        t === 'handmade' ? 'gift wrapping, personalisation or a matching item' :
                            t === 'digital' ? 'a workbook, template pack or 1:1 session' :
                                t === 'saas' ? 'a higher tier, add-on seats or onboarding' : 'a matching add-on';
            return {
                title: `Add an upsell worth ~${money(addon, c.cur)} (${example})`,
                why: `Selling something extra to a customer you already have costs almost nothing to acquire. A modest add-on with a healthy margin lifts profit per ${c.unit} without touching your core price.`,
                action: `Design one add-on at roughly ${(0, money_1.formatPct)(A.upsellPriceShare, 0)} of your price and offer it at the moment of purchase. Measure the attach rate for a month.`,
                estimatedMonthlyImpact: (0, money_1.round2)(perUnit * c.e.U),
                assumptions: [`${(0, money_1.formatPct)(A.upsellAttachRate, 0)} of customers take the add-on.`, `The add-on carries a ${(0, money_1.formatPct)(A.upsellMargin, 0)} margin.`],
            };
        },
    },
    {
        id: 'repeat',
        category: 'increase_value',
        difficulty: 'medium',
        applies: (c) => (0, business_types_1.businessTypeDef)(c.m.meta.businessType).repeatable && (0, pricing_1.contributionAt)(c.e, c.price) > 0,
        build: (c) => {
            const extraUnits = c.e.U * A.repeatUplift;
            // Repeat orders carry no acquisition cost, so contribution excludes marketingPerUnit.
            const contribNoCac = (c.price * (1 - c.e.f) - c.e.D - c.m.variable.otherPerUnit) * extraUnits;
            return {
                title: `Win ${(0, money_1.formatPct)(A.repeatUplift, 0)} more volume from repeat customers`,
                why: `Repeat ${c.units} have no acquisition cost, so each one earns about ${money(c.price * (1 - c.e.f) - c.e.D - c.m.variable.otherPerUnit, c.cur)} — more than a new sale.`,
                action: 'Collect every customer’s contact at purchase, follow up 2–4 weeks later with a reorder reminder or a loyalty perk, and make reordering a one-tap action.',
                estimatedMonthlyImpact: (0, money_1.round2)(contribNoCac),
                assumptions: [`Repeat purchases add ${(0, money_1.formatPct)(A.repeatUplift, 0)} to monthly volume.`, 'Repeat orders carry no marketing cost.'],
            };
        },
    },
    {
        id: 'volume',
        category: 'increase_revenue',
        difficulty: 'hard',
        applies: (c) => (0, pricing_1.contributionAt)(c.e, c.price) > 0 && c.e.O / c.p.baseCostPerUnit >= 0.1,
        build: (c) => {
            const extra = c.e.U * A.volumeIncrease;
            return {
                title: `Grow to ${Math.round(c.e.U + extra)} ${c.units}/month`,
                why: `Fixed costs are ${(0, money_1.formatPct)(c.e.O / c.p.baseCostPerUnit, 0)} of your cost per ${c.unit}. Every extra ${c.unit} spreads them thinner and earns the full contribution of ${money((0, pricing_1.contributionAt)(c.e, c.price), c.cur)}.`,
                action: 'Pick one channel you are not using yet and commit to it for 60 days. Set a weekly target of new enquiries, not sales, and track conversion.',
                estimatedMonthlyImpact: (0, money_1.round2)((0, pricing_1.contributionAt)(c.e, c.price) * extra),
                assumptions: [`Volume grows ${(0, money_1.formatPct)(A.volumeIncrease, 0)} at the same price and acquisition cost.`, 'Fixed costs do not increase.'],
            };
        },
    },
    {
        id: 'overhead',
        category: 'reduce_costs',
        difficulty: 'easy',
        applies: (c) => c.e.F > 0 && c.e.O / c.p.baseCostPerUnit >= 0.2,
        build: (c) => ({
            title: `Trim monthly fixed costs by ${(0, money_1.formatPct)(A.overheadReduction, 0)} (~${money(c.e.F * A.overheadReduction, c.cur)})`,
            why: `Fixed costs of ${money(c.e.F, c.cur)}/month add ${money(c.e.O, c.cur)} to every ${c.unit} at your expected volume. Unused subscriptions, oversized space and idle tools are the usual culprits.`,
            action: 'List every recurring charge and cancel or downgrade anything not used in the last 30 days. Renegotiate rent or move to shared space if you are below capacity.',
            estimatedMonthlyImpact: (0, money_1.round2)(c.e.F * A.overheadReduction),
            assumptions: [`${(0, money_1.formatPct)(A.overheadReduction, 0)} of fixed costs can be removed without affecting sales.`],
        }),
    },
    {
        id: 'labor_efficiency',
        category: 'reduce_costs',
        difficulty: 'medium',
        applies: (c) => c.m.direct.labor > 0 && c.m.direct.labor / c.p.trueCostPerUnit >= 0.35,
        build: (c) => ({
            title: `Save ${(0, money_1.formatPct)(A.laborEfficiency, 0)} of the time each ${c.unit} takes`,
            why: `Your time is ${(0, money_1.formatPct)(c.m.direct.labor / c.p.trueCostPerUnit, 0)} of the cost per ${c.unit}. Templates, batching and checklists usually recover this much without lowering quality.`,
            action: 'Time your next five jobs. Batch similar tasks, build templates or presets for repeated steps, and stop doing anything the customer does not notice.',
            estimatedMonthlyImpact: (0, money_1.round2)(c.m.direct.labor * A.laborEfficiency * c.e.U),
            assumptions: [`Time per ${c.unit} falls by ${(0, money_1.formatPct)(A.laborEfficiency, 0)}; the freed hours are used for more ${c.units} or other paid work.`],
        }),
    },
    {
        id: 'waste',
        category: 'reduce_costs',
        difficulty: 'easy',
        applies: (c) => c.m.variable.wastagePct >= 5 && c.m.direct.materials + c.m.direct.purchase > 0,
        build: (c) => {
            const base = c.m.direct.materials + c.m.direct.purchase;
            const saving = base * (c.m.variable.wastagePct / 100) * 0.5;
            return {
                title: `Halve waste from ${c.m.variable.wastagePct}% to ${c.m.variable.wastagePct / 2}%`,
                why: `Waste adds ${money(base * (c.m.variable.wastagePct / 100), c.cur)} to every ${c.unit}. Better forecasting and portion control usually halve it.`,
                action: 'Track what is thrown away for two weeks, then adjust batch sizes, pre-orders and storage to match real demand.',
                estimatedMonthlyImpact: (0, money_1.round2)(saving * c.e.U),
                assumptions: ['Waste is halved with no change in sales.'],
            };
        },
    },
    {
        id: 'returns',
        category: 'reduce_costs',
        difficulty: 'medium',
        applies: (c) => c.m.variable.returnsPct >= 3,
        build: (c) => {
            const saving = c.price * (c.m.variable.returnsPct / 100) * A.returnsReduction;
            return {
                title: `Cut returns and refunds by a third`,
                why: `Returns of ${c.m.variable.returnsPct}% cost ${money(c.price * (c.m.variable.returnsPct / 100), c.cur)} per ${c.unit}. Clearer descriptions, better packaging and quality checks reduce them.`,
                action: 'Read every refund reason for a month. Fix the top two causes: usually mismatched expectations or shipping damage.',
                estimatedMonthlyImpact: (0, money_1.round2)(saving * c.e.U),
                assumptions: [`Return rate falls by ${(0, money_1.formatPct)(A.returnsReduction, 0)}.`],
            };
        },
    },
];
const DIFFICULTY_WEIGHT = { easy: 1, medium: 1.4, hard: 2 };
function buildRoadmap(m, p, opts = {}) {
    const e = (0, pricing_1.unitEconomics)(m);
    const def = (0, business_types_1.businessTypeDef)(m.meta.businessType);
    const price = p.recommended.price;
    const ctx = { m, p, e, price, cur: m.meta.currency, unit: def.unitLabel, units: def.unitLabelPlural, monthlyProfit: p.recommended.monthlyProfit };
    const recs = [];
    for (const rule of RULES) {
        let applies = false;
        try {
            applies = rule.applies(ctx);
        }
        catch {
            applies = false;
        }
        if (!applies)
            continue;
        const built = rule.build(ctx);
        if (!isFinite(built.estimatedMonthlyImpact) || built.estimatedMonthlyImpact <= 0)
            continue;
        recs.push({ id: rule.id, category: rule.category, difficulty: rule.difficulty, priority: 'low', ...built, done: opts.completedIds?.includes(rule.id) ?? false });
    }
    // Priority: impact per unit of difficulty, then bucketed relative to current profit.
    const scored = recs
        .map((r) => ({ r, score: r.estimatedMonthlyImpact / DIFFICULTY_WEIGHT[r.difficulty] }))
        .sort((a, b) => b.score - a.score);
    const reference = Math.max(Math.abs(ctx.monthlyProfit), 1);
    for (const { r } of scored) {
        const rel = r.estimatedMonthlyImpact / reference;
        r.priority = rel >= 0.12 ? 'high' : rel >= 0.05 ? 'medium' : 'low';
    }
    const top = scored.slice(0, opts.maxItems ?? 7).map((s) => s.r);
    // Ensure at least one high priority when there is anything at all
    if (top.length && !top.some((r) => r.priority === 'high'))
        top[0].priority = 'high';
    const sumOfImpacts = (0, money_1.round2)(top.reduce((s, r) => s + r.estimatedMonthlyImpact, 0));
    const optimised = (0, money_1.round2)(ctx.monthlyProfit + sumOfImpacts * (1 - A.interactionDiscount));
    return {
        current: {
            price,
            trueCostPerUnit: p.trueCostPerUnit,
            profitPerUnit: p.recommended.profitPerUnit,
            units: e.U,
            monthlyProfit: ctx.monthlyProfit,
            marginPct: p.recommended.marginPct,
        },
        recommendations: top,
        sumOfImpacts,
        interactionDiscountPct: A.interactionDiscount,
        optimisedMonthlyProfit: optimised,
        targetReached: m.goals.targetMonthlyProfit > 0 ? optimised >= m.goals.targetMonthlyProfit : true,
        disclaimer: 'These are estimates based on the numbers you provided and the assumptions listed under each item. They are not predictions or guarantees. Improvements interact, so the combined effect is usually smaller than the sum of the parts.',
    };
}
exports.CATEGORY_META = {
    reduce_costs: { label: 'Reduce costs', icon: '💰', blurb: 'Every unit of cost removed is a unit of profit gained — no extra sales needed.' },
    increase_revenue: { label: 'Increase revenue', icon: '📈', blurb: 'Better pricing and more volume, tested carefully.' },
    reduce_cac: { label: 'Reduce acquisition cost', icon: '📣', blurb: 'Pay less to win each customer.' },
    increase_value: { label: 'Increase customer value', icon: '🔄', blurb: 'Earn more from the customers you already have.' },
};
/** Sentence case: nothing in the interface is set in capitals. */
function priorityLabel(p) {
    return p === 'high' ? 'High' : p === 'medium' ? 'Medium' : 'Low';
}

  };
  defs["samples"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAMPLES = void 0;
/** The iPhone example from the product brief, used by the landing page and as a demo. */
exports.SAMPLES = [
    {
        name: 'iPhone reselling',
        offering: 'iPhone 17 Pro 256GB',
        type: 'resell',
        answers: {
            sourceRegion: 'uae', channels: ['instagram', 'whatsapp'], country: 'Oman', currency: 'USD',
            purchase: 850, shipping: 45, customsPct: 0, packaging: 0,
            marketingPerUnit: 35, paymentFeePct: 0, returnsPct: 0,
            rent: 0, storage: 0, software: 0, salaries: 0, otherFixed: 600,
            expectedUnits: 30, targetMonthlyProfit: 5000,
        },
    },
    {
        name: 'Wedding photography',
        offering: 'Wedding photography',
        type: 'service',
        answers: {
            channels: ['instagram', 'referrals'], country: 'Oman', currency: 'USD',
            deliveryHours: 8, prepHours: 12, hourlyValue: 25, materials: 40, travel: 30, assistant: 150,
            marketingPerUnit: 60, paymentFeePct: 2.9, equipment: 120, software: 45, rent: 0, insurance: 20, otherFixed: 30,
            expectedUnits: 6, targetMonthlyProfit: 3000,
        },
    },
    {
        name: 'Soy candles',
        offering: 'Handmade soy candles',
        type: 'handmade',
        answers: {
            channels: ['instagram', 'marketplace'], country: 'United Kingdom', currency: 'GBP',
            materials: 4.2, laborHours: 0.4, hourlyValue: 14, wastagePct: 5, packaging: 1.1, shipping: 0,
            marketingPerUnit: 1.5, paymentFeePct: 2.9, platformFeePct: 8, rent: 0, equipment: 15, software: 10, otherFixed: 20,
            expectedUnits: 120, targetMonthlyProfit: 1200,
        },
    },
];

  };
  defs["types"] = function (module, exports, require) {
"use strict";
/**
 * ProfitPath engine types.
 * This folder is framework-free: no Angular imports, no DOM access.
 * Everything here is compiled and unit-tested with plain tsc + node.
 */
Object.defineProperty(exports, "__esModule", { value: true });

  };
  return req('./index');
})();
