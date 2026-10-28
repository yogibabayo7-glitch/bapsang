// 토스쇼핑 상품 카드 (쉐어링크). 클릭에 보상을 주면 안 돼요 — 순수한 상품 연결만.
import { DOMESTIC_RE, IMPORTED_RE } from './data/catalog';
import { SHOP_IMPORT_RE, SHOP_RULES } from './data/shopRules';
import type { Shop, ShopItem } from './data/types';
import { openLink, track } from './platform';

// 이 품목 상품이 맞나? — 그 품목 토스쇼핑 카테고리 상품이면서 이름 규칙(must/not/kr)을 통과해야 해요
export function matchesItem(id: string, p: ShopItem): boolean {
  const r = SHOP_RULES[id];
  if (!r) return false;
  if (p.cat && !r.cats.some((c) => c.split(' > ').pop() === p.cat)) return false;
  return (
    new RegExp(r.must, 'i').test(p.name) &&
    !(r.not && new RegExp(r.not, 'i').test(p.name)) &&
    !(r.kr && new RegExp(SHOP_IMPORT_RE, 'i').test(p.name))
  );
}

// 품목 상세의 상품: 그 품목 상품만 (상추면 상추, 콩이면 콩). 맞는 상품이 없으면 빈 목록 → 칸을 숨겨요.
// 10/28 전에는 못 찾으면 같은 분류(채소·과일…)의 아무 상품이나 보여줘서 엉뚱한 상품이 나왔어요.
export function productsFor(shop: Shop | null, id: string, limit = 8): ShopItem[] {
  if (!shop) return [];
  const seen = new Set<string>();
  const pool = [...(shop.items?.[id] ?? []), ...Object.values(shop.groups).flat()];
  return pool.filter((p) => matchesItem(id, p) && !seen.has(p.id) && seen.add(p.id)).slice(0, limit);
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
  const fresh = showFresh ? shop?.pages?.fresh : undefined;
  if (!shop || (!items.length && !fresh)) return null;
  const open = (p: ShopItem) => {
    track('shop_clicked', { from, item: p.id });
    void openLink(p.url);
  };
  return (
    <div className="shop">
      {items.length > 0 && <h3>{title}</h3>}
      {items.length > 0 && (
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
      )}
      {fresh && (
        <button
          className="btn ghost full shopMore"
          onClick={() => {
            track('shop_clicked', { from, item: 'fresh' });
            void openLink(fresh);
          }}
        >
          🥬 토스쇼핑 신선식품 더 보기
        </button>
      )}
      <p className="disclosure">ⓘ {shop.disclosure || '토스쇼핑 쉐어링크 활동으로, 구매 시 일정액의 수수료를 받을 수 있어요'}</p>
    </div>
  );
}
