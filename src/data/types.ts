import type { CategoryId, Region } from './catalog';

export type Item = {
  id: string;
  name: string;
  unit: string;
  emoji: string;
  cat: CategoryId;
  season?: number[];
};

// q[지역][품목] = [오늘, 1일전, 1주전, 2주전, 1개월전, 1년전] (없으면 null)
export type Quote = (number | null)[];

export type PriceBook = {
  date: string; // 조사일 YYYY-MM-DD
  fetchedAt: string;
  isSample: boolean;
  regions: Region[];
  items: Item[];
  q: Record<string, Record<string, Quote>>;
};

export type History = { region: string; points: Record<string, [string, number][]> };

export const Q = { now: 0, d1: 1, w1: 2, w2: 3, m1: 4, y1: 5 } as const;

// 토스쇼핑 추천 상품 (tools/shop 스크립트가 매일 만들어요)
export type ShopItem = { id: string; name: string; thumb: string; url: string; cat?: string };
export type Shop = {
  updatedAt: string;
  disclosure: string;
  pages?: { fresh?: string; deals?: string };
  groups: Record<string, ShopItem[]>;
};
