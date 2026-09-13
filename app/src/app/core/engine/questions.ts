/**
 * Dynamic questionnaire registry.
 * Adding a business type = adding an entry to TYPE_GROUPS (and a BUSINESS_TYPES entry).
 * The UI is generic and renders whatever groups this file returns.
 */
import { Answers, BusinessType } from './types';
import { businessTypeDef } from './business-types';

export type QuestionType = 'number' | 'percent' | 'hours' | 'select' | 'multiselect' | 'text' | 'currency';

export interface QuestionOption {
  value: string;
  label: string;
  hint?: string;
}

export interface Question {
  key: string;
  label: string;
  /** "Why we ask" — always shown on demand. */
  help: string;
  type: QuestionType;
  /** Suffix shown in the input: "per unit", "per month", "%", "hours"… */
  suffix?: string;
  /** Uses the analysis currency as prefix */
  money?: boolean;
  placeholder?: string;
  options?: QuestionOption[];
  required?: boolean;
  min?: number;
  max?: number;
  showIf?: (a: Answers) => boolean;
  /** Sensible default used ONLY when the user leaves it blank; shown as placeholder and listed as an assumption. */
  defaultValue?: number | string | string[];
}

export interface QuestionGroup {
  id: string;
  title: string;
  intro: string;
  questions: Question[];
}

const CURRENCIES: QuestionOption[] = [
  ['USD', 'US Dollar'], ['EUR', 'Euro'], ['GBP', 'British Pound'], ['OMR', 'Omani Rial'], ['AED', 'UAE Dirham'], ['SAR', 'Saudi Riyal'],
  ['QAR', 'Qatari Riyal'], ['KWD', 'Kuwaiti Dinar'], ['BHD', 'Bahraini Dinar'], ['EGP', 'Egyptian Pound'], ['INR', 'Indian Rupee'], ['PKR', 'Pakistani Rupee'],
  ['TRY', 'Turkish Lira'], ['CAD', 'Canadian Dollar'], ['AUD', 'Australian Dollar'], ['NGN', 'Nigerian Naira'], ['KES', 'Kenyan Shilling'], ['ZAR', 'South African Rand'],
  ['MYR', 'Malaysian Ringgit'], ['PHP', 'Philippine Peso'], ['IDR', 'Indonesian Rupiah'], ['BRL', 'Brazilian Real'], ['MXN', 'Mexican Peso'], ['JPY', 'Japanese Yen'],
].map(([value, label]) => ({ value, label: `${value} — ${label}` }));

export const CURRENCY_OPTIONS = CURRENCIES;

const CHANNELS: QuestionOption[] = [
  { value: 'online_store', label: 'My own online store' },
  { value: 'instagram', label: 'Instagram / TikTok' },
  { value: 'whatsapp', label: 'WhatsApp / direct' },
  { value: 'marketplace', label: 'Marketplace (Amazon, Noon, Etsy…)' },
  { value: 'physical', label: 'Physical shop or stall' },
  { value: 'delivery_app', label: 'Delivery app (Talabat, Uber Eats…)' },
  { value: 'referrals', label: 'Referrals / word of mouth' },
  { value: 'platform', label: 'Freelance platform (Upwork, Fiverr…)' },
];

