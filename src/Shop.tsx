// 토스쇼핑 상품 카드 (쉐어링크). 클릭에 보상을 주면 안 돼요 — 순수한 상품 연결만.
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
