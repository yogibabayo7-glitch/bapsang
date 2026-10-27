import { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORY_LABEL, regionNote, type CategoryId, type Region } from './data/catalog';
import { loadHistory, loadPriceBook } from './data/source';
import { Q, type History, type Item, type PriceBook } from './data/types';
import { ICONS, ICON_OF } from './icons';
import { BANNER_AD_ID, attachBanner, getItem, setItem, shareText, track } from './platform';

type Compare = 'day' | 'week';
type Sort = 'basic' | 'down' | 'up';
type Filter = CategoryId | 'all' | 'season';
type Row = Item & { price: number; prev: number | null; diff: number; pct: number; inSeason: boolean };

const KEYS = { favs: 'jb.favs', region: 'jb.region', compare: 'jb.compare', qty: 'jb.qty' };
const COMPARE_LABEL: Record<Compare, string> = { day: '어제', week: '지난주' };
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'season', label: '🍂 제철' },
  ...(Object.entries(CATEGORY_LABEL) as [CategoryId, string][]).map(([id, label]) => ({ id, label })),
];

const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;
const pctText = (p: number) => `${Math.abs(p).toFixed(1)}%`;
const dir = (p: number) => (p >= 0.05 ? 'up' : p <= -0.05 ? 'down' : 'flat');
const arrow = (p: number) => ({ up: '▲', down: '▼', flat: '–' })[dir(p)];

// 받침에 맞는 조사 (계란이 / 감자가)
function josa(word: string, withBatchim: string, without: string) {
  const c = word.charCodeAt(word.length - 1);
  const has = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
  return word + (has ? withBatchim : without);
}