function contextGroup(type: BusinessType): QuestionGroup {
  const def = businessTypeDef(type);
  const qs: Question[] = [];
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
      if (type === 'food') return c.value !== 'platform';
      if (type === 'freelance') return !['physical', 'delivery_app', 'marketplace'].includes(c.value);
      if (type === 'service') return !['delivery_app', 'marketplace'].includes(c.value);
      if (type === 'saas' || type === 'digital') return ['online_store', 'instagram', 'marketplace', 'referrals', 'platform'].includes(c.value);
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

function money(key: string, label: string, help: string, extra: Partial<Question> = {}): Question {
  return { key, label, help, type: 'number', money: true, min: 0, ...extra };
}
function percent(key: string, label: string, help: string, extra: Partial<Question> = {}): Question {
  return { key, label, help, type: 'percent', suffix: '%', min: 0, max: 100, ...extra };
}
function hours(key: string, label: string, help: string, extra: Partial<Question> = {}): Question {
  return { key, label, help, type: 'hours', suffix: 'hours', min: 0, ...extra };
}

const PAYMENT_FEE = percent('paymentFeePct', 'Payment processing fee', 'Card processors and payment links typically charge 2–3.5% per transaction.', { placeholder: '2.9', defaultValue: 2.9 });
const PLATFORM_FEE = percent('platformFeePct', 'Marketplace or platform fee', 'Marketplaces usually take 5–15% of each sale; delivery apps 15–30%. Enter 0 if you sell directly.', {
  placeholder: '0',
  defaultValue: 0,
  showIf: (a) => Array.isArray(a['channels']) && (a['channels'] as string[]).some((c) => ['marketplace', 'delivery_app', 'platform'].includes(c)),
});
const MARKETING = (unit: string) =>
  money('marketingPerUnit', `Advertising or acquisition cost per ${unit}`, `Total monthly ad spend divided by ${unit}s sold. Enter 0 if you rely only on organic reach — we will still flag it as an assumption.`, { placeholder: '0', suffix: `per ${unit}`, defaultValue: 0 });

function fixedGroup(items: Question[]): QuestionGroup {
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

function goalsGroup(type: BusinessType): QuestionGroup {
  const def = businessTypeDef(type);
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

function physicalGroups(type: 'resell' | 'import' | 'manufacture'): QuestionGroup[] {
  const direct: Question[] = [];
  if (type === 'manufacture') {
    direct.push(money('materials', 'Materials per unit', 'Raw materials and components for one finished unit.', { required: true, suffix: 'per unit' }));
    direct.push(money('labor', 'Production labour per unit', 'What you pay to produce one unit (factory price or hourly labour ÷ units per hour).', { placeholder: '0', suffix: 'per unit', defaultValue: 0 }));
  } else {
    direct.push(money('purchase', 'Purchase cost per unit', 'What you pay the supplier for one unit, before shipping.', { required: true, suffix: 'per unit' }));
  }
  direct.push(money('shipping', 'Shipping / freight per unit', 'Inbound freight divided by units in the shipment, plus any delivery to the customer you pay for.', { placeholder: '0', suffix: 'per unit', defaultValue: 0 }));
  direct.push(
    percent('customsPct', 'Customs & duties', 'Percentage of purchase value charged at import. GCC standard rate is often 5%; check your HS code. Enter 0 for local sourcing.', {
      placeholder: '5',
      defaultValue: 0,
      showIf: (a) => a['sourceRegion'] !== undefined && a['sourceRegion'] !== 'local',
    }),
  );
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

function serviceGroups(type: 'service' | 'freelance'): QuestionGroup[] {
  const unit = businessTypeDef(type).unitLabel;
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

function handmadeGroups(): QuestionGroup[] {
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

function foodGroups(): QuestionGroup[] {
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

function digitalGroups(): QuestionGroup[] {
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

function saasGroups(): QuestionGroup[] {
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

const TYPE_GROUPS: Record<BusinessType, () => QuestionGroup[]> = {
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
export function questionGroupsFor(type: BusinessType): QuestionGroup[] {
  return [contextGroup(type), ...TYPE_GROUPS[type](), goalsGroup(type)];
}

/** Only the questions whose showIf passes for the current answers. */
export function visibleQuestions(group: QuestionGroup, answers: Answers): Question[] {
  return group.questions.filter((q) => !q.showIf || q.showIf(answers));
}

/** Validation: returns a map of key -> message for the visible questions of a group. */
export function validateGroup(group: QuestionGroup, answers: Answers): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const q of visibleQuestions(group, answers)) {
    const v = answers[q.key];
    const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    if (q.required && empty) {
      errors[q.key] = 'This one is needed for the calculation.';
      continue;
    }
    if (!empty && (q.type === 'number' || q.type === 'percent' || q.type === 'hours')) {
      const n = Number(v);
      if (!isFinite(n)) errors[q.key] = 'Please enter a number.';
      else if (q.min !== undefined && n < q.min) errors[q.key] = `Must be at least ${q.min}.`;
      else if (q.max !== undefined && n > q.max) errors[q.key] = `Must be at most ${q.max}.`;
    }
  }
  return errors;
}

/** List of defaults that were applied because the user left a field blank — surfaced as assumptions. */
export function appliedDefaults(type: BusinessType, answers: Answers): Array<{ key: string; label: string; value: number | string | string[] }> {
  const out: Array<{ key: string; label: string; value: number | string | string[] }> = [];
  for (const g of questionGroupsFor(type)) {
    for (const q of visibleQuestions(g, answers)) {
      const v = answers[q.key];
      const empty = v === undefined || v === null || v === '';
      if (empty && q.defaultValue !== undefined && q.defaultValue !== 0 && q.defaultValue !== '0') out.push({ key: q.key, label: q.label, value: q.defaultValue });
    }
  }
  return out;
}
