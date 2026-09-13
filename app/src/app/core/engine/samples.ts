import { Answers, BusinessType } from './types';

export interface SampleAnalysis {
  name: string;
  offering: string;
  type: BusinessType;
  answers: Answers;
}

/** The iPhone example from the product brief, used by the landing page and as a demo. */
export const SAMPLES: SampleAnalysis[] = [
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
