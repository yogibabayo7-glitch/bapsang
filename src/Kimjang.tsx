// 김장 물가 계산기: 배추 N포기 김장에 드는 재료값을 오늘 시세로 계산해요
import { useEffect, useState } from 'react';
import { Q, type PriceBook, type Shop, type ShopItem } from './data/types';
import { getItem, openLink, setItem, shareText, track } from './platform';
import { CabbageSheet, useCabbage } from './Cabbage';
import { ShopStrip, domesticOnly, productsFor } from './Shop';
import { useBackLayer } from './back';

// 김장 재료 → shop.json 김장 묶음(kimjang)의 카테고리 이름. 김장 묶음 상품을 먼저, 없으면 그 품목 상품
const KJ_CAT: Record<string, string> = {
  cabbage: '절임배추',
  radish: '무',
  'pepper-powder': '고추가루',
  garlic: '깐마늘',
  ginger: '생강',
  scallion: '쪽파',
  'green-onion': '대파',
  'water-parsley': '미나리',
  'salted-shrimp': '새우젓',
  'fish-sauce': '멸치액젓',
  'sea-salt': '천일염',
};
const CART_KEY = 'jb.kimjang.cart'; // 장보기: {d: 날짜, opened: [담으러 간 재료id]}

function optionsFor(shop: Shop | null, id: string): ShopItem[] {
  if (!shop) return [];
  const cat = KJ_CAT[id];
  const kj = cat ? (shop.groups.kimjang ?? []).filter((p) => p.cat === cat) : [];
  const seen = new Set<string>();
  return domesticOnly([...kj, ...productsFor(shop, id, 6)])
    .filter((p) => !seen.has(p.id) && !!seen.add(p.id))
    .slice(0, 4);
}

// 고른 재료 한 번에 장보기 — 토스쇼핑 링크는 상품 하나씩만 열 수 있어서(장바구니 자동 담기 기능 없음),
// 계산기 줄마다 가격 옆 '담기' 버튼으로 그 재료 상품을 열어요. 연 재료는 ✓ 표시(오늘 하루 기억).
function useKimjangCart(shop: Shop | null) {
  const today = new Date().toISOString().slice(0, 10);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  useEffect(() => {
    getItem(CART_KEY).then((v) => {
      try {
        const o = v ? JSON.parse(v) : null;
        if (o?.d === today) setOpened(new Set(o.opened ?? []));
      } catch {}
    });
  }, [today]);
  const productOf = (id: string): ShopItem | undefined => optionsFor(shop, id)[0];
  const go = (id: string) => {
    const p = productOf(id);
    if (!p) return;
    const op = new Set(opened).add(id);
    setOpened(op);
    void setItem(CART_KEY, JSON.stringify({ d: today, opened: [...op] }));
    track('shop_clicked', { from: 'kimjang_cart', item: p.id, ingredient: id });
    void openLink(p.url);
  };
  return { opened, productOf, go };
}

// 계산기 아래 요약: 진행 막대 + 다음 재료 담기 + 대가성 문구
function KimjangCartSummary({
  shop,
  lines,
  cart,
}: {
  shop: Shop | null;
  lines: Line[];
  cart: ReturnType<typeof useKimjangCart>;
}) {
  if (!shop) return null;
  const rows = lines.filter((l) => !l.skipped && cart.productOf(l.id));
  if (rows.length < 2) return null;
  const done = rows.filter((l) => cart.opened.has(l.id)).length;
  const left = rows.find((l) => !cart.opened.has(l.id));
  return (
    <div className="kjCart">
      <p className="hint">
        🛒 재료마다 가격 옆 <b>담기</b>를 눌러 토스쇼핑 장바구니에 담고, 마지막에 장바구니에서 한 번에 결제하세요.
      </p>
      <div className="kjCartBar">
        <span style={{ width: `${(done / rows.length) * 100}%` }} />
      </div>
      <p className="kjCartCount">
        {done === rows.length ? '모든 재료를 담으러 다녀왔어요 👍' : `${rows.length}가지 중 ${done}가지 담으러 다녀왔어요`}
      </p>
      {left && (
        <button className="btn full" style={{ marginTop: 4 }} onClick={() => cart.go(left.id)}>
          다음 재료 담으러 가기: {left.name} ›
        </button>
      )}
      <p className="disclosure">
        ⓘ {shop.disclosure || '토스쇼핑 쉐어링크 활동으로, 구매 시 일정액의 수수료를 받을 수 있어요'}
      </p>
    </div>
  );
}

