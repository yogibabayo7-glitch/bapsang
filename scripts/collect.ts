// 매일 KAMIS 소매가격을 받아서 앱이 읽을 JSON을 만드는 수집기.
// 실행: KAMIS_CERT_KEY=... KAMIS_CERT_ID=... node scripts/collect.ts
// 결과: docs/data/latest.json, docs/data/hist/{지역}.json  (GitHub Pages로 공개)
//       data/snapshots/{날짜}.json                         (그래프용 기록)
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { CATALOG, DEFAULT_RANK, KAMIS_CATEGORY, REGIONS, SURVEY_CITIES, type CatalogEntry, type CategoryId } from '../src/data/catalog.ts';

const BASE = 'https://www.kamis.or.kr/service/price/xml.do';
const CATS = ['100', '200', '300', '400', '500', '600'];
const OUT = 'docs/data';
const SNAP = 'data/snapshots';
const HIST_DAYS = 60;
const PAST = 'data/past'; // 한 달 전·1년 전 비교용 (그래프에는 안 써요)

type Raw = Record<string, string | undefined>;
type Fields = { now?: number; d1?: number; w1?: number; w2?: number; m1?: number; y1?: number };
type Row = Fields & { cat: string; code: string; name: string; kind: string; kindName: string; rank: string; unit: string };
export type FetchRows = (region: string, cat: string, day: string) => Promise<Raw[] | null>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const num = (v?: string) => {
  if (v == null) return undefined;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

// ── KAMIS 호출 ──
export const kamisFetch: FetchRows = async (region, cat, day) => {
  const key = process.env.KAMIS_CERT_KEY;
  const id = process.env.KAMIS_CERT_ID;
  if (!key || !id) throw new Error('KAMIS_CERT_KEY / KAMIS_CERT_ID 가 없어요');
  const qs = new URLSearchParams({
    action: 'dailyPriceByCategoryList',
    p_product_cls_code: '01', // 01 = 소매
    p_country_code: region,
    p_regday: day,
    p_convert_kg_yn: 'N',
    p_item_category_code: cat,
    p_cert_key: key,
    p_cert_id: id,
    p_returntype: 'json',
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${BASE}?${qs}`, { signal: AbortSignal.timeout(45000) });
      const json = JSON.parse(await res.text());
      await sleep(1000);
      const d = json?.data;
      if (Array.isArray(d) && typeof d[0] === 'string') {
        // 오류코드 ("001" = 데이터 없음, 그 외는 인증 등 문제)
        if (d[0] === '001') return [];
        throw new Error(`KAMIS 오류코드 ${d[0]}`);
      }
      if (d?.error_code && d.error_code !== '000') throw new Error(`KAMIS 오류코드 ${d.error_code}`);
      const items = Array.isArray(d) ? d : Array.isArray(d?.item) ? d.item : d?.item ? [d.item] : [];
      return items.filter((x: unknown) => typeof x === 'object');
    } catch (e) {
      if (String(e).includes('오류코드') && !String(e).includes('001')) throw e;
      await sleep(2000 * (attempt + 1));
    }
  }
  return null;
};

// ── 응답 한 줄 → 가격들 (dayN 라벨이 있으면 라벨로, 없으면 기본 순서로) ──
const LABEL_KEY: [RegExp, keyof Fields][] = [
  [/당일/, 'now'],
  [/1일\s*전/, 'd1'],
  [/2주일?\s*전/, 'w2'],
  [/1주일?\s*전/, 'w1'],
  [/1개월\s*전/, 'm1'],
  [/1년\s*전/, 'y1'],
];
const DEFAULT_ORDER: (keyof Fields | null)[] = ['now', 'd1', 'w1', 'w2', 'm1', 'y1', null];

export function parseRow(r: Raw, cat: string): Row {
  const f: Fields = {};
  for (let n = 1; n <= 7; n++) {
    const label = r[`day${n}`];
    let key: keyof Fields | null = DEFAULT_ORDER[n - 1];
    if (label) {
      const hit = LABEL_KEY.find(([re]) => re.test(label));
      key = hit ? hit[1] : null;
    }
    if (key) f[key] = num(r[`dpr${n}`]);
  }
  return {
    ...f,
    cat,
    code: String(r.item_code ?? ''),
    name: String(r.item_name ?? ''),
    kind: String(r.kind_code ?? ''),
    kindName: String(r.kind_name ?? ''),
    rank: String(r.rank_code ?? ''),
    unit: String(r.unit ?? ''),
  };
}

// ── 오늘 조사된 날 찾기 (당일 가격이 아직 안 올라왔으면 하루씩 앞으로) ──
function kstDay(offset = 0) {
  return new Date(Date.now() + 9 * 3600000 - offset * 86400000).toISOString().slice(0, 10);
}
function isWeekday(day: string) {
  const w = new Date(day + 'T00:00:00Z').getUTCDay();
  return w !== 0 && w !== 6;
}

export async function findSurveyDay(fetchRows: FetchRows, start = kstDay()): Promise<string | null> {
  let checked = 0;
  for (let off = 0; off < 10 && checked < 4; off++) {
    const d = new Date(start + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - off);
    const day = d.toISOString().slice(0, 10);
    if (!isWeekday(day)) continue;
    checked++;
    const rows = (await fetchRows('1101', '200', day)) ?? [];
    const filled = rows.map((r) => parseRow(r, '200')).filter((r) => r.now).length;
    console.log('probe', day, `${filled}/${rows.length}`);
    if (rows.length && filled / rows.length >= 0.5) return day;
  }
  return null;
}

// ── 품목 고르기 ──
type Chosen = { entry: CatalogEntry & { auto?: boolean }; kind: string; rank: string; unit: string };

function rankOrder(entry: CatalogEntry) {
  return [...(entry.rank ?? []), ...DEFAULT_RANK];
}

export function chooseItems(all: Map<string, Row[]>): Chosen[] {
  const rows = [...all.entries()].flatMap(([region, rs]) => rs.filter((r) => r.now).map((r) => ({ ...r, region })));
  const chosen: Chosen[] = [];
  const usedCodes = new Set<string>();

  for (const entry of CATALOG) {
    const match = rows.filter((r) => r.code === entry.code && (entry.kind === '*' || r.kind === entry.kind));
    if (!match.length) continue;
    usedCodes.add(entry.code);
    // 품종: 지정했으면 그것, '*'면 가장 많은 지역에서 조사된 것
    const kindCount = new Map<string, number>();
    match.forEach((r) => kindCount.set(r.kind, (kindCount.get(r.kind) ?? 0) + 1));
    const kind = entry.kind !== '*' ? entry.kind : [...kindCount.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const ofKind = match.filter((r) => r.kind === kind);
    const order = rankOrder(entry);
    const ranks = [...new Set(ofKind.map((r) => r.rank))].sort(
      (a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99),
    );
    const rank = ranks[0];
    const unit = ofKind.find((r) => r.rank === rank)?.unit ?? '';
    chosen.push({ entry, kind, rank, unit });
  }

  // 목록에 없는 새 품목(제철 과일 등)은 5개 지역 이상 조사되면 자동으로 추가
  const extra = new Map<string, (Row & { region: string })[]>();
  rows.filter((r) => !usedCodes.has(r.code)).forEach((r) => {
    const k = `${r.code}-${r.kind}`;
    extra.set(k, [...(extra.get(k) ?? []), r]);
  });
  for (const [k, list] of extra) {
    if (new Set(list.map((r) => r.region)).size < 5) continue;
    const r0 = list[0];
    const cat: CategoryId = KAMIS_CATEGORY[r0.cat] ?? 'veg';
    const ranks = [...new Set(list.map((r) => r.rank))].sort(
      (a, b) => (DEFAULT_RANK.indexOf(a) + 1 || 99) - (DEFAULT_RANK.indexOf(b) + 1 || 99),
    );
    const sameName = [...extra.keys()].filter((x) => extra.get(x)![0].name === r0.name).length > 1;
    chosen.push({
      entry: {
        id: `auto-${k}`,
        name: sameName ? `${r0.name} ${r0.kindName.replace(/\(.*$/, '')}` : r0.name,
        emoji: { grain: '🌾', veg: '🥬', mush: '🍄', fruit: '🍑', meat: '🥩', fish: '🐟', spice: '🧂' }[cat],
        cat,
        code: r0.code,
        kind: r0.kind,
        auto: true,
      },
      kind: r0.kind,
      rank: ranks[0],
      unit: r0.unit,
    });
  }
  return chosen;
}

// ── 메인 ──
export async function collect(fetchRows: FetchRows, opts: { day?: string; now?: string } = {}) {
  const day = opts.day ?? (await findSurveyDay(fetchRows));
  if (!day) {
    console.log('조사된 날을 찾지 못했어요. 이번엔 건너뛰어요.');
    return null;
  }
  console.log('survey day', day);

  const regionCodes = Object.keys(SURVEY_CITIES);
  const byRegion = new Map<string, Row[]>();
  for (const region of regionCodes) {
    const rows: Row[] = [];
    for (const cat of CATS) {
      const raw = await fetchRows(region, cat, day);
      if (raw) rows.push(...raw.map((r) => parseRow(r, cat)));
    }
    byRegion.set(region, rows);
    console.log(region, rows.length);
  }

  const chosen = chooseItems(byRegion);
  const KEYS: (keyof Fields)[] = ['now', 'd1', 'w1', 'w2', 'm1', 'y1'];
  const q: Record<string, Record<string, (number | null)[]>> = {};

  for (const [region, rows] of byRegion) {
    q[region] = {};
    for (const c of chosen) {
      const r = rows.find((x) => x.code === c.entry.code && x.kind === c.kind && x.rank === c.rank && x.now);
      if (r) q[region][c.entry.id] = KEYS.map((k) => r[k] ?? null);
    }
  }

  // '1일 전' 가격이 비어 있으면 우리가 저장해 둔 직전 조사일 가격으로 채워요
  mkdirSync(SNAP, { recursive: true });
  const prevFile = readdirSync(SNAP)
    .filter((f) => f.endsWith('.json') && f.slice(0, 10) < day)
    .sort()
    .pop();
  if (prevFile) {
    const prev = JSON.parse(readFileSync(`${SNAP}/${prevFile}`, 'utf8')) as { q: Record<string, Record<string, number>> };
    let filled = 0;
    for (const region of regionCodes) {
      for (const [id, v] of Object.entries(q[region])) {
        const p = prev.q[region]?.[id];
        if (v[1] == null && p) {
          v[1] = p;
          filled++;
        }
      }
    }
    if (filled) console.log(`1일 전 가격 ${filled}건을 ${prevFile.slice(0, 10)} 기록으로 채웠어요`);
  }

  // 1개월 전 / 1년 전이 비어 있으면, 그 날짜에서 가장 가까운 조사일 기록으로 채워요 (앞뒤 4일 안)
  // 그런 기록이 아직 없으면 KAMIS에서 그날 가격을 직접 받아 data/past에 저장해 둬요
  mkdirSync(PAST, { recursive: true });
  const dirOf = (d: string) => (existsSync(`${SNAP}/${d}.json`) ? SNAP : PAST);
  const listDays = () =>
    [...readdirSync(SNAP), ...readdirSync(PAST)].filter((f) => f.endsWith('.json')).map((f) => f.slice(0, 10));
  const fetchPast = async (target: string) => {
    for (const off of [0, -1, 1, -2, 2, -3, 3]) {
      const d = new Date(target + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + off);
      const pd = d.toISOString().slice(0, 10);
      if (!isWeekday(pd)) continue;
      const probe = ((await fetchRows('1101', '200', pd)) ?? []).map((r) => parseRow(r, '200')).filter((r) => r.now);
      if (probe.length < 5) continue;
      const pq: Record<string, Record<string, number>> = {};
      for (const region of regionCodes) {
        const rows: Row[] = [];
        for (const cat of CATS) {
          const raw = await fetchRows(region, cat, pd);
          if (raw) rows.push(...raw.map((r) => parseRow(r, cat)));
        }
        pq[region] = {};
        for (const c of chosen) {
          const r = rows.find((x) => x.code === c.entry.code && x.kind === c.kind && x.rank === c.rank && x.now);
          if (r?.now) pq[region][c.entry.id] = r.now;
        }
      }
      writeFileSync(`${PAST}/${pd}.json`, JSON.stringify({ date: pd, q: pq }));
      console.log(`비교용 과거 가격 저장: ${pd} (목표 ${target})`);
      return;
    }
  };
  let snapDays = listDays();
  const nearest = (target: string) => {
    const t = new Date(target + 'T00:00:00Z').getTime();
    let best: string | null = null;
    let bestGap = 4.5 * 86400000;
    for (const d of snapDays) {
      const gap = Math.abs(new Date(d + 'T00:00:00Z').getTime() - t);
      if (gap < bestGap) {
        best = d;
        bestGap = gap;
      }
    }
    return best;
  };
  const shift = (months: number, years: number) => {
    const d = new Date(day + 'T00:00:00Z');
    d.setUTCFullYear(d.getUTCFullYear() + years, d.getUTCMonth() + months);
    return d.toISOString().slice(0, 10);
  };
  for (const [idx, target] of [
    [4, shift(-1, 0)],
    [5, shift(0, -1)],
  ] as [number, string][]) {
    const missing = Object.values(q['1101'] ?? {}).filter((v) => v[idx] == null).length;
    if (missing > 5 && !nearest(target)) {
      try {
        await fetchPast(target);
      } catch (e) {
        console.log('과거 가격 받기 실패', target, e);
      }
      snapDays = listDays();
    }
    const near = nearest(target);
    if (!near || near === day) continue;
    const snapQ = (JSON.parse(readFileSync(`${dirOf(near)}/${near}.json`, 'utf8')) as { q: Record<string, Record<string, number>> }).q;
    for (const region of regionCodes)
      for (const [id, v] of Object.entries(q[region])) if (v[idx] == null && snapQ[region]?.[id]) v[idx] = snapQ[region][id];
  }

  // 전국·경기 등 묶음 지역 = 속한 조사 도시들의 평균
  for (const r of REGIONS) {
    if (!r.members) continue;
    q[r.id] = {};
    for (const c of chosen) {
      const vals = r.members.map((rg) => q[rg]?.[c.entry.id]).filter(Boolean) as (number | null)[][];
      if (!vals.length) continue;
      q[r.id][c.entry.id] = KEYS.map((_, i) => {
        const xs = vals.map((v) => v[i]).filter((x): x is number => x != null);
        return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length / 10) * 10 : null;
      });
    }
  }

  const items = chosen
    .filter((c) => q.all[c.entry.id])
    .map((c) => ({
      id: c.entry.id,
      name: c.entry.name,
      unit: c.unit,
      emoji: c.entry.emoji,
      cat: c.entry.cat,
      ...(c.entry.season ? { season: c.entry.season } : {}),
    }));

  // 아직 다 안 올라온 날이면 (이전보다 품목이 확 적으면) 덮어쓰지 않아요
  let prevCount = 0;
  try {
    prevCount = JSON.parse(readFileSync(`${OUT}/latest.json`, 'utf8')).items.length;
  } catch {}
  if (items.length < 10 || items.length < prevCount * 0.6) {
    console.log(`${day} 가격이 아직 덜 올라왔어요 (${items.length}개 / 이전 ${prevCount}개). 기존 데이터를 그대로 둬요.`);
    return null;
  }

  const regions = REGIONS.filter((r) => Object.keys(q[r.id] ?? {}).length > 0);
  const latest = { date: day, fetchedAt: opts.now ?? new Date().toISOString(), isSample: false, regions, items, q };

  // 그래프용 기록 쌓기
  mkdirSync(SNAP, { recursive: true });
  const snap: Record<string, Record<string, number>> = {};
  for (const [rg, m] of Object.entries(q)) {
    snap[rg] = {};
    for (const [id, v] of Object.entries(m)) if (v[0] != null) snap[rg][id] = v[0];
  }
  writeFileSync(`${SNAP}/${day}.json`, JSON.stringify({ date: day, q: snap }));

  const files = readdirSync(SNAP).filter((f) => f.endsWith('.json')).sort().slice(-HIST_DAYS);
  const snaps = files.map((f) => JSON.parse(readFileSync(`${SNAP}/${f}`, 'utf8')) as { date: string; q: typeof snap });
  mkdirSync(`${OUT}/hist`, { recursive: true });
  for (const r of regions) {
    const points: Record<string, [string, number][]> = {};
    for (const s of snaps) {
      for (const [id, p] of Object.entries(s.q[r.id] ?? {})) (points[id] ??= []).push([s.date, p]);
    }
    writeFileSync(`${OUT}/hist/${r.id}.json`, JSON.stringify({ region: r.id, points }));
  }

  // 앱에서 고르지 않는 조사 도시(청주 등)는 묶음 지역 계산에만 쓰고 파일에서는 빼요
  for (const code of regionCodes) if (!REGIONS.some((r) => r.id === code)) delete q[code];
  writeFileSync(`${OUT}/latest.json`, JSON.stringify(latest));
  console.log(`done: ${day}, 품목 ${items.length}개, 지역 ${regions.length - 1}곳, 기록 ${snaps.length}일`);
  return latest;
}

// 직접 실행했을 때
if (import.meta.url === `file://${process.argv[1]}`) {
  const day = process.argv[2];
  if (!process.env.KAMIS_CERT_KEY || !process.env.KAMIS_CERT_ID) {
    console.log('KAMIS 인증키가 아직 없어요. Secrets에 KAMIS_CERT_KEY, KAMIS_CERT_ID를 넣으면 수집을 시작해요.');
    process.exit(0);
  }
  collect(kamisFetch, { day }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

