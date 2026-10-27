// 배추 종류별 보기: 토스쇼핑 배추 상품을 산지·종류(해남, 괴산, 강원 고랭지, 절임배추, 생배추)로 골라 봐요.
// 쉐어링크 API에는 키워드 검색이 없어서, 매일 받아 둔 상품 목록(shop.json) 안에서 이름으로 나눠요.
import { useState } from 'react';
import type { Shop, ShopItem } from './data/types';
import { openLink, track } from './platform';
import { CABBAGE_KINDS, cabbageItems } from './Shop';

export function useCabbage(shop: Shop | null) {
  const all = cabbageItems(shop);
  const kinds = CABBAGE_KINDS.map((k) => ({ ...k, items: all.filter((p) => k.re.test(p.name)) })).filter(
    (k) => k.items.length > 0,
  );
  return { all, kinds };
}

export function CabbageSheet({ shop, onClose }: { shop: Shop; onClose: () => void }) {
  const { all, kinds } = useCabbage(shop);
  const [sel, setSel] = useState('all');
  const items: ShopItem[] = sel === 'all' ? all : (kinds.find((k) => k.id === sel)?.items ?? all);
  const pick = (id: string) => {
    setSel(id);
    track('cabbage_kind_selected', { kind: id });
  };
  const open = (p: ShopItem) => {
    track('shop_clicked', { from: 'cabbage', item: p.id, kind: sel });
    void openLink(p.url);
  };

  return (
    <div className="sheetBg" onClick={onClose}>
      <div className="sheet cabbage" onClick={(e) => e.stopPropagation()}>
        <h2>🥬 배추 종류별로 보기</h2>
        <p className="hint" style={{ marginBottom: 10 }}>
          토스쇼핑 배추 상품을 산지와 종류로 나눴어요. 수입·중국산은 빼고 보여줘요.
        </p>
        <div className="cats cbKinds">
          <button className={sel === 'all' ? 'on' : ''} onClick={() => pick('all')}>
            전체 {all.length}
          </button>
          {kinds.map((k) => (
            <button key={k.id} className={sel === k.id ? 'on' : ''} onClick={() => pick(k.id)}>
              {k.label} {k.items.length}
            </button>
          ))}
        </div>
        <div className="cbGrid">
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
        <p className="disclosure">ⓘ {shop.disclosure || '토스쇼핑 쉐어링크 활동으로, 구매 시 일정액의 수수료를 받을 수 있어요'}</p>
        <button className="btn ghost full" style={{ marginTop: 8 }} onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
