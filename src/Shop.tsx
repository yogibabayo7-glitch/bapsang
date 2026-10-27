// 토스쇼핑 상품 카드 (쉐어링크). 클릭에 보상을 주면 안 돼요 — 순수한 상품 연결만.
import { DOMESTIC_RE, IMPORTED_RE } from './data/catalog';
import type { Shop, ShopItem } from './data/types';
import { openLink, track } from './platform';

const CAT_GROUP: Record<string, string> = {
  grain: 'grain',
  veg: 'veg',
  mush: 'veg',
  fruit: 'fruit',
  meat: 'meat',
  fish: 'fish',
  spice: 'spice',
};

// 품목 이름이 들어간 상품 찾기. 한 글자 이름(무, 배, 굴…)은 다른 글자에 붙어 있으면 빼요.
export function productsFor(shop: Shop | null, name: string, cat: string, limit = 8): ShopItem[] {
  if (!shop) return [];
  const all = Object.values(shop.groups).flat();
  const key = name.replace(/\(.*\)/, '').replace(/^(한우|수입|돼지|국산)\s*/, '').trim();
  const re =
    key.length <= 1 ? new RegExp(`(^|[^가-힣])${key}([^가-힣]|$)`) : new RegExp(key.split(/\s+/).join('.*'));
  const seen = new Set<string>();
  const hit = all.filter((p) => re.test(p.name) && !seen.has(p.id) && seen.add(p.id));
  if (hit.length) return hit.slice(0, limit);
  return (shop.groups[CAT_GROUP[cat] ?? 'veg'] ?? []).slice(0, limit);
}

// 김장 재료: 수입·중국산은 빼고, '국산/국내산'이나 산지가 적힌 상품을 앞으로
const KR_HINT = new RegExp(`${DOMESTIC_RE.source}|해남|괴산|강원|고랭지|평창|태백|진도|신안|영암`);
export function domesticOnly(items: ShopItem[]): ShopItem[] {
  const ok = items.filter((p) => !IMPORTED_RE.test(p.name));
  return [...ok.filter((p) => KR_HINT.test(p.name)), ...ok.filter((p) => !KR_HINT.test(p.name))];
}

// 배추 종류별 보기: 상품 이름으로 산지·종류 나누기 (한 상품이 여러 칸에 들 수 있어요)
export const CABBAGE_KINDS: { id: string; label: string; re: RegExp }[] = [
  { id: 'haenam', label: '해남', re: /해남/ },
  { id: 'goesan', label: '괴산', re: /괴산/ },
  { id: 'gangwon', label: '강원 고랭지', re: /강원|고랭지|평창|태백|정선|홍천|강릉|횡성|대관령|안반데기/ },
  { id: 'salted', label: '절임배추', re: /절임/ },
  { id: 'fresh', label: '생배추', re: /^(?!.*절임).*배추/ },
];

export function cabbageItems(shop: Shop | null): ShopItem[] {
  if (!shop) return [];
  const seen = new Set<string>();
  const pool = [...(shop.groups.cabbage ?? []), ...(shop.groups.kimjang ?? []), ...(shop.groups.veg ?? [])];
  const list = pool.filter(
    (p) =>
      /배추/.test(p.name) &&
      !/양배추|김치/.test(p.name) &&
      !seen.has(p.id) &&
      !seen.has(p.name) &&
      seen.add(p.id).add(p.name),
  );
  return domesticOnly(list);
}

export function ShopStrip({
  shop,
  items,
  title,
  from,
  showFresh = false,
}: {
  shop: Shop | null;
  items: ShopItem[];
  title: string;
  from: string;
  showFresh?: boolean;
}) {
  if (!shop || !items.length) return null;
  const open = (p: ShopItem) => {
    track('shop_clicked', { from, item: p.id });
    void openLink(p.url);
  };
  return (
    <div className="shop">
      <h3>{title}</h3>
      <div className="shopRow">
        {items.map((p) => (
          <button key={p.id} className="shopItem" onClick={() => open(p)}>
            <span className="thumb">
              <img src={p.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" />
            </span>
            <span className="pn">{p.name}</span>
            <span className="go">바로 보기 ›</span>
          </button>
        ))}
      </div>
      {showFresh && shop.pages?.fresh && (
        <button
          className="btn ghost full shopMore"
          onClick={() => {
            track('shop_clicked', { from, item: 'fresh' });
            void openLink(shop.pages!.fresh!);
          }}
        >
          🥬 토스쇼핑 신선식품 더 보기
        </button>
      )}
      <p className="disclosure">ⓘ {shop.disclosure || '토스쇼핑 쉐어링크 활동으로, 구매 시 일정액의 수수료를 받을 수 있어요'}</p>
    </div>
  );
}