// 배추 20포기(4인 가족) 기준 재료. per = KAMIS 단위로 몇 개 분량인지
const RECIPE: { id: string; name: string; amount: number; unit: string; per: number }[] = [
  { id: 'cabbage', name: '배추', amount: 20, unit: '포기', per: 20 },
  { id: 'radish', name: '무', amount: 10, unit: '개', per: 10 },
  { id: 'pepper-powder', name: '고춧가루', amount: 1.86, unit: 'kg', per: 1.86 },
  { id: 'garlic', name: '깐마늘', amount: 1.2, unit: 'kg', per: 1.2 },
  { id: 'ginger', name: '생강', amount: 120, unit: 'g', per: 0.12 },
  { id: 'scallion', name: '쪽파', amount: 2.4, unit: 'kg', per: 2.4 },
  { id: 'green-onion', name: '대파', amount: 1, unit: 'kg', per: 1 },
  { id: 'water-parsley', name: '미나리', amount: 1, unit: 'kg', per: 10 },
  { id: 'oyster', name: '굴', amount: 2, unit: 'kg', per: 2 },
  { id: 'salted-shrimp', name: '새우젓', amount: 1, unit: 'kg', per: 1 },
  { id: 'fish-sauce', name: '멸치액젓', amount: 1.2, unit: 'kg', per: 1.2 },
  { id: 'sea-salt', name: '천일염', amount: 8, unit: 'kg', per: 1.6 },
];
const HEADS = [10, 20, 30, 40];
const MIN_HEADS = 1;
const MAX_HEADS = 200;
const KEY = 'jb.kimjang';
const SKIP_KEY = 'jb.kimjang.skip'; // 집에 있어서 뺀 재료 id (쉼표로 구분)
const COUNT_UNITS = ['포기', '개']; // 낱개로 사는 재료는 올림해서 계산
const ADJ_KEY = 'jb.kimjang.adj'; // 재료별로 늘리거나 줄인 비율 {id: 배율}
// ▲▼ 한 번에 바뀌는 양 (단위별)
const stepOf = (unit: string) => (COUNT_UNITS.includes(unit) ? 1 : unit === 'g' ? 10 : 0.1);
const clampHeads = (n: number) => Math.min(MAX_HEADS, Math.max(MIN_HEADS, Math.round(n)));

const won = (n: number) => `${(Math.round(n / 10) * 10).toLocaleString('ko-KR')}원`;
const amt = (a: number, unit: string) => {
  const v = Math.round(a * 100) / 100;
  if (unit === 'g' && v >= 1000) return `${Math.round(v / 100) / 10}kg`;
  return `${v.toLocaleString('ko-KR')}${unit}`;
};

export function isKimjangSeason(d = new Date()) {
  const m = d.getMonth() + 1;
  return m === 11 || (m === 10 && d.getDate() >= 15) || (m === 12 && d.getDate() <= 20);
}

type Line = {
  id: string;
  name: string;
  label: string;
  now: number;
  w1: number | null;
  y1: number | null;
  national: boolean;
  kr: boolean;
  skipped: boolean;
  unit: string;
  need: number; // 지금 필요한 양 (레시피 단위)
  base: number; // 조정 전 기본 양
  adjusted: boolean;
};