function dateLabel(day: string) {
  const d = new Date(day + 'T00:00:00');
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${'일월화수목금토'[d.getDay()]})`;
}

// 초성 검색 (ㄱㄹ → 계란)
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
function chosung(s: string) {
  return [...s]
    .map((ch) => {
      const c = ch.charCodeAt(0) - 0xac00;
      return c >= 0 && c <= 11171 ? CHO[Math.floor(c / 588)] : ch;
    })
    .join('');
}
function matches(name: string, query: string) {
  const q = query.replace(/\s/g, '');
  if (!q) return true;
  const n = name.replace(/\s/g, '');
  return n.includes(q) || ([...q].every((ch) => CHO.includes(ch)) && chosung(n).includes(q));
}

// 이모지가 실제 모습과 다른 품목은 직접 그린 그림으로 보여줘요
function ItemIcon({ item }: { item: Item }) {
  const key = ICON_OF[item.id];
  if (!key) return <>{item.emoji}</>;
  return (
    <svg
      viewBox="0 0 40 40"
      width="1.15em"
      height="1.15em"
      aria-hidden="true"
      style={{ verticalAlign: '-0.18em' }}
      dangerouslySetInnerHTML={{ __html: ICONS[key] }}
    />
  );
}

function Change({ pct, diff }: { pct: number | null; diff?: number }) {
  if (pct === null) return <span className="chg flat">–</span>;
  const d = dir(pct);
  return (
    <span className={`chg ${d}`}>
      {arrow(pct)} {d === 'flat' ? '변동 없음' : pctText(pct)}
      {diff !== undefined && d !== 'flat' && <em>{won(Math.abs(diff))}</em>}
    </span>
  );
}

export default function App() {
  const [book, setBook] = useState<PriceBook | null>(null);
  const [favs, setFavs] = useState<string[]>([]);
  const [region, setRegion] = useState('all');
  const [compare, setCompare] = useState<Compare>('day');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('basic');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<string | null>(null);
  const [regionOpen, setRegionOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [qty, setQty] = useState<Record<string, number>>({});
  const [basketOpen, setBasketOpen] = useState(false);
  const month = new Date().getMonth() + 1;

  useEffect(() => {
    (async () => {
      const [b, f, r, c, qn] = await Promise.all([
        loadPriceBook(),
        getItem(KEYS.favs),
        getItem(KEYS.region),
        getItem(KEYS.compare),
        getItem(KEYS.qty),
      ]);
      try {
        if (f) setFavs(JSON.parse(f));
      } catch {}
      try {
        if (qn) setQty(JSON.parse(qn));
      } catch {}
      if (r && b.regions.some((x) => x.id === r)) setRegion(r);
      if (c === 'day' || c === 'week') setCompare(c);
      setBook(b);
      track('price_viewed', { region: r || 'all' });
    })();
  }, []);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 1600);
  };

  const rows: Row[] = useMemo(() => {
    if (!book) return [];
    const qs = book.q[region] ?? {};
    return book.items
      .filter((it) => qs[it.id]?.[Q.now])
      .map((it) => {
        const q = qs[it.id];
        const price = q[Q.now]!;
        const prev = q[compare === 'day' ? Q.d1 : Q.w1];
        const diff = prev ? price - prev : 0;
        return {
          ...it,
          price,
          prev,
          diff,
          pct: prev ? (diff / prev) * 100 : 0,
          inSeason: !!it.season?.includes(month),
        };
      });
  }, [book, region, compare, month]);

  if (!book)
    return (
      <div className="screen center">
        <div className="spinner" />
      </div>
    );

  const regionObj = book.regions.find((r) => r.id === region);
  const regionName = regionObj?.name ?? '전국';
  const parentName = regionObj?.parent ? book.regions.find((r) => r.id === regionObj.parent)?.name : '';
  const regionLabel = parentName ? `${parentName} ${regionName}` : regionName;
  const compared = rows.filter((r) => r.prev);
  const ups = compared.filter((r) => dir(r.pct) === 'up');
  const downs = compared.filter((r) => dir(r.pct) === 'down');
  const bestBuys = [...downs].sort((a, b) => a.pct - b.pct).slice(0, 3);
  const biggestUp = [...ups].sort((a, b) => b.pct - a.pct)[0];
  const favRows = favs.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as Row[];
  // 우리집 장바구니: 고정한 품목 × 수량
  const qtyOf = (id: string) => qty[id] ?? 1;
  const basket = favRows.filter((r) => qtyOf(r.id) > 0);
  const basketNow = basket.reduce((a, r) => a + r.price * qtyOf(r.id), 0);
  const basketPrev = basket.reduce((a, r) => a + (r.prev ?? r.price) * qtyOf(r.id), 0);
  const basketDiff = basketNow - basketPrev;
  const basketPct = basketPrev ? (basketDiff / basketPrev) * 100 : 0;
  const basketMover = [...basket]
    .filter((r) => r.prev)
    .sort((a, b) => Math.abs((b.price - b.prev!) * qtyOf(b.id)) - Math.abs((a.price - a.prev!) * qtyOf(a.id)))[0];
  const changeQty = (id: string, delta: number) => {
    const next = { ...qty, [id]: Math.max(0, Math.min(99, qtyOf(id) + delta)) };
    setQty(next);
    void setItem(KEYS.qty, JSON.stringify(next));
  };
  const seasonRows = rows.filter((r) => r.inSeason);
  const listRows = rows
    .filter((r) => (filter === 'all' ? true : filter === 'season' ? r.inSeason : r.cat === filter))
    .filter((r) => matches(r.name, query))
    .sort((a, b) => (sort === 'down' ? a.pct - b.pct : sort === 'up' ? b.pct - a.pct : 0));

  const headline = (() => {
    const parts: string[] = [];
    if (bestBuys[0])
      parts.push(`${josa(bestBuys[0].name, '이', '가')} ${COMPARE_LABEL[compare]}보다 ${pctText(bestBuys[0].pct)} 싸졌어요`);
    if (biggestUp) parts.push(`${josa(biggestUp.name, '은', '는')} ${pctText(biggestUp.pct)} 올랐어요`);
    if (!compared.length) return '비교할 이전 시세가 아직 없어요.';
    return parts.length ? parts.join('. ') + '.' : `${josa(COMPARE_LABEL[compare], '과', '와')} 비슷한 시세예요.`;
  })();

  const toggleFav = (id: string) => {
    const on = favs.includes(id);
    const next = on ? favs.filter((x) => x !== id) : [...favs, id];
    setFavs(next);
    void setItem(KEYS.favs, JSON.stringify(next));
    if (!on) track('favorite_added', { item: id });
    showToast(on ? '자주 찾는 품목에서 뺐어요' : '맨 위에 고정했어요');
  };

  const openDetail = (id: string) => {
    setDetail(id);
    track('item_detail_viewed', { item: id, region });
  };

  const changeCompare = (c: Compare) => {
    setCompare(c);
    void setItem(KEYS.compare, c);
  };

  const ItemRow = ({ r }: { r: Row }) => (
    <li className="item" onClick={() => openDetail(r.id)}>
      <span className="emo"><ItemIcon item={r} /></span>
      <span className="nm">
        <b>
          {r.name}
          {r.inSeason && <i className="season">제철</i>}
        </b>
        <small>{r.unit}</small>
      </span>
      <span className="pr">
        <b>{won(r.price)}</b>
        <Change pct={r.prev ? r.pct : null} />
      </span>
      <button
        className={`star ${favs.includes(r.id) ? 'on' : ''}`}
        aria-label={favs.includes(r.id) ? '자주 찾는 품목에서 빼기' : '자주 찾는 품목에 추가'}
        onClick={(e) => {
          e.stopPropagation();
          toggleFav(r.id);
        }}
      >
        {favs.includes(r.id) ? '★' : '☆'}
      </button>
    </li>
  );

  const d = detail ? rows.find((r) => r.id === detail) : null;
  const sidos = book.regions.filter((r) => r.kind !== 'city');
  const cityParents = sidos.filter((p) => book.regions.some((c) => c.parent === p.id));
  const pickRegion = (r: Region) => {
    setRegion(r.id);
    void setItem(KEYS.region, r.id);
    track('region_changed', { region: r.id });
    setRegionOpen(false);
  };

  return (
    <div className="screen">
      <div className="scroll">
        <header className="top">
          <div>
            <h1>오늘밥상물가</h1>
            <p className="date">
              {dateLabel(book.date)} 평균 시세
              {regionObj && regionNote(regionObj) && <span className="note">{regionNote(regionObj)}</span>}
            </p>
          </div>
          <button className="region" onClick={() => setRegionOpen(true)}>
            📍 {regionLabel} <span>▾</span>
          </button>
        </header>

        {book.isSample && <div className="sample">지금 보이는 가격은 화면 확인용 샘플이에요</div>}

        <div className="seg">
          {(['day', 'week'] as Compare[]).map((c) => (
            <button key={c} className={compare === c ? 'on' : ''} onClick={() => changeCompare(c)}>
              {COMPARE_LABEL[c]} 대비
            </button>
          ))}
        </div>

        <section className="card summary">
          <div className="counts">
            <div>
              <small>내린 품목</small>
              <b className="down">{downs.length}개</b>
            </div>
            <div>
              <small>오른 품목</small>
              <b className="up">{ups.length}개</b>
            </div>
            <div>
              <small>그대로</small>
              <b>{compared.length - ups.length - downs.length}개</b>
            </div>
          </div>
          <p className="headline">{headline}</p>
        </section>

        {bestBuys.length > 0 && (
          <section className="card">
            <h2>🛒 지금 사기 좋은 품목</h2>
            <div className="best">
              {bestBuys.map((r) => (
                <button key={r.id} className="bestItem" onClick={() => openDetail(r.id)}>
                  <span className="emo"><ItemIcon item={r} /></span>
                  <b>{r.name}</b>
                  <Change pct={r.pct} />
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="card basket">
          <div className="listHead">
            <h2>🧺 우리집 장바구니</h2>
            {favRows.length > 0 && (
              <button
                className="link"
                onClick={() => {
                  setBasketOpen(true);
                  track('basket_opened', { items: favRows.length });
                }}
              >
                수량 정하기
              </button>
            )}
          </div>
          {basket.length ? (
            <>
              <div className="bTotal">
                <b>{won(basketNow)}</b>
                <Change pct={basket.some((r) => r.prev) ? basketPct : null} diff={basketDiff} />
              </div>
              <p className="bSub">
                {basket.length}개 품목 · {COMPARE_LABEL[compare]}보다{' '}
                {dir(basketPct) === 'flat'
                  ? '비슷해요'
                  : `${won(Math.abs(basketDiff))} ${basketDiff > 0 ? '더 들어요' : '덜 들어요'}`}
              </p>
              {basketMover && dir(((basketMover.price - basketMover.prev!) / basketMover.prev!) * 100) !== 'flat' && (
                <p className="bTip">
                  {basketMover.price > basketMover.prev! ? '📈' : '📉'} {josa(basketMover.name, '이', '가')} 가장 크게{' '}
                  {basketMover.price > basketMover.prev! ? '올랐어요' : '내렸어요'} (
                  {won(Math.abs(basketMover.price - basketMover.prev!) * qtyOf(basketMover.id))})
                </p>
              )}
            </>
          ) : (
            <p className="hint">아래 품목 옆 ☆를 누르면 우리집 장바구니에 담겨요. 매일 장바구니 값이 얼마나 오르고 내렸는지 알려드려요.</p>
          )}
        </section>

        <section className="card">
          <h2>⭐ 자주 찾는 품목</h2>
          {favRows.length ? (
            <ul className="list">
              {favRows.map((r) => (
                <ItemRow key={r.id} r={r} />
              ))}
            </ul>
          ) : (
            <p className="hint">아래 품목 옆 ☆를 누르면 여기 맨 위에 고정돼요.</p>
          )}
        </section>

        {seasonRows.length > 0 && (
          <section className="card">
            <h2>🍂 {month}월 제철</h2>
            <div className="seasonRow">
              {seasonRows.map((r) => (
                <button key={r.id} onClick={() => openDetail(r.id)}>
                  <span><ItemIcon item={r} /></span>
                  {r.name}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="card">
          <div className="listHead">
            <h2>전체 시세 {rows.length}개</h2>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="정렬">
              <option value="basic">기본순</option>
              <option value="down">많이 내린 순</option>
              <option value="up">많이 오른 순</option>
            </select>
          </div>
          <div className="search">
            <span>🔍</span>
            <input
              value={query}
              placeholder="품목 찾기 (예: 계란, ㄱㄹ)"
              onChange={(e) => setQuery(e.target.value)}
              aria-label="품목 찾기"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="지우기">
                ✕
              </button>
            )}
          </div>
          <div className="cats">
            {FILTERS.map((c) => (
              <button key={c.id} className={filter === c.id ? 'on' : ''} onClick={() => setFilter(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          <ul className="list">
            {listRows.map((r) => (
              <ItemRow key={r.id} r={r} />
            ))}
            {!listRows.length && <li className="empty">찾는 품목이 없어요</li>}
          </ul>
        </section>

        <Banner />

        <button
          className="btn full"
          onClick={async () => {
            const lines = (favRows.length ? favRows : bestBuys.length ? bestBuys : rows.slice(0, 5)).map(
              (r) => `${r.emoji} ${r.name}(${r.unit}) ${won(r.price)} ${arrow(r.pct)}${pctText(r.pct)}`,
            );
            const ok = await shareText(
              `오늘밥상물가 · ${dateLabel(book.date)} ${regionName} 평균 시세\n${lines.join('\n')}` +
                (basket.length ? `\n🧺 우리집 장바구니 ${won(basketNow)} (${COMPARE_LABEL[compare]}보다 ${basketDiff >= 0 ? '+' : '-'}${won(Math.abs(basketDiff))})` : ''),
            );
            if (ok) track('summary_shared');
            showToast(ok ? '공유할 준비가 됐어요' : '공유하지 못했어요');
          }}
        >
          오늘 시세 가족에게 공유하기
        </button>

        <p className="foot">
          aT 농산물유통정보(KAMIS)가 대형마트·전통시장에서 조사한 평균 소매가격이에요. 매장마다 실제 가격은 다를 수 있어요.
          평일에만 조사해서 주말에는 마지막 조사일 시세를 보여줘요.
        </p>
      </div>

      {basketOpen && (
        <div className="sheetBg" onClick={() => setBasketOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>우리집 장바구니 수량</h2>
            <p className="hint" style={{ marginBottom: 12 }}>
              일주일에 보통 사는 양으로 맞춰 두면 좋아요. 0으로 하면 계산에서 빠져요.
            </p>
            <ul className="list">
              {favRows.map((r) => (
                <li key={r.id} className="item qtyRow">
                  <span className="emo">
                    <ItemIcon item={r} />
                  </span>
                  <span className="nm">
                    <b>{r.name}</b>
                    <small>
                      {r.unit} · {won(r.price)}
                    </small>
                  </span>
                  <span className="stepper">
                    <button onClick={() => changeQty(r.id, -1)} aria-label={`${r.name} 빼기`}>
                      −
                    </button>
                    <b>{qtyOf(r.id)}</b>
                    <button onClick={() => changeQty(r.id, 1)} aria-label={`${r.name} 더하기`}>
                      +
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="bTotal" style={{ marginTop: 12 }}>
              <span>합계</span>
              <b>{won(basketNow)}</b>
            </div>
            <button className="btn full" style={{ marginTop: 12 }} onClick={() => setBasketOpen(false)}>
              완료
            </button>
          </div>
        </div>
      )}

      {regionOpen && (
        <div className="sheetBg" onClick={() => setRegionOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>지역 고르기</h2>
            <div className="regions">
              {sidos.map((r) => (
                <button key={r.id} className={region === r.id ? 'on' : ''} onClick={() => pickRegion(r)}>
                  {r.name}
                </button>
              ))}
            </div>
            {cityParents.length > 0 && <h3 className="subhead">도시별로 보기</h3>}
            {cityParents.map((p) => (
              <div key={p.id} className="rgroup">
                <small>{p.name}</small>
                <div className="regions">
                  {book.regions
                    .filter((c) => c.parent === p.id)
                    .map((c) => (
                      <button key={c.id} className={region === c.id ? 'on' : ''} onClick={() => pickRegion(c)}>
                        {c.name}
                      </button>
                    ))}
                </div>
              </div>
            ))}
            <p className="foot" style={{ margin: '4px 0 0' }}>
              KAMIS는 지역마다 대표 도시의 가격을 조사해요. 경기는 수원·성남·의정부·고양·용인, 강원은 춘천·강릉처럼 도는 그
              도시들의 평균이에요.
            </p>
          </div>
        </div>
      )}

      {d && (
        <Detail
          row={d}
          quote={book.q[region][d.id]}
          region={region}
          regionName={regionLabel}
          fav={favs.includes(d.id)}
          onFav={() => toggleFav(d.id)}
          onClose={() => setDetail(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// 토스 배너 광고 자리
function Banner() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) return attachBanner(ref.current);
  }, []);
  if (!BANNER_AD_ID) return null;
  return <div className="banner" ref={ref} />;
}

const histCache = new Map<string, History | null>();

function Detail({
  row,
  quote,
  region,
  regionName,
  fav,
  onFav,
  onClose,
}: {
  row: Row;
  quote: (number | null)[];
  region: string;
  regionName: string;
  fav: boolean;
  onFav: () => void;
  onClose: () => void;
}) {
  const [hist, setHist] = useState<History | null | undefined>(histCache.get(region));

  useEffect(() => {
    if (histCache.has(region)) return;
    loadHistory(region).then((h) => {
      histCache.set(region, h);
      setHist(h);
    });
  }, [region]);

  const last = quote[Q.now]!;
  const comps = [
    { label: '어제', v: quote[Q.d1] },
    { label: '지난주', v: quote[Q.w1] },
    { label: '한 달 전', v: quote[Q.m1] },
    { label: '작년 이맘때', v: quote[Q.y1] },
  ];

  // 매일 기록이 쌓였으면 그걸로, 아직 없으면 한 달 전·2주 전·1주 전·어제·오늘 값으로 그려요
  const daily = hist?.points[row.id] ?? [];
  const anchorList: [string, number | null][] = [
    ['한 달 전', quote[Q.m1]],
    ['2주 전', quote[Q.w2]],
    ['1주 전', quote[Q.w1]],
    ['어제', quote[Q.d1]],
    ['오늘', last],
  ];
  const anchors = anchorList.filter((a): a is [string, number] => a[1] != null);
  const s = daily.length >= 5 ? daily.map((p) => p[1]) : anchors.map((a) => a[1]);
  const min = Math.min(...s);
  const max = Math.max(...s);

  const W = 320;
  const H = 120;
  const pad = 6;
  const span = max - min || 1;
  const pts = s.map((v, i) => [
    pad + (i / Math.max(1, s.length - 1)) * (W - pad * 2),
    pad + (1 - (v - min) / span) * (H - pad * 2),
  ]);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const trend = dir(((last - s[0]) / s[0]) * 100);
  const startLabel = daily.length >= 5 ? daily[0][0].slice(5).replace('-', '.') : anchors[0][0];

  return (
    <div className="sheetBg" onClick={onClose}>
      <div className="sheet detail" onClick={(e) => e.stopPropagation()}>
        <div className="dHead">
          <span className="emo big"><ItemIcon item={row} /></span>
          <div>
            <h2>
              {row.name} <small>{row.unit}</small>
              {row.inSeason && <i className="season">제철</i>}
            </h2>
            <p className="date">{regionName} 평균 시세</p>
          </div>
          <button className={`star ${fav ? 'on' : ''}`} onClick={onFav} aria-label="자주 찾는 품목">
            {fav ? '★' : '☆'}
          </button>
        </div>
        <div className="dPrice">{won(last)}</div>
        <div className="dComps">
          {comps.map((c) => (
            <div key={c.label}>
              <small>{c.label} 대비</small>
              {c.v ? <Change pct={((last - c.v) / c.v) * 100} diff={last - c.v} /> : <span className="chg flat">기록 없음</span>}
            </div>
          ))}
        </div>
        {s.length >= 2 && (
          <>
            <svg className={`spark ${trend}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="최근 가격 흐름">
              <path d={`${path} L${W - pad},${H} L${pad},${H} Z`} className="area" />
              <path d={path} className="line" />
              <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" className="dot" />
            </svg>
            <div className="axis">
              <span>{startLabel}</span>
              <span>오늘</span>
            </div>
          </>
        )}
        <div className="range">
          <div>
            <small>최근 최저</small>
            <b className="down">{won(min)}</b>
          </div>
          <div>
            <small>최근 최고</small>
            <b className="up">{won(max)}</b>
          </div>
        </div>
        <p className="tipLine">
          {last <= min * 1.03
            ? '💡 최근 중 가장 싼 편이에요. 사기 좋은 때예요.'
            : last >= max * 0.97
              ? '💡 최근 중 비싼 편이에요. 급하지 않다면 조금 기다려 보세요.'
              : '💡 최근 평균 수준이에요.'}
        </p>
        <Banner />
        <button className="btn full" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
