import { BusinessType, MarginBand } from './types';

export interface BusinessTypeDef {
  type: BusinessType;
  label: string;
  shortLabel: string;
  icon: string; // emoji, used in the type picker only
  description: string;
  unitLabel: string;
  unitLabelPlural: string;
  /** Target net-margin band (fractions of price) used for the three scenarios. */
  marginBand: MarginBand;
  /** Minimum margin we will ever recommend as "minimum viable" */
  floorMargin: number;
  /** Does this business typically see repeat purchases? Drives roadmap rules. */
  repeatable: boolean;
  examples: string[];
}

export const BUSINESS_TYPES: Record<BusinessType, BusinessTypeDef> = {
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

export const BUSINESS_TYPE_LIST: BusinessTypeDef[] = Object.values(BUSINESS_TYPES);

export function businessTypeDef(type: BusinessType): BusinessTypeDef {
  return BUSINESS_TYPES[type] ?? BUSINESS_TYPES.resell;
}