function calc(book: PriceBook, region: string, heads: number, skip: Set<string>, adj: Record<string, number>) {
  const scale = heads / 20;
  const lines: Line[] = [];
  const meta = new Map(book.items.map((i) => [i.id, i]));
  for (const r of RECIPE) {
    let q = book.q[region]?.[r.id];
    let national = false;
    if (!q?.[Q.now]) {
      q = book.q.all?.[r.id];
      national = true;
    }
    if (!q?.[Q.now]) continue;
    // 배추·무처럼 낱개로 사는 재료는 올림 (23포기면 무 11.5개 → 12개)
    const count = COUNT_UNITS.includes(r.unit);
    const base = count ? Math.max(1, Math.ceil(r.amount * scale - 1e-9)) : r.amount * scale;
    const f = r.id === 'cabbage' ? 1 : (adj[r.id] ?? 1);
    const raw = base * f;
    // 손대지 않은 재료는 레시피 그대로, ▲▼로 바꾼 재료만 단위에 맞춰 반올림
    const need =
      f === 1 ? base : count ? Math.max(0, Math.round(raw)) : Math.max(0, Math.round(raw / stepOf(r.unit)) * stepOf(r.unit));
    const k = (r.per / r.amount) * need;
    lines.push({
      id: r.id,
      name: r.name,
      label: amt(need, r.unit),
      now: q[Q.now]! * k,
      w1: q[Q.w1] != null ? q[Q.w1]! * k : null,
      y1: q[Q.y1] != null ? q[Q.y1]! * k : null,
      national: national && region !== 'all',
      kr: meta.get(r.id)?.origin === 'kr',
      skipped: skip.has(r.id) || need === 0,
      unit: r.unit,
      need,
      base,
      adjusted: f !== 1,
    });
  }
  const used = lines.filter((l) => !l.skipped);
  const total = used.reduce((a, l) => a + l.now, 0);
  // 비교는 값이 있는 재료끼리만 (재료값의 80% 이상이 있어야 보여줘요)
  const cmp = (key: 'w1' | 'y1') => {
    const has = used.filter((l) => l[key] != null);
    const cover = has.reduce((a, l) => a + l.now, 0) / (total || 1);
    if (cover < 0.8) return null;
    const now = has.reduce((a, l) => a + l.now, 0);
    const then = has.reduce((a, l) => a + l[key]!, 0);
    return { diff: now - then, pct: ((now - then) / then) * 100 };
  };
  return {
    lines,
    total,
    perHead: total / heads,
    skipped: lines.length - used.length,
    week: cmp('w1'),
    year: cmp('y1'),
    missing: RECIPE.length - lines.length,
  };
}

function Diff({ c, label }: { c: { diff: number; pct: number } | null; label: string }) {
  if (!c) return null;
  const up = c.pct >= 0.5;
  const down = c.pct <= -0.5;
  return (
    <p className={`kjDiff ${up ? 'up' : down ? 'down' : ''}`}>
      {label}보다{' '}
      {up || down ? (
        <b>
          {won(Math.abs(c.diff))} {up ? '더 들어요' : '덜 들어요'} ({up ? '▲' : '▼'}
          {Math.abs(c.pct).toFixed(1)}%)
        </b>
      ) : (
        <b>비슷해요</b>
      )}
    </p>
  );
}

