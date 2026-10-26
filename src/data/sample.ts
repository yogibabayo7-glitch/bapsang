// 화면 확인용 샘플 가격이에요. 진짜 시세가 연결되면 쓰이지 않아요.
import { CATALOG, REGIONS } from './catalog';
import type { History, PriceBook, Quote } from './types';

// 품목별 대략적인 가격 (샘플용)
const BASE: Record<string, [number, string]> = {
  rice: [62000, '20kg'], 'glutinous-rice': [5200, '1kg'], 'brown-rice': [5800, '1kg'], barley: [5700, '1kg'],
  'mixed-grain': [7900, '1kg'], soybean: [5100, '500g'], 'red-bean': [13500, '500g'], 'mung-bean': [12200, '500g'],
  'sweet-potato': [5600, '1kg'], potato: [350, '100g'], cabbage: [4200, '1포기'], 'baby-cabbage': [3100, '1포기'],
  'young-cabbage': [4300, '1kg'], radish: [2600, '1개'], 'young-radish': [4800, '1kg'], 'cabbage-head': [4300, '1포기'],
  spinach: [890, '100g'], lettuce: [1080, '100g'], perilla: [1900, '50g'], chives: [1050, '100g'],
  'water-parsley': [1250, '100g'], onion: [2480, '1kg'], 'green-onion': [3300, '1kg'], scallion: [9800, '1kg'],
  garlic: [11500, '1kg'], ginger: [14000, '1kg'], carrot: [4100, '1kg'], cucumber: [9800, '10개'],
  zucchini: [1650, '1개'], eggplant: [3200, '3개'], tomato: [5900, '1kg'], 'cherry-tomato': [9300, '1kg'],
  paprika: [1550, '1개'], broccoli: [2900, '1개'], 'green-pepper': [1300, '100g'], cheongyang: [1350, '100g'],
  'red-pepper': [1700, '100g'], 'dried-pepper': [21000, '600g'], 'pepper-powder': [42000, '1kg'],
  'oyster-mushroom': [790, '100g'], enoki: [580, '150g'], 'king-oyster': [790, '100g'], sesame: [16500, '500g'],
  peanut: [3100, '100g'], walnut: [2300, '100g'], almond: [2600, '100g'], apple: [27800, '10개'], pear: [39500, '10개'],
  persimmon: [6900, '5개'], grape: [9700, '1kg'], 'shine-muscat': [19800, '2kg'], kiwi: [12500, '10개'],
  banana: [330, '100g'], pineapple: [7200, '1개'], orange: [16800, '10개'], lemon: [9900, '10개'], mango: [3900, '1개'],
  blueberry: [21000, '1kg'], avocado: [1990, '1개'], egg: [6980, '30구'], milk: [3050, '1L'], 'pork-belly': [2650, '100g'],
  'pork-neck': [2600, '100g'], 'pork-shoulder': [1550, '100g'], 'pork-rib': [1700, '100g'], 'beef-sirloin': [11800, '100g'],
  'beef-tenderloin': [13500, '100g'], 'beef-brisket': [8600, '100g'], 'beef-rib': [10200, '100g'], 'us-beef': [4800, '100g'],
  'imported-pork': [1450, '100g'], chicken: [6300, '1kg'], mackerel: [4300, '1마리'], hairtail: [12900, '1마리'],
  'yellow-croaker': [3200, '1마리'], gulbi: [3900, '1마리'], pollack: [4100, '1마리'], 'spanish-mackerel': [6900, '1마리'],
  saury: [7600, '5마리'], squid: [6500, '1마리'], octopus: [3100, '100g'], shrimp: [6100, '10마리'], crab: [21000, '1kg'],
  abalone: [16900, '5마리'], mussel: [6800, '1kg'], clam: [11800, '1kg'], cockle: [10900, '1kg'], anchovy: [3400, '100g'],
  'dried-squid': [66000, '10마리'], laver: [1300, '10장'], seaweed: [3400, '100g'], kelp: [1500, '100g'],
  'salted-shrimp': [27000, '1kg'], 'fish-sauce': [6300, '1kg'], 'sea-salt': [11300, '5kg'],
};

function seeded(seed: number) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (v: number) => (v < 10000 ? Math.round(v / 10) * 10 : Math.round(v / 100) * 100);
const toDay = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

function weekdays(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  while (out.length < n) {
    if (d.getDay() !== 0 && d.getDay() !== 6) out.unshift(toDay(d));
    d.setDate(d.getDate() - 1);
  }
  return out;
}

const DAYS = weekdays(23); // 약 한 달
const regionFactor = (i: number) => (i === 0 ? 1 : 0.95 + seeded(i * 7)() * 0.1);
const items = CATALOG.filter((c) => BASE[c.id]);

function series(itemIdx: number, regionIdx: number): number[] {
  const rand = seeded(itemIdx * 97 + 13);
  const rr = seeded(itemIdx * 31 + regionIdx * 7 + 5);
  const trend = (rand() - 0.5) * 0.012;
  let v = BASE[items[itemIdx].id][0] * (1 - trend * 12);
  const f = regionFactor(regionIdx);
  return DAYS.map(() => {
    v *= 1 + trend + (rand() - 0.5) * 0.035;
    return round(v * f * (1 + (rr() - 0.5) * 0.01));
  });
}

export function makeSampleBook(): PriceBook {
  const q: PriceBook['q'] = {};
  REGIONS.forEach((r, ri) => {
    q[r.id] = {};
    items.forEach((it, ii) => {
      const s = series(ii, ri);
      const at = (back: number) => s[Math.max(0, s.length - 1 - back)];
      const quote: Quote = [at(0), at(1), at(5), at(10), s[0], round(at(0) * (0.85 + seeded(ii + 3)() * 0.3))];
      q[r.id][it.id] = quote;
    });
  });
  return {
    date: DAYS[DAYS.length - 1],
    fetchedAt: new Date().toISOString(),
    isSample: true,
    regions: REGIONS,
    items: items.map((c) => ({
      id: c.id,
      name: c.name,
      unit: BASE[c.id][1],
      emoji: c.emoji,
      cat: c.cat,
      ...(c.season ? { season: c.season } : {}),
    })),
    q,
  };
}

export function makeSampleHistory(region: string): History {
  const ri = Math.max(0, REGIONS.findIndex((r) => r.id === region));
  const points: History['points'] = {};
  items.forEach((it, ii) => {
    const s = series(ii, ri);
    points[it.id] = DAYS.map((d, i) => [d, s[i]]);
  });
  return { region, points };
}
