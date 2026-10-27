// 김장 물가 계산기: 배추 N포기 김장에 드는 재료값을 오늘 시세로 계산해요
import { useEffect, useState } from 'react';
import { Q, type PriceBook, type Shop } from './data/types';
import { getItem, setItem, shareText, track } from './platform';
import { CabbageSheet, useCabbage } from './Cabbage';
import { ShopStrip, domesticOnly } from './Shop';

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
const KEY = 'jb.kimjang';

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
};

function calc(book: PriceBook, region: string, heads: number) {
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
    const k = r.per * scale;
    lines.push({
      id: r.id,
      name: r.name,
      label: amt(r.amount * scale, r.unit),
      now: q[Q.now]! * k,
      w1: q[Q.w1] != null ? q[Q.w1]! * k : null,
      y1: q[Q.y1] != null ? q[Q.y1]! * k : null,
      national: national && region !== 'all',
      kr: meta.get(r.id)?.origin === 'kr',
    });
  }
  const total = lines.reduce((a, l) => a + l.now, 0);
  // 비교는 값이 있는 재료끼리만 (재료값의 80% 이상이 있어야 보여줘요)
  const cmp = (key: 'w1' | 'y1') => {
    const has = lines.filter((l) => l[key] != null);
    const cover = has.reduce((a, l) => a + l.now, 0) / (total || 1);
    if (cover < 0.8) return null;
    const now = has.reduce((a, l) => a + l.now, 0);
    const then = has.reduce((a, l) => a + l[key]!, 0);
    return { diff: now - then, pct: ((now - then) / then) * 100 };
  };
  return { lines, total, week: cmp('w1'), year: cmp('y1'), missing: RECIPE.length - lines.length };
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
  const [open, setOpen] = useState(false);
  const [cabbageOpen, setCabbageOpen] = useState(false);
  const cabbage = useCabbage(shop);
  useEffect(() => {
    getItem(KEY).then((v) => {
      const n = Number(v);
      if (HEADS.includes(n)) setHeads(n);
    });
  }, []);
  const pick = (n: number) => {
    setHeads(n);
    void setItem(KEY, String(n));
  };
  const r = calc(book, region, heads);
  if (r.lines.length < 6) return null;
  const kimjangShop = domesticOnly(shop?.groups.kimjang ?? []);
  const allKr = r.lines.length > 0 && r.lines.every((l) => l.kr);

  return (
    <section className="card kimjang">
      <div className="listHead">
        <h2>🥬 올해 김장 비용</h2>
        <button
          className="link"
          onClick={() => {
            setOpen(true);
            track('kimjang_opened', { heads });
          }}
        >
          재료별 보기
        </button>
      </div>
      <div className="cats kjHeads">
        {HEADS.map((n) => (
          <button key={n} className={heads === n ? 'on' : ''} onClick={() => pick(n)}>
            {n}포기
          </button>
        ))}
      </div>
      <div className="kjTotal">{won(r.total)}</div>
      <Diff c={r.year} label="작년 이맘때" />
      <Diff c={r.week} label="지난주" />
      <p className="kjNote">
        {regionName} {allKr ? '국산 ' : ''}시세로 계산한 재료 {r.lines.length}가지 값이에요{heads === 20 ? ' (4인 가족 기준)' : ''}.
      </p>
      <ShopStrip shop={shop} items={kimjangShop.slice(0, 10)} title="🛒 김장 재료 토스쇼핑에서 보기" from="kimjang" />
      {shop && cabbage.all.length >= 2 && (
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
              {regionName} 평균 소매가{allKr ? '(국산 품종)' : ''}로 계산했어요. 집집마다 레시피가 달라서 참고용이에요.
            </p>
            <ul className="list kjList">
              {r.lines.map((l) => (
                <li key={l.id} className="item">
                  <span className="nm">
                    <b>{l.name}</b>
                    <small>
                      {l.label}
                      {l.kr ? ' · 국산' : ''}
                      {l.national ? ' · 전국 가격' : ''}
                    </small>
                  </span>
                  <span className="pr">
                    <b>{won(l.now)}</b>
                    {l.y1 != null && (
                      <small className={l.now > l.y1 ? 'up' : l.now < l.y1 ? 'down' : ''}>
                        작년 {won(l.y1)}
                      </small>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <div className="bTotal" style={{ marginTop: 12 }}>
              <span>합계</span>
              <b>{won(r.total)}</b>
            </div>
            {r.missing > 0 && <p className="hint">오늘 조사되지 않은 재료 {r.missing}가지는 빠져 있어요.</p>}
            <button
              className="btn full"
              style={{ marginTop: 12 }}
              onClick={async () => {
                const y = r.year;
                await shareText(
                  `🥬 올해 우리집 김장 (배추 ${heads}포기)\n재료값 약 ${won(r.total)}` +
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
