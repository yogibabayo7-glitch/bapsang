// 반찬 모아 보기: 토스쇼핑 반찬 카테고리(볶음·조림·무침·장아찌·반찬세트·김치·젓갈·게장) 인기 상품을 종류별로 골라 봐요.
// 상품은 사장님 PC가 매일 받아 둔 shop.json의 banchan에서 와요. 없으면 카드가 안 보여요.
import { useState } from 'react';
import type { Shop, ShopItem } from './data/types';
import { openLink, track } from './platform';

const EMOJI: Record<string, string> = {
  볶음: '🍳',
  조림: '🥘',
  '무침·나물': '🥗',
  '장아찌·절임': '🫙',
  반찬세트: '🍱',
  김치: '🌶️',
  젓갈: '🦐',
  '게장·장': '🦀',
};

export function banchanOf(shop: Shop | null) {
  const b = shop?.banchan;
  if (!b || !b.items?.length) return null;
  const kinds = (b.kinds ?? [])
    .map((k) => ({ label: k, items: b.items.filter((p) => p.cat === k) }))
    .filter((k) => k.items.length > 0);
  // 맛보기: 종류마다 1위부터 하나씩 번갈아
  const mix: ShopItem[] = [];
  for (let i = 0; mix.length < 12 && kinds.some((k) => k.items.length > i); i++)
    for (const k of kinds) if (k.items[i] && mix.length < 12) mix.push(k.items[i]);
  return { all: b.items, kinds, mix };
}

function Item({ p, from, kind }: { p: ShopItem; from: string; kind?: string }) {
  return (
    <button
      className="shopItem"
      onClick={() => {
        track('shop_clicked', { from, item: p.id, kind: kind ?? p.cat ?? '' });
        void openLink(p.url);
      }}
    >
      <span className="thumb">
        <img src={p.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" />
      </span>
      <span className="pn">{p.name}</span>
      <span className="go">바로 보기 ›</span>
    </button>
  );
}

export function BanchanCard({ shop }: { shop: Shop | null }) {
  const [open, setOpen] = useState<string | null>(null);
  const b = banchanOf(shop);
  if (!shop || !b) return null;
  const show = (k: string) => {
    setOpen(k);
    track('banchan_opened', { kind: k });
  };
  return (
    <section className="card bcCard">
      <h2>🍱 오늘 반찬 고르기</h2>
      <p className="hint">토스쇼핑 인기 반찬을 종류별로 모았어요.</p>
      <div className="bcKinds">
        {b.kinds.map((k) => (
          <button key={k.label} onClick={() => show(k.label)}>
            <span>{EMOJI[k.label] ?? '🍽️'}</span>
            {k.label}
          </button>
        ))}
      </div>
      <div className="shop">
        <div className="shopRow">
          {b.mix.map((p) => (
            <Item key={p.id} p={p} from="banchan" />
          ))}
        </div>
        <button className="btn ghost full shopMore" onClick={() => show('all')}>
          반찬 {b.all.length}가지 모두 보기
        </button>
        <p className="disclosure">ⓘ {shop.disclosure || '토스쇼핑 쉐어링크 활동으로, 구매 시 일정액의 수수료를 받을 수 있어요'}</p>
      </div>
      {open && <BanchanSheet shop={shop} start={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function BanchanSheet({ shop, start, onClose }: { shop: Shop; start: string; onClose: () => void }) {
  const b = banchanOf(shop)!;
  const [sel, setSel] = useState(start);
  const items = sel === 'all' ? b.all : (b.kinds.find((k) => k.label === sel)?.items ?? b.all);
  const pick = (k: string) => {
    setSel(k);
    track('banchan_kind_selected', { kind: k });
  };
  return (
    <div className="sheetBg" onClick={onClose}>
      <div className="sheet cabbage" onClick={(e) => e.stopPropagation()}>
        <h2>🍱 반찬 종류별로 보기</h2>
        <p className="hint" style={{ marginBottom: 10 }}>
          토스쇼핑 반찬 카테고리의 인기 상품이에요.
        </p>
        <div className="cats cbKinds">
          <button className={sel === 'all' ? 'on' : ''} onClick={() => pick('all')}>
            전체 {b.all.length}
          </button>
          {b.kinds.map((k) => (
            <button key={k.label} className={sel === k.label ? 'on' : ''} onClick={() => pick(k.label)}>
              {k.label} {k.items.length}
            </button>
          ))}
        </div>
        <div className="cbGrid">
          {items.map((p) => (
            <Item key={p.id} p={p} from="banchan" kind={sel} />
          ))}
        </div>
        <p className="disclosure">ⓘ {shop.disclosure || '토스쇼핑 쉐어링크 활동으로, 구매 시 일정액의 수수료를 받을 수 있어요'}</p>
        <button className="btn ghost full" style={{ marginTop: 8 }} onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
