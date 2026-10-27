// 가격 데이터를 어디서 가져올지 정하는 곳.
// .env 파일의 VITE_DATA_BASE에 GitHub Pages 주소를 넣으면 진짜 시세를 써요. 비어 있으면 샘플을 보여줘요.
// 예: VITE_DATA_BASE=https://아이디.github.io/jangbaguni/data
import { makeSampleBook, makeSampleHistory } from './sample';
import type { History, PriceBook, Shop } from './types';

export const DATA_BASE: string = import.meta.env.VITE_DATA_BASE ?? '';

export async function loadPriceBook(): Promise<PriceBook> {
  if (DATA_BASE) {
    try {
      const res = await fetch(`${DATA_BASE}/latest.json`, { cache: 'no-cache' });
      if (res.ok) return (await res.json()) as PriceBook;
    } catch {}
  }
  return makeSampleBook();
}

export async function loadHistory(region: string): Promise<History | null> {
  if (DATA_BASE) {
    try {
      const res = await fetch(`${DATA_BASE}/hist/${region}.json`, { cache: 'no-cache' });
      if (res.ok) return (await res.json()) as History;
    } catch {}
    return null;
  }
  return makeSampleHistory(region);
}

// 토스쇼핑 추천 상품. 아직 없거나 못 받으면 null (화면에서 그 칸을 숨겨요)
export async function loadShop(): Promise<Shop | null> {
  if (!DATA_BASE) return null;
  try {
    const res = await fetch(`${DATA_BASE}/shop.json`, { cache: 'no-cache' });
    if (!res.ok) return null;
    const s = (await res.json()) as Shop;
    return s?.groups ? s : null;
  } catch {
    return null;
  }
}