export function KimjangCard({
  book,
  region,
  regionName,
  shop,
}: {
  book: PriceBook;
  region: string;
  regionName: string;
  shop: Shop | null;
}) {
  const [heads, setHeads] = useState(20);
  const [draft, setDraft] = useState('20'); // 직접 입력 중인 글자
  const [skip, setSkip] = useState<Set<string>>(new Set());
  const [adj, setAdj] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [cabbageOpen, setCabbageOpen] = useState(false);
  useBackLayer(open, () => setOpen(false));
  useBackLayer(cabbageOpen, () => setCabbageOpen(false));
  const cabbage = useCabbage(shop);
  const cart = useKimjangCart(shop);
  useEffect(() => {
    getItem(KEY).then((v) => {
      const n = Number(v);
      if (Number.isFinite(n) && n >= MIN_HEADS && n <= MAX_HEADS) {
        setHeads(Math.round(n));
        setDraft(String(Math.round(n)));
      }
    });
    getItem(ADJ_KEY).then((v) => {
      try {
        const o = v ? (JSON.parse(v) as Record<string, number>) : {};
        const ok: Record<string, number> = {};
        for (const [k, n] of Object.entries(o)) if (RECIPE.some((r) => r.id === k) && n > 0 && n < 20) ok[k] = n;
        setAdj(ok);
      } catch {}
    });
    getItem(SKIP_KEY).then((v) => {
      if (v) setSkip(new Set(v.split(',').filter((id) => RECIPE.some((r) => r.id === id))));
    });
  }, []);
  const pick = (n: number, how: 'preset' | 'step' | 'input') => {
    const v = clampHeads(n);
    setHeads(v);
    setDraft(String(v));
    void setItem(KEY, String(v));
    track('kimjang_heads_changed', { heads: v, how });
  };
  const toggle = (id: string) => {
    const next = new Set(skip);
    const off = !next.has(id);
    if (off) next.add(id);
    else next.delete(id);
    setSkip(next);
    void setItem(SKIP_KEY, [...next].join(','));
    track('kimjang_item_toggled', { item: id, included: off ? 0 : 1 });
  };
  const saveAdj = (next: Record<string, number>) => {
    setAdj(next);
    void setItem(ADJ_KEY, JSON.stringify(next));
  };
  // 재료 양 ▲▼: 배추는 포기 수를, 나머지는 그 재료 양만 바꿔요
  const nudge = (l: Line, dir: 1 | -1) => {
    if (l.id === 'cabbage') return pick(heads + dir, 'step');
    const st = stepOf(l.unit);
    const nextNeed = Math.max(0, Math.round((l.need + dir * st) / st) * st);
    const next = { ...adj };
    const f = l.base > 0 ? nextNeed / l.base : 1;
    if (Math.abs(f - 1) < 1e-6) delete next[l.id];
    else next[l.id] = f;
    saveAdj(next);
    track('kimjang_amount_changed', { item: l.id, dir });
  };
  const r = calc(book, region, heads, skip, adj);
  if (r.lines.length < 6) return null;
  // 집에 있다고 뺀 재료의 상품은 안 보여줘요
  const skippedNames = r.lines.filter((l) => l.skipped).map((l) => l.name.replace(/^깐/, ''));
  const kimjangShop = domesticOnly(shop?.groups.kimjang ?? []).filter(
    (p) => !skippedNames.some((n) => p.name.includes(n)),
  );
  const allKr = r.lines.length > 0 && r.lines.every((l) => l.kr);

  return (
    <section className="card kimjang">
      <div className="listHead">
        <h2>🥬 올해 김장 비용</h2>
      </div>
      <div className="kjHeadRow">
        <span>배추 몇 포기?</span>
        <div className="stepper">
          <button aria-label="5포기 줄이기" onClick={() => pick(heads - 5, 'step')}>
            −
          </button>
          <input
            className="kjInput"
            type="number"
            inputMode="numeric"
            min={MIN_HEADS}
            max={MAX_HEADS}
            value={draft}
            aria-label="배추 포기 수"
            onChange={(e) => {
              setDraft(e.target.value);
              const n = Number(e.target.value);
              if (e.target.value !== '' && Number.isFinite(n) && n >= MIN_HEADS) setHeads(clampHeads(n));
            }}
            onBlur={() => pick(Number(draft) || heads, 'input')}
          />
          <button aria-label="5포기 늘리기" onClick={() => pick(heads + 5, 'step')}>
            +
          </button>
        </div>
      </div>
      <div className="cats kjHeads">
        {HEADS.map((n) => (
          <button key={n} className={heads === n ? 'on' : ''} onClick={() => pick(n, 'preset')}>
            {n}포기
          </button>
        ))}
      </div>
      <div className="kjTotal">{won(r.total)}</div>
      <div className="kjChips">
        <span>배추 1포기당 약 {won(r.perHead)}</span>
        {r.skipped > 0 && (
          <button onClick={() => setOpen(true)}>집에 있는 재료 {r.skipped}가지 뺐어요</button>
        )}
      </div>
      <Diff c={r.year} label="작년 이맘때" />
      <Diff c={r.week} label="지난주" />
      <p className="kjNote">
        {regionName} {allKr ? '국산 ' : ''}시세로 계산한 재료 {r.lines.length - r.skipped}가지 값이에요
        {heads === 20 ? ' (4인 가족 기준)' : ''}. 재료 양 조절·집에 있는 재료 빼기·담기는 아래 ‘재료 고르고 담기’에서 할 수 있어요.
      </p>
      {shop && (
        <button
          className="btn full kjCartOpen"
          onClick={() => {
            setOpen(true);
            track('kimjang_opened', { heads, from: 'cart_button' });
          }}
        >
          <svg className="kjCartIcon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 4h2.2l2.1 10.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9.5" cy="19.5" r="1.7" fill="currentColor" />
            <circle cx="17" cy="19.5" r="1.7" fill="currentColor" />
          </svg>
          재료 고르고 담기
        </button>
      )}
      <ShopStrip shop={shop} items={kimjangShop.slice(0, 10)} title="🛒 필요한 김장 재료 토스쇼핑에서 보기" from="kimjang" />
      {shop && cabbage.all.length >= 2 && !skip.has('cabbage') && (
        <button
          className="btn ghost full cbOpen"
          onClick={() => {
            setCabbageOpen(true);
            track('cabbage_opened', { kinds: cabbage.kinds.length });
          }}
        >
          🥬 배추 종류별로 골라 보기
          {cabbage.kinds.length > 0 && <small>{cabbage.kinds.map((k) => k.label).join(' · ')}</small>}
        </button>
      )}
      {cabbageOpen && shop && <CabbageSheet shop={shop} onClose={() => setCabbageOpen(false)} />}

      {open && (
        <div className="sheetBg" onClick={() => setOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>배추 {heads}포기 김장 재료</h2>
            <p className="hint" style={{ marginBottom: 8 }}>
              {regionName} 평균 소매가{allKr ? '(국산 품종)' : ''}로 계산했어요. 집에 있는 재료는 체크를 풀면
              합계에서 빠져요. 집집마다 레시피가 달라서 참고용이에요.
            </p>
            <ul className="list kjList">
              {r.lines.map((l) => (
                <li
                  key={l.id}
                  className={`item kjRow${l.skipped ? ' off' : ''}`}
                  role="checkbox"
                  aria-checked={!l.skipped}
                  tabIndex={0}
                  onClick={() => (l.need === 0 ? nudge(l, 1) : toggle(l.id))}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      toggle(l.id);
                    }
                  }}
                >
                  <span className="kjBox" aria-hidden="true" />
                  <span className="kjLeft">
                  <span className="nm">
                    <b>{l.name}</b>
                    <small>
                      {l.skipped && l.need > 0 ? '집에 있어요 · ' : ''}
                      {l.label}
                      {l.adjusted ? ' · 조정함' : ''}
                      {l.kr ? ' · 국산' : ''}
                      {l.national ? ' · 전국 가격' : ''}
                    </small>
                  </span>
                  <span className="kjAmt" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <button
                      aria-label={`${l.name} 늘리기`}
                      disabled={l.id === 'cabbage' && heads >= MAX_HEADS}
                      onClick={() => nudge(l, 1)}
                    >
                      ▲
                    </button>
                    <button
                      aria-label={`${l.name} 줄이기`}
                      disabled={l.id === 'cabbage' ? heads <= MIN_HEADS : l.need <= 0}
                      onClick={() => nudge(l, -1)}
                    >
                      ▼
                    </button>
                  </span>
                  </span>
                  <span className="pr">
                    <b>{won(l.now)}</b>
                    {l.y1 != null && !l.skipped && (
                      <small className={l.now > l.y1 ? 'up' : l.now < l.y1 ? 'down' : ''}>
                        작년 {won(l.y1)}
                      </small>
                    )}
                  </span>
                  {shop &&
                    (!l.skipped && cart.productOf(l.id) ? (
                      <button
                        className={`kjBuy${cart.opened.has(l.id) ? ' on' : ''}`}
                        aria-label={`${l.name} 토스쇼핑에서 담기`}
                        onClick={(e) => {
                          e.stopPropagation();
                          cart.go(l.id);
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {cart.opened.has(l.id) ? '✓ 담음' : '담기'}
                      </button>
                    ) : (
                      <span className="kjBuy empty" aria-hidden="true" />
                    ))}
                </li>
              ))}
            </ul>
            {Object.keys(adj).length > 0 && (
              <button
                className="link kjReset"
                onClick={() => {
                  saveAdj({});
                  track('kimjang_amount_reset', { items: Object.keys(adj).length });
                }}
              >
                재료 양 기본으로 되돌리기
              </button>
            )}
            <div className="bTotal" style={{ marginTop: 12 }}>
              <span>합계{r.skipped > 0 ? ` (${r.skipped}가지 뺌)` : ''}</span>
              <b>{won(r.total)}</b>
            </div>
            <p className="hint">배추 1포기당 약 {won(r.perHead)}</p>
            {r.missing > 0 && <p className="hint">오늘 조사되지 않은 재료 {r.missing}가지는 빠져 있어요.</p>}
            <KimjangCartSummary shop={shop} lines={r.lines} cart={cart} />
            <button
              className="btn full"
              style={{ marginTop: 12 }}
              onClick={async () => {
                const y = r.year;
                await shareText(
                  `🥬 올해 우리집 김장 (배추 ${heads}포기)\n재료값 약 ${won(r.total)} (1포기당 약 ${won(r.perHead)})` +
                    (r.skipped > 0 ? `\n집에 있는 재료 ${r.skipped}가지는 뺐어요` : '') +
                    (y ? `\n작년보다 ${won(Math.abs(y.diff))} ${y.diff >= 0 ? '더' : '덜'} 들어요` : '') +
                    `\n- 오늘밥상물가`,
                );
              }}
            >
              가족에게 공유하기
            </button>
            <button className="btn ghost full" style={{ marginTop: 8 }} onClick={() => setOpen(false)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
