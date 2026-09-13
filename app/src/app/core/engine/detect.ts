import { BusinessType } from './types';

export interface Detection {
  type: BusinessType;
  confidence: number; // 0..1
  matched: string[];
  alternatives: BusinessType[];
}

/** Weighted keyword lists. Lower-cased substrings; weight reflects how diagnostic the word is. */
const KEYWORDS: Record<BusinessType, Array<[string, number]>> = {
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

export function detectBusinessType(text: string): Detection {
  const t = ` ${(text || '').toLowerCase().trim()} `;
  const scores: Record<BusinessType, { score: number; matched: string[] }> = {
    resell: { score: 0, matched: [] }, import: { score: 0, matched: [] }, manufacture: { score: 0, matched: [] },
    service: { score: 0, matched: [] }, freelance: { score: 0, matched: [] }, handmade: { score: 0, matched: [] },
    food: { score: 0, matched: [] }, digital: { score: 0, matched: [] }, saas: { score: 0, matched: [] },
  };
  (Object.keys(KEYWORDS) as BusinessType[]).forEach((type) => {
    for (const [kw, w] of KEYWORDS[type]) {
      if (t.includes(kw)) {
        scores[type].score += w;
        scores[type].matched.push(kw.trim());
      }
    }
  });
  const ranked = (Object.keys(scores) as BusinessType[]).sort((a, b) => scores[b].score - scores[a].score);
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
