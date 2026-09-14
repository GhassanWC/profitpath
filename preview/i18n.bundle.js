var ProfitPathI18n = (function () {
  var defs = {}, cache = {};
  function req(name) {
    var key = name.replace(/^\.\//, '').replace(/\.js$/, '');
    if (cache[key]) return cache[key].exports;
    var module = { exports: {} };
    cache[key] = module;
    defs[key](module, module.exports, req);
    return module.exports;
  }
  defs["catalogue"] = function (module, exports, require) {
"use strict";
/**
 * Framework-free translation core. No Angular imports, so the engine-adjacent
 * code, the Angular app and the dependency-free preview can all share it.
 *
 * Message syntax
 * --------------
 *   {name}            the parameter, as-is
 *   {name|money}      currency, 2dp below 100 and 0dp above — the engine's own rule
 *   {name|money0}     currency, no decimals
 *   {name|money2}     currency, always 2dp
 *   {name|pct}        percentage, 1dp        {name|pct0}  percentage, no decimals
 *   {name|num}        a plain number, localised
 *   {name|plain}      the value untouched — for the few places the engine prints a
 *                     bare number and the catalogue has to reproduce it exactly
 *   {name|t}          the parameter is itself a message key: translate it
 *
 * The currency comes from `params.cur`, falling back to the translator's default.
 * A missing parameter renders as the empty string rather than "undefined" — a gap
 * in copy should look like a gap, not like a bug leaking through.
 *
 * Plurals go through Intl.PluralRules: pass `count` and give the catalogue keys
 * `<key>.one`, `<key>.other` and whichever of zero/two/few/many the locale needs.
 * Arabic uses all six; English and the Romance locales use two.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LOCALE = exports.LOCALES = void 0;
exports.localeDef = localeDef;
exports.matchLocale = matchLocale;
exports.createTranslator = createTranslator;
exports.LOCALES = [
    { code: 'en', label: 'English', englishLabel: 'English', dir: 'ltr', intl: 'en' },
    { code: 'ar', label: 'العربية', englishLabel: 'Arabic', dir: 'rtl', intl: 'ar-u-nu-latn' },
    { code: 'fr', label: 'Français', englishLabel: 'French', dir: 'ltr', intl: 'fr' },
    { code: 'es', label: 'Español', englishLabel: 'Spanish', dir: 'ltr', intl: 'es' },
];
exports.DEFAULT_LOCALE = 'en';
function localeDef(code) {
    return exports.LOCALES.find((l) => l.code === code) ?? exports.LOCALES[0];
}
/** Picks the best supported locale for a browser language list. */
function matchLocale(preferred) {
    for (const want of preferred) {
        const base = want.toLowerCase().split('-')[0];
        const hit = exports.LOCALES.find((l) => l.code === base);
        if (hit)
            return hit.code;
    }
    return exports.DEFAULT_LOCALE;
}
function formatMoney(value, currency, intl, decimals) {
    try {
        return new Intl.NumberFormat(intl, {
            style: 'currency',
            currency,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(value);
    }
    catch {
        return `${currency} ${value.toFixed(decimals)}`;
    }
}
function formatNumber(value, intl, decimals) {
    try {
        return new Intl.NumberFormat(intl, decimals === undefined ? {} : { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
    }
    catch {
        return String(value);
    }
}
function formatPct(fraction, intl, decimals) {
    try {
        return new Intl.NumberFormat(intl, { style: 'percent', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(fraction);
    }
    catch {
        return `${(fraction * 100).toFixed(decimals)}%`;
    }
}
function createTranslator(locale, messages, defaultCurrency = 'USD') {
    const def = localeDef(locale);
    const table = messages[def.code] ?? {};
    const fallback = messages[exports.DEFAULT_LOCALE] ?? {};
    let plurals = null;
    try {
        plurals = new Intl.PluralRules(def.intl);
    }
    catch {
        plurals = null;
    }
    const lookup = (key) => table[key] ?? fallback[key];
    const render = (template, params) => template.replace(/\{(\w+)(?:\|(\w+))?\}/g, (_whole, name, fmt) => {
        const value = params?.[name];
        if (value === undefined || value === null)
            return '';
        const currency = String(params?.['cur'] ?? defaultCurrency);
        const n = typeof value === 'number' ? value : Number(value);
        switch (fmt) {
            case 'money':
                return formatMoney(n, currency, def.intl, Math.abs(n) < 100 ? 2 : 0);
            case 'money0':
                return formatMoney(n, currency, def.intl, 0);
            case 'money2':
                return formatMoney(n, currency, def.intl, 2);
            case 'pct':
                return formatPct(n, def.intl, 1);
            case 'pct0':
                return formatPct(n, def.intl, 0);
            case 'num':
                return formatNumber(n, def.intl);
            case 'plain':
                return String(value);
            case 't':
                return t(String(value));
            default:
                return typeof value === 'number' ? formatNumber(value, def.intl) : String(value);
        }
    });
    function t(key, params) {
        const keys = typeof key === 'string' ? [key] : key;
        for (const k of keys) {
            const template = lookup(k);
            if (template !== undefined)
                return render(template, params);
        }
        // Nothing in any catalogue: show the last key so the gap is findable, not silent.
        return keys[keys.length - 1] ?? '';
    }
    function tp(key, count, params) {
        const category = plurals ? plurals.select(count) : count === 1 ? 'one' : 'other';
        return t([`${key}.${category}`, `${key}.other`, key], { ...params, count });
    }
    return {
        locale: def.code,
        def,
        t,
        tp,
        has: (key) => table[key] !== undefined,
        money: (value, currency, decimals) => formatMoney(value, currency, def.intl, decimals ?? (Math.abs(value) < 100 ? 2 : 0)),
        pct: (fraction, decimals = 1) => formatPct(fraction, def.intl, decimals),
        num: (value, decimals) => formatNumber(value, def.intl, decimals),
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
exports.MESSAGES = void 0;
const messages_en_1 = require("./messages.en");
const messages_ar_1 = require("./messages.ar");
const messages_fr_1 = require("./messages.fr");
const messages_es_1 = require("./messages.es");
__exportStar(require("./catalogue"), exports);
/**
 * Every catalogue, keyed by locale code. English is the source: the other three
 * are checked against it for key parity by `preview/i18n-check.mjs`, which also
 * asserts that rendering the English entries reproduces the engine's own prose.
 *
 * To add a language: write `messages.<code>.ts` as a copy of the English keys,
 * add it here, and add its LOCALES entry in catalogue.ts. Nothing else changes.
 */
exports.MESSAGES = { en: messages_en_1.EN, ar: messages_ar_1.AR, fr: messages_fr_1.FR, es: messages_es_1.ES };

  };
  defs["messages.ar"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AR = void 0;
/** Placeholder — filled in below. Missing keys fall back to English. */
exports.AR = {};

  };
  defs["messages.en"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EN = void 0;
/**
 * English — the source catalogue. Every other locale is checked against these
 * keys, and `preview/i18n-check.mjs` asserts that rendering these entries
 * reproduces the engine's own prose character for character.
 *
 * Keys are generated for the engine's static copy (business types, question
 * groups, questions, options, cost lines, categories) and hand-written for the
 * interface and for the engine's computed sentences. Where a string differs only
 * by the noun for what is being sold, it is templated with {unit}/{units} rather
 * than duplicated nine times; where it genuinely differs by business type, the
 * key carries the type.
 *
 * Plain data, no imports: `preview/build.mjs` strips the `export` keyword and
 * reuses this file verbatim so the preview and the app cannot drift.
 */
exports.EN = {
    'analyze.back': 'Back',
    'analyze.businessType': 'Business type',
    'analyze.confidence.fair': 'Fairly confident',
    'analyze.confidence.guess': 'Best guess',
    'analyze.confidence.high': 'High confidence',
    'analyze.continue': 'Continue',
    'analyze.detect.sub': '{confidence} · not right? Pick a type below.',
    'analyze.detect.title': 'Looks like: {label}',
    'analyze.finish': 'Calculate my price',
    'analyze.notice': 'Leave a cost at 0 if it doesn\'t apply. You can change every number later in the what-if simulator.',
    'analyze.q0.intro': 'Describe it in your own words. We\'ll tailor the next questions to your kind of business — you will never be asked about costs that do not apply to you.',
    'analyze.q0.placeholder': 'e.g. iPhone 17 Pro, wedding photography, soy candles, online course…',
    'analyze.q0.title': 'What are you planning to sell?',
    'analyze.step': 'Step {current|plain} of {total|plain}',
    'analyze.step0.title': 'What you\'re selling',
    'businessType.digital.description': 'Courses, templates, e-books — built once and sold many times.',
    'businessType.digital.label': 'Digital product',
    'businessType.digital.rationale': 'Digital products have near-zero marginal cost; margins of 45–75% are typical after platform fees and acquisition cost.',
    'businessType.digital.shortLabel': 'Digital',
    'businessType.digital.shortLabelLower': 'digital',
    'businessType.food.description': 'Cakes, meals, coffee, catering — made fresh and sold per order.',
    'businessType.food.label': 'Food & beverages',
    'businessType.food.rationale': 'Food businesses run 15–35% net margins once ingredients, packaging, delivery and waste are counted.',
    'businessType.food.shortLabel': 'Food',
    'businessType.food.shortLabelLower': 'food',
    'businessType.freelance.description': 'Design, development, writing, video editing — project or hourly work.',
    'businessType.freelance.label': 'Freelancing',
    'businessType.freelance.rationale': 'Freelancers carry almost no cost of goods, but must price in unbilled time, taxes and downtime; 25–50% net margins over your own labour cost are typical.',
    'businessType.freelance.shortLabel': 'Freelancing',
    'businessType.freelance.shortLabelLower': 'freelancing',
    'businessType.handmade.description': 'Candles, jewellery, crafts — you make each item yourself.',
    'businessType.handmade.label': 'Handmade products',
    'businessType.handmade.rationale': 'Handmade goods compete on uniqueness rather than price; 30–55% net margins are needed to make the labour worthwhile.',
    'businessType.handmade.shortLabel': 'Handmade',
    'businessType.handmade.shortLabelLower': 'handmade',
    'businessType.import.description': 'You source abroad, handle shipping and customs, and sell locally.',
    'businessType.import.label': 'Importing products',
    'businessType.import.rationale': 'Importers carry shipping, customs and inventory risk, so 12–32% net margins are typical.',
    'businessType.import.shortLabel': 'Importing',
    'businessType.import.shortLabelLower': 'importing',
    'businessType.manufacture.description': 'You produce the product yourself or through a factory.',
    'businessType.manufacture.label': 'Manufacturing a product',
    'businessType.manufacture.rationale': 'Manufacturers control their input costs and differentiate their product, supporting 18–38% net margins.',
    'businessType.manufacture.shortLabel': 'Manufacturing',
    'businessType.manufacture.shortLabelLower': 'manufacturing',
    'businessType.resell.description': 'You buy finished products and sell them on (phones, sneakers, cosmetics).',
    'businessType.resell.label': 'Reselling a product',
    'businessType.resell.rationale': 'Resellers of branded goods typically operate on 8–24% net margins because buyers can compare prices easily.',
    'businessType.resell.shortLabel': 'Reselling',
    'businessType.resell.shortLabelLower': 'reselling',
    'businessType.saas.description': 'Recurring subscriptions with hosting, API and support costs.',
    'businessType.saas.label': 'SaaS / subscription software',
    'businessType.saas.rationale': 'Healthy SaaS businesses target 50–78% margins per subscriber-month after hosting, AI/API, support and amortised acquisition cost.',
    'businessType.saas.shortLabel': 'SaaS',
    'businessType.saas.shortLabelLower': 'saas',
    'businessType.service.description': 'Photography, cleaning, consulting, repairs — you sell your time and expertise.',
    'businessType.service.label': 'Offering a service',
    'businessType.service.rationale': 'Service businesses have few material costs but must cover the owner’s time and idle capacity; 20–45% net margins are typical.',
    'businessType.service.shortLabel': 'Service',
    'businessType.service.shortLabelLower': 'service',
    'category.increase_revenue.blurb': 'Better pricing and more volume, tested carefully.',
    'category.increase_revenue.label': 'Increase revenue',
    'category.increase_value.blurb': 'Earn more from the customers you already have.',
    'category.increase_value.label': 'Increase customer value',
    'category.reduce_cac.blurb': 'Pay less to win each customer.',
    'category.reduce_cac.label': 'Reduce acquisition cost',
    'category.reduce_costs.blurb': 'Every unit of cost removed is a unit of profit gained — no extra sales needed.',
    'category.reduce_costs.label': 'Reduce costs',
    'chart.costBreakdown': 'Cost breakdown',
    'compare.barLabel': 'Profit today is {share|plain}% of the optimised figure',
    'compare.following': 'Following the roadmap',
    'compare.keyAdded': 'Added by the {count|plain} recommendations',
    'compare.keyNote': 'Estimates from your own numbers · not a forecast',
    'compare.keyToday': 'Profit today',
    'compare.moreProfit': 'more profit',
    'compare.today': 'Today',
    'costLine.labor': 'Labour',
    'costLine.marketing': 'Marketing / acquisition',
    'costLine.materials': 'Materials',
    'costLine.otherDirect': 'Other direct costs',
    'costLine.overhead': 'Allocated monthly overhead',
    'costLine.packaging': 'Packaging',
    'costLine.paymentFees': 'Payment fees',
    'costLine.platformFees': 'Platform / marketplace fees',
    'costLine.purchase': 'Purchase cost',
    'costLine.returns': 'Returns & refunds',
    'costLine.shipping': 'Shipping',
    'difficulty.easy': 'easy',
    'difficulty.hard': 'hard',
    'difficulty.medium': 'medium',
    'explain.price.cost': 'Based on the information you provided, one {unit|t} costs you about {cost|money} once every direct cost, selling cost and your share of monthly overhead is counted.',
    'explain.price.outcome': 'Pricing at {price|money} is estimated to leave {profit|money} per {unit|t} ({margin|pct} margin), or roughly {monthly|money} a month at {count|plain} {units|t}.',
    'explain.price.targetMet': 'That is above your target of {target|money}.',
    'explain.price.targetShort': 'Your target of {target|money} would need either {required|money} per {unit|t} at your current volume, or about {requiredUnits|plain} {units|t} a month at the recommended price. The roadmap shows ways to close that gap without only raising the price.',
    'explain.price.topLine': '{label} is the largest component at {share|pct0} of that.',
    'explain.roadmap.none': 'We could not find cost or revenue levers large enough to recommend with your current inputs. Try adjusting the what-if simulator to explore options.',
    'explain.roadmap.summary': 'Assuming the inputs you gave hold, the biggest single opportunity is "{title}", estimated at {impact|money} a month. Together, the {count|plain} items listed could potentially lift monthly profit from {current|money} to around {optimised|money} after allowing for overlap between them. Start with the high-priority items; each one lists the assumption its estimate depends on.',
    'footer.deterministic': 'All calculations are deterministic and explainable.',
    'footer.legal': '© {year|plain} ProfitPath · Estimates based on your inputs, not financial advice or a guarantee of results.',
    'group.context.intro': 'Three quick questions so the rest of the analysis fits your situation.',
    'group.context.title': 'A bit of context',
    'group.digital.direct.intro': 'Digital products cost almost nothing to deliver — but not nothing.',
    'group.digital.direct.title': 'Cost per sale',
    'group.fixed.intro': 'Costs you pay whether you sell one or a hundred. We spread them across your expected monthly volume.',
    'group.fixed.title': 'Monthly fixed costs',
    'group.food.direct.intro': 'Ingredients, packaging and the time to make it.',
    'group.food.direct.title': 'Cost of one order',
    'group.food.selling.intro': 'Costs that occur only when an order comes in.',
    'group.food.selling.title': 'Selling costs',
    'group.freelance.direct.intro': 'Out-of-pocket costs each job creates.',
    'group.freelance.direct.title': 'Other costs per project',
    'group.freelance.selling.intro': 'What it costs you to get a client.',
    'group.freelance.selling.title': 'Winning the work',
    'group.goals.intro': 'This is what turns a cost list into a strategy.',
    'group.goals.title': 'Your goals',
    'group.growth.intro': 'In SaaS, acquisition cost is spread over how long a customer stays.',
    'group.growth.title': 'Acquisition & retention',
    'group.handmade.direct.intro': 'Materials plus your own time — both are real costs.',
    'group.handmade.direct.title': 'Making one item',
    'group.handmade.selling.intro': 'Costs that occur only when you sell.',
    'group.handmade.selling.title': 'Selling costs',
    'group.import.direct.intro': 'Everything it costs to get one unit into a customer’s hands.',
    'group.import.direct.title': 'Cost of one unit',
    'group.import.selling.intro': 'Costs that only occur when a sale happens.',
    'group.import.selling.title': 'Selling costs',
    'group.manufacture.direct.intro': 'Everything it costs to get one unit into a customer’s hands.',
    'group.manufacture.direct.title': 'Cost of one unit',
    'group.manufacture.selling.intro': 'Costs that only occur when a sale happens.',
    'group.manufacture.selling.title': 'Selling costs',
    'group.resell.direct.intro': 'Everything it costs to get one unit into a customer’s hands.',
    'group.resell.direct.title': 'Cost of one unit',
    'group.resell.selling.intro': 'Costs that only occur when a sale happens.',
    'group.resell.selling.title': 'Selling costs',
    'group.saas.direct.intro': 'The variable costs one paying user creates every month.',
    'group.saas.direct.title': 'Cost per subscriber each month',
    'group.sellingDays.intro': 'We convert your daily orders into monthly volume.',
    'group.sellingDays.title': 'Operating days',
    'group.service.direct.intro': 'Out-of-pocket costs each job creates.',
    'group.service.direct.title': 'Other costs per booking',
    'group.service.selling.intro': 'What it costs you to get a client.',
    'group.service.selling.title': 'Winning the work',
    'group.time.intro': 'In a service business your time is the biggest cost. We price it explicitly so it is never given away.',
    'group.time.title': 'Your time per {unit}',
    'landing.calc.eyebrow': 'What ProfitPath works out',
    'landing.calc.lift': 'Where more profit comes from',
    'landing.calc.open': 'Open this example',
    'landing.calc.sub': 'Recommended price per {unit|t} · {margin|pct0} target margin',
    'landing.chip': 'Pricing intelligence + profit roadmap',
    'landing.cta.example': 'See an Example',
    'landing.cta.primary': 'Calculate My Price',
    'landing.example.eyebrow': 'Worked example',
    'landing.example.goals': '{count|plain} {units|t} a month · target profit {target|money0}',
    'landing.example.trueCost': 'True cost per {unit|t}',
    'landing.final.sub': 'No sign-up needed for your first analysis.',
    'landing.final.title': 'Ready to find out what to charge?',
    'landing.how.1.body': 'Type it in plain words. We detect whether it\'s a product, service, food, digital or SaaS business and ask only the questions that matter for it.',
    'landing.how.1.title': 'Tell us what you sell',
    'landing.how.2.body': 'Costs, fees, fixed expenses and your goals — a few at a time, each with a plain explanation of why we ask.',
    'landing.how.2.title': 'Answer a few questions',
    'landing.how.3.body': 'True cost, break-even, three pricing scenarios and the price you need to hit your target profit — with the reasoning behind each number.',
    'landing.how.3.title': 'Get your price',
    'landing.how.4.body': 'Prioritised, quantified ways to make more profit at that price: cheaper sourcing, lower acquisition cost, upsells, better channels.',
    'landing.how.4.title': 'Follow your roadmap',
    'landing.how.sub': 'A conversation, not a spreadsheet. Five minutes from idea to price.',
    'landing.how.title': 'How it works',
    'landing.lead': 'Tell us what you\'re selling, what it costs you, and what you want to earn. We\'ll calculate your ideal price and show you how to improve your profit.',
    'landing.plan.business.1': 'Everything in Pro',
    'landing.plan.business.2': 'Team members',
    'landing.plan.business.3': 'Scenario comparison',
    'landing.plan.business.4': 'Market research (coming)',
    'landing.plan.business.name': 'Business',
    'landing.plan.free.1': 'Pricing calculator',
    'landing.plan.free.2': 'Recommended price & three scenarios',
    'landing.plan.free.3': 'Break-even analysis',
    'landing.plan.free.4': 'One saved business',
    'landing.plan.free.name': 'Free',
    'landing.plan.pro.1': 'Everything in Free',
    'landing.plan.pro.2': 'Full Profit Roadmap',
    'landing.plan.pro.3': 'What-if simulator',
    'landing.plan.pro.4': 'Unlimited saved businesses',
    'landing.plan.pro.5': 'PDF reports',
    'landing.plan.pro.name': 'Pro',
    'landing.pricing.perMonth': '/month',
    'landing.pricing.popular': 'Most popular',
    'landing.pricing.sub': 'Start free. Upgrade when the roadmap pays for itself.',
    'landing.pricing.title': 'Simple pricing',
    'landing.title.accent': 'you charge?',
    'landing.title.before': 'How much should',
    'lang.change': 'Change language',
    'marginBand.requested': 'You asked for a {desired|pct0} margin. For reference, {typeKey|t} businesses typically run {low|pct0}–{high|pct0}.',
    'nav.calculator': 'Calculator',
    'nav.cta': 'Calculate my price',
    'nav.results': 'Results',
    'nav.roadmap': 'Roadmap',
    'option.channels.delivery_app.label': 'Delivery app (Talabat, Uber Eats…)',
    'option.channels.instagram.label': 'Instagram / TikTok',
    'option.channels.marketplace.label': 'Marketplace (Amazon, Noon, Etsy…)',
    'option.channels.online_store.label': 'My own online store',
    'option.channels.physical.label': 'Physical shop or stall',
    'option.channels.platform.label': 'Freelance platform (Upwork, Fiverr…)',
    'option.channels.referrals.label': 'Referrals / word of mouth',
    'option.channels.whatsapp.label': 'WhatsApp / direct',
    'option.currency.AED.label': 'AED — UAE Dirham',
    'option.currency.AUD.label': 'AUD — Australian Dollar',
    'option.currency.BHD.label': 'BHD — Bahraini Dinar',
    'option.currency.BRL.label': 'BRL — Brazilian Real',
    'option.currency.CAD.label': 'CAD — Canadian Dollar',
    'option.currency.EGP.label': 'EGP — Egyptian Pound',
    'option.currency.EUR.label': 'EUR — Euro',
    'option.currency.GBP.label': 'GBP — British Pound',
    'option.currency.IDR.label': 'IDR — Indonesian Rupiah',
    'option.currency.INR.label': 'INR — Indian Rupee',
    'option.currency.JPY.label': 'JPY — Japanese Yen',
    'option.currency.KES.label': 'KES — Kenyan Shilling',
    'option.currency.KWD.label': 'KWD — Kuwaiti Dinar',
    'option.currency.MXN.label': 'MXN — Mexican Peso',
    'option.currency.MYR.label': 'MYR — Malaysian Ringgit',
    'option.currency.NGN.label': 'NGN — Nigerian Naira',
    'option.currency.OMR.label': 'OMR — Omani Rial',
    'option.currency.PHP.label': 'PHP — Philippine Peso',
    'option.currency.PKR.label': 'PKR — Pakistani Rupee',
    'option.currency.QAR.label': 'QAR — Qatari Riyal',
    'option.currency.SAR.label': 'SAR — Saudi Riyal',
    'option.currency.TRY.label': 'TRY — Turkish Lira',
    'option.currency.USD.label': 'USD — US Dollar',
    'option.currency.ZAR.label': 'ZAR — South African Rand',
    'option.sourceRegion.china.label': 'China',
    'option.sourceRegion.europe.label': 'Europe',
    'option.sourceRegion.local.label': 'Local supplier',
    'option.sourceRegion.other.label': 'Other / not sure',
    'option.sourceRegion.turkey.label': 'Turkey',
    'option.sourceRegion.uae.label': 'UAE',
    'option.sourceRegion.usa.label': 'USA',
    'priority.high': 'High',
    'priority.low': 'Low',
    'priority.medium': 'Medium',
    'question.apiPerUser.help': 'LLM tokens, maps, SMS, third-party APIs — per user per month.',
    'question.apiPerUser.label': 'AI / API costs per user',
    'question.apiPerUser.placeholder': '0',
    'question.apiPerUser.suffix': 'per user / month',
    'question.assistant.help': 'Second shooter, helper, subcontracted developer — per job.',
    'question.assistant.label': 'Assistants or subcontractors',
    'question.assistant.placeholder': '0',
    'question.assistant.suffix': 'per {unit}',
    'question.cacPerCustomer.help': 'Monthly marketing spend ÷ new paying customers per month.',
    'question.cacPerCustomer.label': 'Cost to acquire one customer (CAC)',
    'question.cacPerCustomer.placeholder': '0',
    'question.cacPerCustomer.suffix': 'per new customer',
    'question.channels.help': 'Channels decide which fees (payment, marketplace, delivery apps) apply to every sale.',
    'question.churnPct.help': 'Share of subscribers who cancel each month. 3–8% is typical for small B2B tools, higher for consumer apps.',
    'question.churnPct.label': 'Monthly churn',
    'question.churnPct.placeholder': '5',
    'question.churnPct.suffix': '%',
    'question.country.help': 'Used for labels and later for market data. It never changes your numbers today.',
    'question.country.label': 'Which country are you selling in?',
    'question.country.placeholder': 'e.g. Oman',
    'question.currency.help': 'Enter every cost in this one currency. If a supplier quotes in another currency, convert it first.',
    'question.currency.label': 'Which currency should we use for the analysis?',
    'question.customsPct.help': 'Percentage of purchase value charged at import. GCC standard rate is often 5%; check your HS code. Enter 0 for local sourcing.',
    'question.customsPct.label': 'Customs & duties',
    'question.customsPct.placeholder': '5',
    'question.customsPct.suffix': '%',
    'question.daysPerMonth.help': 'Used to turn orders per day into orders per month.',
    'question.daysPerMonth.label': 'Days you sell per month',
    'question.daysPerMonth.placeholder': '24',
    'question.daysPerMonth.suffix': 'days',
    'question.deliveryHours.help': 'The hands-on time (shooting, cleaning, coding, designing).',
    'question.deliveryHours.suffix': 'hours',
    'question.desiredMarginPct.help': 'Leave blank and we will use a typical margin for your business type and explain why.',
    'question.desiredMarginPct.label': 'Do you have a target margin in mind? (optional)',
    'question.desiredMarginPct.suffix': '%',
    'question.devAmortised.placeholder': '0',
    'question.devAmortised.suffix': 'per month',
    'question.digital.channels.label': 'Where will you sell your sales?',
    'question.digital.desiredMarginPct.placeholder': 'e.g. 60',
    'question.digital.devAmortised.help': 'What it cost to build (your time included) ÷ months you expect to sell it. A $6,000 course sold over 24 months ≈ $250/month.',
    'question.digital.devAmortised.label': 'Creation cost, spread monthly',
    'question.digital.expectedUnits.label': 'How many sales do you expect to sell each month?',
    'question.digital.expectedUnits.placeholder': '30',
    'question.digital.expectedUnits.suffix': 'per month',
    'question.digital.marketingPerUnit.help': 'Total monthly ad spend divided by sales sold. Enter 0 if you rely only on organic reach — we will still flag it as an assumption.',
    'question.digital.platformFeePct.help': 'Gumroad, Udemy, Etsy, app stores take 5–50%. Enter 0 if selling from your own site.',
    'question.digital.platformFeePct.label': 'Platform fee',
    'question.digital.platformFeePct.placeholder': '10',
    'question.digital.returnsPct.help': 'Share of sales refunded. 2–5% is common for courses.',
    'question.digital.returnsPct.label': 'Refund rate',
    'question.digital.returnsPct.placeholder': '3',
    'question.digital.software.help': 'Course platform, website, email marketing — per month.',
    'question.digital.software.label': 'Hosting & tools',
    'question.equipment.placeholder': '0',
    'question.equipment.suffix': 'per month',
    'question.expectedUnits.help': 'Volume decides how your fixed costs are spread. Be conservative — you can test optimistic numbers in the simulator.',
    'question.food.channels.label': 'Where will you sell your orders?',
    'question.food.desiredMarginPct.placeholder': 'e.g. 25',
    'question.food.equipment.help': 'Oven, mixer, fridge: price ÷ months of useful life.',
    'question.food.equipment.label': 'Equipment depreciation',
    'question.food.expectedUnits.label': 'How many orders do you expect per day?',
    'question.food.expectedUnits.placeholder': '10',
    'question.food.expectedUnits.suffix': 'per day',
    'question.food.hourlyValue.help': 'Your labour cost. Profit is calculated on top of it.',
    'question.food.insurance.help': 'Food licence, municipality fees, insurance.',
    'question.food.insurance.label': 'Licences & insurance',
    'question.food.laborHours.help': 'Preparation, cooking, decorating, cleaning ÷ orders in the batch.',
    'question.food.laborHours.label': 'Hours of work per order',
    'question.food.marketingPerUnit.help': 'Total monthly ad spend divided by orders sold. Enter 0 if you rely only on organic reach — we will still flag it as an assumption.',
    'question.food.materials.help': 'Recipe cost for one portion or one cake.',
    'question.food.materials.label': 'Ingredients per order',
    'question.food.packaging.help': 'Box, cup, bag, cutlery, labels.',
    'question.food.platformFeePct.help': 'Marketplaces usually take 5–15% of each sale; delivery apps 15–30%. Enter 0 if you sell directly.',
    'question.food.platformFeePct.label': 'Marketplace or platform fee',
    'question.food.platformFeePct.placeholder': '0',
    'question.food.rent.help': 'Commercial kitchen hire or shop rent per month; 0 if home-based.',
    'question.food.rent.label': 'Kitchen or shop rent',
    'question.food.shipping.help': 'Per order, if you deliver or pay a courier.',
    'question.food.shipping.label': 'Delivery cost you absorb',
    'question.food.wastagePct.help': 'Share of ingredients thrown away or unsold. 5–15% is typical.',
    'question.food.wastagePct.label': 'Waste & spoilage',
    'question.food.wastagePct.placeholder': '10',
    'question.freelance.channels.label': 'Where will you sell your projects?',
    'question.freelance.deliveryHours.label': 'Hours of work per project',
    'question.freelance.desiredMarginPct.placeholder': 'e.g. 38',
    'question.freelance.equipment.help': 'Camera, laptop, tools: purchase price ÷ months of useful life. A $3,000 camera over 36 months ≈ $83/month.',
    'question.freelance.equipment.label': 'Equipment depreciation',
    'question.freelance.expectedUnits.label': 'How many projects do you expect to sell each month?',
    'question.freelance.expectedUnits.placeholder': '30',
    'question.freelance.expectedUnits.suffix': 'per month',
    'question.freelance.hourlyValue.help': 'The wage you would need to earn per hour to make this worthwhile. This becomes your labour cost; profit is calculated on top of it.',
    'question.freelance.insurance.help': 'Liability insurance, professional licences, trade registration.',
    'question.freelance.insurance.label': 'Insurance & licences',
    'question.freelance.marketingPerUnit.help': 'Total monthly ad spend divided by projects sold. Enter 0 if you rely only on organic reach — we will still flag it as an assumption.',
    'question.freelance.materials.help': 'Cleaning products, prints, props, licences bought per job.',
    'question.freelance.materials.label': 'Materials & consumables',
    'question.freelance.platformFeePct.help': 'Marketplaces usually take 5–15% of each sale; delivery apps 15–30%. Enter 0 if you sell directly.',
    'question.freelance.platformFeePct.label': 'Marketplace or platform fee',
    'question.freelance.platformFeePct.placeholder': '0',
    'question.freelance.prepHours.label': 'Hours of revisions, calls and admin per project',
    'question.freelance.rent.help': 'Shop, kitchen, studio or office rent per month. Enter 0 if you work from home.',
    'question.freelance.rent.label': 'Rent or workspace',
    'question.freelance.software.help': 'Website, accounting, design tools, booking systems — per month.',
    'question.freelance.software.label': 'Software & subscriptions',
    'question.handmade.channels.label': 'Where will you sell your items?',
    'question.handmade.desiredMarginPct.placeholder': 'e.g. 42',
    'question.handmade.equipment.help': 'Moulds, kiln, sewing machine: price ÷ months of useful life.',
    'question.handmade.equipment.label': 'Tools & equipment depreciation',
    'question.handmade.expectedUnits.label': 'How many items do you expect to sell each month?',
    'question.handmade.expectedUnits.placeholder': '30',
    'question.handmade.expectedUnits.suffix': 'per month',
    'question.handmade.hourlyValue.help': 'Handmade sellers often forget to pay themselves. This is your labour cost; profit is on top.',
    'question.handmade.laborHours.help': 'Include finishing and photographing. Batch time ÷ items in the batch.',
    'question.handmade.laborHours.label': 'Hours to make one item',
    'question.handmade.marketingPerUnit.help': 'Total monthly ad spend divided by items sold. Enter 0 if you rely only on organic reach — we will still flag it as an assumption.',
    'question.handmade.materials.help': 'Wax, wicks, beads, yarn, fabric — for one finished item.',
    'question.handmade.materials.label': 'Raw materials per item',
    'question.handmade.packaging.help': 'Box, tissue, labels, thank-you card.',
    'question.handmade.platformFeePct.help': 'Marketplaces usually take 5–15% of each sale; delivery apps 15–30%. Enter 0 if you sell directly.',
    'question.handmade.platformFeePct.label': 'Marketplace or platform fee',
    'question.handmade.platformFeePct.placeholder': '0',
    'question.handmade.rent.help': 'Shop, kitchen, studio or office rent per month. Enter 0 if you work from home.',
    'question.handmade.rent.label': 'Rent or workspace',
    'question.handmade.shipping.help': 'Only what you absorb; enter 0 if customers pay shipping.',
    'question.handmade.shipping.label': 'Shipping you pay for',
    'question.handmade.software.help': 'Website, accounting, design tools, booking systems — per month.',
    'question.handmade.software.label': 'Software & subscriptions',
    'question.handmade.wastagePct.help': 'Share of materials lost to mistakes, tests and breakage. 5–10% is common.',
    'question.handmade.wastagePct.label': 'Wastage or failed items',
    'question.handmade.wastagePct.placeholder': '5',
    'question.hostingPerUser.help': 'Servers, database, storage divided by active users.',
    'question.hostingPerUser.label': 'Hosting & infrastructure per user',
    'question.hostingPerUser.placeholder': '0',
    'question.hostingPerUser.suffix': 'per user / month',
    'question.hourlyValue.label': 'What is one hour of your time worth?',
    'question.hourlyValue.suffix': 'per hour',
    'question.import.channels.label': 'Where will you sell your units?',
    'question.import.desiredMarginPct.placeholder': 'e.g. 22',
    'question.import.expectedUnits.label': 'How many units do you expect to sell each month?',
    'question.import.expectedUnits.placeholder': '30',
    'question.import.expectedUnits.suffix': 'per month',
    'question.import.marketingPerUnit.help': 'Total monthly ad spend divided by units sold. Enter 0 if you rely only on organic reach — we will still flag it as an assumption.',
    'question.import.packaging.help': 'Boxes, labels, protective material, inserts.',
    'question.import.platformFeePct.help': 'Marketplaces usually take 5–15% of each sale; delivery apps 15–30%. Enter 0 if you sell directly.',
    'question.import.platformFeePct.label': 'Marketplace or platform fee',
    'question.import.platformFeePct.placeholder': '0',
    'question.import.rent.help': 'Shop, kitchen, studio or office rent per month. Enter 0 if you work from home.',
    'question.import.rent.label': 'Rent or workspace',
    'question.import.returnsPct.help': 'Share of revenue lost to returns, warranty claims or damaged stock. 1–3% is common for electronics.',
    'question.import.returnsPct.label': 'Returns, warranty & write-offs',
    'question.import.returnsPct.placeholder': '1',
    'question.import.shipping.help': 'Inbound freight divided by units in the shipment, plus any delivery to the customer you pay for.',
    'question.import.shipping.label': 'Shipping / freight per unit',
    'question.import.software.help': 'Website, accounting, design tools, booking systems — per month.',
    'question.import.software.label': 'Software & subscriptions',
    'question.insurance.placeholder': '0',
    'question.insurance.suffix': 'per month',
    'question.labor.help': 'What you pay to produce one unit (factory price or hourly labour ÷ units per hour).',
    'question.labor.label': 'Production labour per unit',
    'question.labor.placeholder': '0',
    'question.labor.suffix': 'per unit',
    'question.laborHours.suffix': 'hours',
    'question.manufacture.channels.label': 'Where will you sell your units?',
    'question.manufacture.desiredMarginPct.placeholder': 'e.g. 28',
    'question.manufacture.expectedUnits.label': 'How many units do you expect to sell each month?',
    'question.manufacture.expectedUnits.placeholder': '30',
    'question.manufacture.expectedUnits.suffix': 'per month',
    'question.manufacture.marketingPerUnit.help': 'Total monthly ad spend divided by units sold. Enter 0 if you rely only on organic reach — we will still flag it as an assumption.',
    'question.manufacture.materials.help': 'Raw materials and components for one finished unit.',
    'question.manufacture.materials.label': 'Materials per unit',
    'question.manufacture.packaging.help': 'Boxes, labels, protective material, inserts.',
    'question.manufacture.platformFeePct.help': 'Marketplaces usually take 5–15% of each sale; delivery apps 15–30%. Enter 0 if you sell directly.',
    'question.manufacture.platformFeePct.label': 'Marketplace or platform fee',
    'question.manufacture.platformFeePct.placeholder': '0',
    'question.manufacture.rent.help': 'Shop, kitchen, studio or office rent per month. Enter 0 if you work from home.',
    'question.manufacture.rent.label': 'Rent or workspace',
    'question.manufacture.returnsPct.help': 'Share of revenue lost to returns, warranty claims or damaged stock. 1–3% is common for electronics.',
    'question.manufacture.returnsPct.label': 'Returns, warranty & write-offs',
    'question.manufacture.returnsPct.placeholder': '1',
    'question.manufacture.shipping.help': 'Inbound freight divided by units in the shipment, plus any delivery to the customer you pay for.',
    'question.manufacture.shipping.label': 'Shipping / freight per unit',
    'question.manufacture.software.help': 'Website, accounting, design tools, booking systems — per month.',
    'question.manufacture.software.label': 'Software & subscriptions',
    'question.marketingPerUnit.label': 'Advertising or acquisition cost per {unit}',
    'question.marketingPerUnit.placeholder': '0',
    'question.marketingPerUnit.suffix': 'per {unit}',
    'question.materials.placeholder': '0',
    'question.materials.suffix': 'per {unit}',
    'question.otherDirect.help': 'Email tool, file hosting, time answering buyers — per sale.',
    'question.otherDirect.label': 'Delivery & support cost per sale',
    'question.otherDirect.placeholder': '0',
    'question.otherDirect.suffix': 'per sale',
    'question.otherFixed.help': 'Internet, phone, insurance, licences, storage, equipment payments.',
    'question.otherFixed.label': 'Other monthly costs',
    'question.otherFixed.placeholder': '0',
    'question.otherFixed.suffix': 'per month',
    'question.packaging.label': 'Packaging per {unit}',
    'question.packaging.placeholder': '0',
    'question.packaging.suffix': 'per {unit}',
    'question.paymentFeePct.help': 'Card processors and payment links typically charge 2–3.5% per transaction.',
    'question.paymentFeePct.label': 'Payment processing fee',
    'question.paymentFeePct.placeholder': '2.9',
    'question.paymentFeePct.suffix': '%',
    'question.platformFeePct.suffix': '%',
    'question.prepHours.help': 'Unbilled time still costs you. Editing, travel, calls, invoicing.',
    'question.prepHours.placeholder': '0',
    'question.prepHours.suffix': 'hours',
    'question.purchase.help': 'What you pay the supplier for one unit, before shipping.',
    'question.purchase.label': 'Purchase cost per unit',
    'question.purchase.suffix': 'per unit',
    'question.rent.placeholder': '0',
    'question.rent.suffix': 'per month',
    'question.resell.channels.label': 'Where will you sell your units?',
    'question.resell.desiredMarginPct.placeholder': 'e.g. 16',
    'question.resell.expectedUnits.label': 'How many units do you expect to sell each month?',
    'question.resell.expectedUnits.placeholder': '30',
    'question.resell.expectedUnits.suffix': 'per month',
    'question.resell.marketingPerUnit.help': 'Total monthly ad spend divided by units sold. Enter 0 if you rely only on organic reach — we will still flag it as an assumption.',
    'question.resell.packaging.help': 'Boxes, labels, protective material, inserts.',
    'question.resell.platformFeePct.help': 'Marketplaces usually take 5–15% of each sale; delivery apps 15–30%. Enter 0 if you sell directly.',
    'question.resell.platformFeePct.label': 'Marketplace or platform fee',
    'question.resell.platformFeePct.placeholder': '0',
    'question.resell.rent.help': 'Shop, kitchen, studio or office rent per month. Enter 0 if you work from home.',
    'question.resell.rent.label': 'Rent or workspace',
    'question.resell.returnsPct.help': 'Share of revenue lost to returns, warranty claims or damaged stock. 1–3% is common for electronics.',
    'question.resell.returnsPct.label': 'Returns, warranty & write-offs',
    'question.resell.returnsPct.placeholder': '1',
    'question.resell.shipping.help': 'Inbound freight divided by units in the shipment, plus any delivery to the customer you pay for.',
    'question.resell.shipping.label': 'Shipping / freight per unit',
    'question.resell.software.help': 'Website, accounting, design tools, booking systems — per month.',
    'question.resell.software.label': 'Software & subscriptions',
    'question.returnsPct.suffix': '%',
    'question.saas.channels.label': 'Where will you sell your subscriber-months?',
    'question.saas.desiredMarginPct.placeholder': 'e.g. 65',
    'question.saas.devAmortised.help': 'Build cost (your time included) ÷ months to recover it, plus ongoing development.',
    'question.saas.devAmortised.label': 'Development cost, spread monthly',
    'question.saas.expectedUnits.label': 'How many paying subscribers do you expect?',
    'question.saas.expectedUnits.placeholder': '30',
    'question.saas.expectedUnits.suffix': 'subscribers',
    'question.saas.software.help': 'Fixed part of hosting, domains, monitoring, SaaS tools.',
    'question.saas.software.label': 'Base hosting & tools',
    'question.salaries.help': 'Monthly wages for anyone you pay regularly. Exclude yourself — we treat your profit as your income.',
    'question.salaries.label': 'Staff or assistants',
    'question.salaries.placeholder': '0',
    'question.salaries.suffix': 'per month',
    'question.service.channels.label': 'Where will you sell your bookings?',
    'question.service.deliveryHours.label': 'Hours on site per booking',
    'question.service.desiredMarginPct.placeholder': 'e.g. 32',
    'question.service.equipment.help': 'Camera, laptop, tools: purchase price ÷ months of useful life. A $3,000 camera over 36 months ≈ $83/month.',
    'question.service.equipment.label': 'Equipment depreciation',
    'question.service.expectedUnits.label': 'How many bookings do you expect to sell each month?',
    'question.service.expectedUnits.placeholder': '30',
    'question.service.expectedUnits.suffix': 'per month',
    'question.service.hourlyValue.help': 'The wage you would need to earn per hour to make this worthwhile. This becomes your labour cost; profit is calculated on top of it.',
    'question.service.insurance.help': 'Liability insurance, professional licences, trade registration.',
    'question.service.insurance.label': 'Insurance & licences',
    'question.service.marketingPerUnit.help': 'Total monthly ad spend divided by bookings sold. Enter 0 if you rely only on organic reach — we will still flag it as an assumption.',
    'question.service.materials.help': 'Cleaning products, prints, props, licences bought per job.',
    'question.service.materials.label': 'Materials & consumables',
    'question.service.platformFeePct.help': 'Marketplaces usually take 5–15% of each sale; delivery apps 15–30%. Enter 0 if you sell directly.',
    'question.service.platformFeePct.label': 'Marketplace or platform fee',
    'question.service.platformFeePct.placeholder': '0',
    'question.service.prepHours.label': 'Hours of preparation, editing and admin per booking',
    'question.service.rent.help': 'Shop, kitchen, studio or office rent per month. Enter 0 if you work from home.',
    'question.service.rent.label': 'Rent or workspace',
    'question.service.software.help': 'Website, accounting, design tools, booking systems — per month.',
    'question.service.software.label': 'Software & subscriptions',
    'question.shipping.placeholder': '0',
    'question.shipping.suffix': 'per {unit}',
    'question.software.placeholder': '0',
    'question.software.suffix': 'per month',
    'question.sourceRegion.help': 'Sourcing location changes which shipping and customs questions matter.',
    'question.sourceRegion.label': 'Where will you source it?',
    'question.storage.help': 'Monthly cost of storing stock, if any.',
    'question.storage.label': 'Storage / warehousing',
    'question.storage.placeholder': '0',
    'question.storage.suffix': 'per month',
    'question.supportPerUser.help': 'Support time or tooling divided by users.',
    'question.supportPerUser.label': 'Support cost per user',
    'question.supportPerUser.placeholder': '0',
    'question.supportPerUser.suffix': 'per user / month',
    'question.targetMonthlyProfit.help': 'We calculate the price and volume needed to reach this, and the roadmap is built around closing any gap.',
    'question.targetMonthlyProfit.label': 'How much profit do you want to make each month?',
    'question.targetMonthlyProfit.placeholder': '5000',
    'question.targetMonthlyProfit.suffix': 'per month',
    'question.travel.help': 'Fuel, parking, flights or delivery per job.',
    'question.travel.label': 'Travel / transport',
    'question.travel.placeholder': '0',
    'question.travel.suffix': 'per {unit}',
    'question.wastagePct.suffix': '%',
    'rec.cac.a1': 'Acquisition cost per {unit|t} falls by {pct|pct0} within 2–3 months.',
    'rec.cac.a2': 'Sales volume is unchanged.',
    'rec.cac.action': 'Launch a referral offer for existing customers, post consistently on one organic channel, and retarget past visitors instead of cold audiences. Track cost per sale weekly.',
    'rec.cac.title': 'Bring acquisition cost from {from|money} to ~{to|money} per {unit|t}',
    'rec.cac.why': 'You spend {share|pct} of every sale on acquiring the customer. Channels like referrals, organic content, WhatsApp broadcast lists and email cost far less per sale than paid ads.',
    'rec.labor_efficiency.a1': 'Time per {unit|t} falls by {pct|pct0}; the freed hours are used for more {units|t} or other paid work.',
    'rec.labor_efficiency.action': 'Time your next five jobs. Batch similar tasks, build templates or presets for repeated steps, and stop doing anything the customer does not notice.',
    'rec.labor_efficiency.title': 'Save {pct|pct0} of the time each {unit|t} takes',
    'rec.labor_efficiency.why': 'Your time is {share|pct0} of the cost per {unit|t}. Templates, batching and checklists usually recover this much without lowering quality.',
    'rec.materials_cost.a1': 'Materials cost drops by {pct|pct0} at wholesale quantities.',
    'rec.materials_cost.a2': 'No change in quality or sales volume.',
    'rec.materials_cost.action': 'Price your three most expensive ingredients or materials at wholesale quantities. Check whether a slightly cheaper grade would be noticed by customers.',
    'rec.materials_cost.title': 'Cut materials cost by ~{pct|pct0} through bulk buying',
    'rec.materials_cost.why': 'Materials are {share|pct0} of your cost per {unit|t}. Buying in larger quantities or from a wholesaler usually brings this down.',
    'rec.overhead.a1': '{pct|pct0} of fixed costs can be removed without affecting sales.',
    'rec.overhead.action': 'List every recurring charge and cancel or downgrade anything not used in the last 30 days. Renegotiate rent or move to shared space if you are below capacity.',
    'rec.overhead.title': 'Trim monthly fixed costs by {pct|pct0} (~{saving|money})',
    'rec.overhead.why': 'Fixed costs of {fixed|money}/month add {perUnit|money} to every {unit|t} at your expected volume. Unused subscriptions, oversized space and idle tools are the usual culprits.',
    'rec.platform_fees.a1': '{share|pct0} of volume moves to a channel with fees {points|plain} points lower.',
    'rec.platform_fees.a2': 'Total volume is unchanged.',
    'rec.platform_fees.action': 'Add a "reorder directly" card or WhatsApp link in every delivery. Offer a small direct-order incentive that is still cheaper than the platform fee.',
    'rec.platform_fees.title': 'Move {share|pct0} of sales to a lower-fee channel',
    'rec.platform_fees.why': 'Platform fees of {feePct|plain}% take {feeAmount|money} from every {unit|t}. Direct channels (your own store, WhatsApp) keep most of that.',
    'rec.price_test.a1': 'A {pct|pct0} price rise loses {loss|pct0} of volume (a cautious elasticity assumption).',
    'rec.price_test.action': 'Run the higher price for 2–4 weeks on new customers only. Keep the offer identical and watch conversion, not just complaints. Keep it if profit rises.',
    'rec.price_test.title': 'Test a {pct|pct0} higher price ({newPrice|money})',
    'rec.price_test.why': 'Your recommended margin ({margin|pct}) is below the top of the typical range for {typeKey|t} businesses ({high|pct0}). Even if a few customers drop off, the higher price is likely to earn more.',
    'rec.repeat.a1': 'Repeat purchases add {pct|pct0} to monthly volume.',
    'rec.repeat.a2': 'Repeat orders carry no marketing cost.',
    'rec.repeat.action': 'Collect every customer’s contact at purchase, follow up 2–4 weeks later with a reorder reminder or a loyalty perk, and make reordering a one-tap action.',
    'rec.repeat.title': 'Win {pct|pct0} more volume from repeat customers',
    'rec.repeat.why': 'Repeat {units|t} have no acquisition cost, so each one earns about {each|money} — more than a new sale.',
    'rec.returns.a1': 'Return rate falls by {pct|pct0}.',
    'rec.returns.action': 'Read every refund reason for a month. Fix the top two causes: usually mismatched expectations or shipping damage.',
    'rec.returns.title': 'Cut returns and refunds by a third',
    'rec.returns.why': 'Returns of {ratePct|plain}% cost {amount|money} per {unit|t}. Clearer descriptions, better packaging and quality checks reduce them.',
    'rec.shipping_cost.a1': '{pct|pct0} lower shipping through consolidation or negotiated rates.',
    'rec.shipping_cost.action': 'Get quotes from two freight forwarders or couriers for consolidated monthly shipments. Ask about volume-based rates once you reach a steady order count.',
    'rec.shipping_cost.title': 'Reduce shipping from {from|money} to about {to|money} per {unit|t}',
    'rec.shipping_cost.why': 'Shipping is {share|pct0} of your cost per {unit|t}. Consolidated shipments and negotiated courier rates typically cut this.',
    'rec.supplier_cost.a1': 'A {pct|pct0} lower purchase price is achievable at your volume (conservative for most categories).',
    'rec.supplier_cost.a2': 'Volume stays at {count|plain} {units|t}/month.',
    'rec.supplier_cost.action': 'Request quotes from 3–5 suppliers for your volume. Compare landed cost (price + shipping + duties), minimum order quantity, warranty and payment terms — not just the unit price.',
    'rec.supplier_cost.title': 'Find a supplier below {target|money} per {unit|t}',
    'rec.supplier_cost.why': 'Purchase cost is {share|pct0} of your true cost per {unit|t} — the single biggest lever you have. Every {cur} saved here goes straight to profit.',
    'rec.upsell.a1': '{attach|pct0} of customers take the add-on.',
    'rec.upsell.a2': 'The add-on carries a {margin|pct0} margin.',
    'rec.upsell.action': 'Design one add-on at roughly {share|pct0} of your price and offer it at the moment of purchase. Measure the attach rate for a month.',
    'rec.upsell.example.digital': 'a workbook, template pack or 1:1 session',
    'rec.upsell.example.food': 'drinks, sides or a "party size" option',
    'rec.upsell.example.freelance': 'an express-delivery option, extra deliverables or a maintenance package',
    'rec.upsell.example.handmade': 'gift wrapping, personalisation or a matching item',
    'rec.upsell.example.import': 'accessories, cases, protection plans or extended warranty',
    'rec.upsell.example.manufacture': 'a matching add-on',
    'rec.upsell.example.resell': 'accessories, cases, protection plans or extended warranty',
    'rec.upsell.example.saas': 'a higher tier, add-on seats or onboarding',
    'rec.upsell.example.service': 'an express-delivery option, extra deliverables or a maintenance package',
    'rec.upsell.title': 'Add an upsell worth ~{addon|money} ({exampleKey|t})',
    'rec.upsell.why': 'Selling something extra to a customer you already have costs almost nothing to acquire. A modest add-on with a healthy margin lifts profit per {unit|t} without touching your core price.',
    'rec.volume.a1': 'Volume grows {pct|pct0} at the same price and acquisition cost.',
    'rec.volume.a2': 'Fixed costs do not increase.',
    'rec.volume.action': 'Pick one channel you are not using yet and commit to it for 60 days. Set a weekly target of new enquiries, not sales, and track conversion.',
    'rec.volume.title': 'Grow to {target|plain} {units|t}/month',
    'rec.volume.why': 'Fixed costs are {share|pct0} of your cost per {unit|t}. Every extra {unit|t} spreads them thinner and earns the full contribution of {contribution|money}.',
    'rec.waste.a1': 'Waste is halved with no change in sales.',
    'rec.waste.action': 'Track what is thrown away for two weeks, then adjust batch sizes, pre-orders and storage to match real demand.',
    'rec.waste.title': 'Halve waste from {from|plain}% to {to|plain}%',
    'rec.waste.why': 'Waste adds {amount|money} to every {unit|t}. Better forecasting and portion control usually halve it.',
    'results.badge': 'Recommended',
    'results.breakEven': 'Break-even',
    'results.breakEvenAt': 'Break-even sales at {price|money0}',
    'results.breakEvenExplain': 'The break-even price is the lowest price that covers every cost — including your share of fixed costs — at {count|plain} {units|t} a month. Below the variable break-even you lose money on every single sale, regardless of volume.',
    'results.breakEvenOk': 'Sell {breakEven|plain} of your expected {count|plain} {units|t} and the rest is profit.',
    'results.breakEvenPrice': 'Break-even price',
    'results.breakEvenSales': 'Break-even sales',
    'results.breakEvenSales.sub': 'of your expected {count|plain}',
    'results.costGoes': 'Where each {cur} of cost goes',
    'results.editAnswers': 'Edit answers',
    'results.estimatesNote': 'Estimates from your inputs · not a guarantee',
    'results.experiment': 'Experiment',
    'results.eyebrow': 'Your recommended price · {offering}',
    'results.fixedMonthly': 'Monthly fixed costs',
    'results.margin': 'Margin',
    'results.openRoadmap': 'Open the roadmap',
    'results.original': 'Original: {value}',
    'results.outlook': 'Monthly outlook',
    'results.outlook.at': 'at {count|plain} {units|t}',
    'results.profit': 'Est. monthly profit',
    'results.profitPerUnit': 'Profit per {unit|t}',
    'results.pts': '{value} pts',
    'results.reset': 'Reset',
    'results.revenue': 'Est. monthly revenue',
    'results.roadmapWorth': 'What your roadmap is worth',
    'results.seeRoadmap': 'See my Profit Roadmap',
    'results.slider.fixedMonthlyTotal': 'Monthly fixed costs',
    'results.slider.labor': 'Labour cost',
    'results.slider.marketingPerUnit': 'Marketing per {unit|t}',
    'results.slider.materials': 'Materials',
    'results.slider.price': 'Selling price',
    'results.slider.purchase': 'Purchase cost',
    'results.slider.shipping': 'Shipping',
    'results.slider.units': '{units|t} per month',
    'results.sub': 'per {unit|t} · priced for the {margin|pct0} margin typical of this kind of business',
    'results.tab.pricing': 'Pricing',
    'results.tab.target': 'Target profit',
    'results.tab.whatif': 'What if?',
    'results.target.above': 'That is above the typical {low|pct0}–{high|pct0} range for this kind of business — the roadmap focuses on reaching the target by lowering costs and raising volume instead.',
    'results.target.exclFees': 'excl. % fees',
    'results.target.intro': 'Change the target and volume to see what they demand from your price.',
    'results.target.orKeep': 'Or keep {price|money0} and sell',
    'results.target.perMonth': '{count|plain} {units|t} / month',
    'results.target.profit': 'Target monthly profit',
    'results.target.requiredMargin': 'Required margin',
    'results.target.requiredPrice': 'Required price',
    'results.target.requiredPrice.sub': 'at {count|plain} {units|t}',
    'results.target.requiredProfit': 'Required profit / {unit|t}',
    'results.target.title': 'How much do you want to make per month?',
    'results.target.trueCostAtVolume': 'True cost at that volume',
    'results.target.units': 'Expected {units|t} per month',
    'results.target.verdict': 'At {price|money0}, your estimated margin would be {margin|pct}.',
    'results.target.within': 'That sits within the typical {low|pct0}–{high|pct0} range for this kind of business.',
    'results.threeWays': 'Three ways to price it',
    'results.trueCost': 'True cost',
    'results.unchanged': 'unchanged',
    'results.unitsPerMonth': '{count|plain} {units|t} / month',
    'results.variableBreakEven': 'Variable break-even',
    'results.whatif.breakEvenPrice': 'Break-even price',
    'results.whatif.breakEvenUnits': 'Break-even units',
    'results.whatif.compared': 'Compared with your recommended setup, estimated monthly profit changes by',
    'results.whatif.margin': 'Margin',
    'results.whatif.monthlyProfit': 'Monthly profit',
    'results.whatif.monthlyRevenue': 'Monthly revenue',
    'results.whatif.profitPerUnit': 'Profit / {unit|t}',
    'results.whatif.stronger': 'This scenario looks stronger.',
    'results.whatif.unitsForTarget': 'Units needed for your target',
    'results.whatif.unitsForTarget.sub': 'to reach {target|money0} at {price|money0} — was {was}',
    'results.whatif.volumeNote': 'Volume assumptions are yours; we don\'t predict demand.',
    'results.whatif.was': 'was {value}',
    'results.whatif.weaker': 'This scenario looks weaker.',
    'results.why': 'Why {price|money0}?',
    'roadmap.analyseAnother': 'Analyse another business',
    'roadmap.assumptions': 'Assumptions behind this estimate',
    'roadmap.backToPricing': 'Back to pricing',
    'roadmap.chip': 'Profit Roadmap · {offering}',
    'roadmap.difficulty': '{difficulty} to do',
    'roadmap.disclaimer': 'These are estimates based on the numbers you provided and the assumptions listed under each item. They are not predictions or guarantees. Improvements interact, so the combined effect is usually smaller than the sum of the parts.',
    'roadmap.doneOf': ' / {total|plain} done',
    'roadmap.estPerMonth': 'est. per month',
    'roadmap.estimatedImpact': 'Estimated impact',
    'roadmap.impactShare': 'per month · {share|plain}% of the total lift',
    'roadmap.intro': 'There are more ways to grow profit than raising your price. These are the levers that matter most for your numbers, ranked by estimated impact and effort.',
    'roadmap.liftFrom': 'Where the lift comes from',
    'roadmap.markDone': 'Mark as done',
    'roadmap.markNotDone': 'Mark as not done',
    'roadmap.nextAction': 'Next action',
    'roadmap.perMonth': '{amount|money0} / mo',
    'roadmap.priority': '{priority} priority',
    'roadmap.progress': 'Your progress',
    'roadmap.shareOfLift': '{share|plain}% of the total lift',
    'roadmap.startHere': 'Start here — your best next move',
    'roadmap.sumNote': 'Sum of items {sum|money0}, reduced by {discount|pct0} because improvements overlap.',
    'roadmap.targetReached': 'Reaches your {target|money0} monthly target.',
    'roadmap.targetShort': 'Still short of your {target|money0} monthly target.',
    'roadmap.title': 'How to make more profit at {price|money0}',
    'scenario.minimum.label': 'Minimum',
    'scenario.minimum.note': 'Covers every cost with a thin safety margin. Little room for surprises.',
    'scenario.premium.label': 'Premium',
    'scenario.premium.note': 'Higher margin per sale, but you will likely need stronger positioning or fewer, better customers.',
    'scenario.recommended.label': 'Recommended',
    'scenario.recommended.note.midpoint': 'Targets a {margin|pct0} net margin — the midpoint for {typeKey|t} businesses.',
    'scenario.recommended.note.requested': 'Targets a {margin|pct0} net margin — your requested margin.',
    'scenario.status.loss': 'Loses money',
    'scenario.status.low': 'Thin margin',
    'scenario.status.premium': 'Higher margin',
    'scenario.status.recommended': 'Recommended',
    'unit.digital.one': 'sale',
    'unit.digital.other': 'sales',
    'unit.food.one': 'order',
    'unit.food.other': 'orders',
    'unit.freelance.one': 'project',
    'unit.freelance.other': 'projects',
    'unit.generic.one': 'unit',
    'unit.generic.other': 'units',
    'unit.handmade.one': 'item',
    'unit.handmade.other': 'items',
    'unit.import.one': 'unit',
    'unit.import.other': 'units',
    'unit.manufacture.one': 'unit',
    'unit.manufacture.other': 'units',
    'unit.resell.one': 'unit',
    'unit.resell.other': 'units',
    'unit.saas.one': 'subscriber-month',
    'unit.saas.other': 'subscriber-months',
    'unit.service.one': 'booking',
    'unit.service.other': 'bookings',
    'warning.fees': 'Percentage fees take {share|pct0} of every sale before you see any profit.',
    'warning.fixedShare': 'Fixed costs are {share|pct0} of your cost per {unit|t}. Your price depends heavily on actually selling {count|plain} {units|t} a month.',
    'warning.marginTooHigh': 'A {desired|pct0} margin is well above the typical {low|pct0}–{high|pct0} for this business type; expect a harder sell.',
    'warning.shortOfTarget': 'At the recommended price and {count|plain} {units|t}/month you would be about {gap|plain} {cur} short of your {target|plain} {cur} target. See the target panel and roadmap.',
};

  };
  defs["messages.es"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ES = void 0;
/** Placeholder — filled in below. Missing keys fall back to English. */
exports.ES = {};

  };
  defs["messages.fr"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FR = void 0;
/** Placeholder — filled in below. Missing keys fall back to English. */
exports.FR = {};

  };
  return req('./index');
})();
