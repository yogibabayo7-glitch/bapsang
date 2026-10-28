import type { CategoryId, Region } from './catalog';

export type Item = {
  id: string;
  name: string;
  unit: string;
  emoji: string;
  cat: CategoryId;
  season?: number[];
  origin?: 'kr'; // 국산 품종 시세
  kindName?: string; // KAMIS 품종 이름
};

// q[지역][품목] = [오늘, 1일전, 1주전, 2주전, 1개월전, 1년전, 30일 평균] (없으면 null, 30일 평균은 v0.5 수집기부터)
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

export const Q = { now: 0, d1: 1, w1: 2, w2: 3, m1: 4, y1: 5, avg30: 6 } as const;

// 30일 평균보다 이만큼 이상 싸면 "평소보다 싸요"
export const CHEAP_RATIO = 0.95;

// 토스쇼핑 추천 상품 (tools/shop 스크립트가 매일 만들어요)
export type ShopItem = { id: string; name: string; thumb: string; url: string; cat?: string };
export type Shop = {
  updatedAt: string;
  disclosure: string;
  pages?: { fresh?: string; deals?: string };
  groups: Record<string, ShopItem[]>;
  // 품목 id → 그 품목 카테고리에서 이름 규칙으로 고른 상품 (10/28~, 없으면 예전 shop.json)
  // 10/28 저녁부터는 상품 번호 목록 (상품 내용은 groups에 한 번만)
  items?: Record<string, (string | ShopItem)[]>;
};
