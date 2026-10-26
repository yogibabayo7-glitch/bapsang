// 실제 KAMIS 수집 결과 파일(다른 형식)로 수집기를 시험하는 스크립트
import { readFileSync } from 'node:fs';
import { collect, type FetchRows } from './collect.ts';

const files = process.argv.slice(2);
for (const file of files) {
  const fx = JSON.parse(readFileSync(file, 'utf8'));
  const fetchRows: FetchRows = async (region, cat) => {
    const items = fx.regions[region]?.items ?? [];
    return items
      .filter((x: { c: string }) => x.c === cat)
      .map((x: { ic: string; n: string; kc: string; k: string; rc: string; u: string; p: (number | null)[] }) => ({
        item_code: x.ic, item_name: x.n, kind_code: x.kc, kind_name: x.k, rank_code: x.rc, unit: x.u,
        day1: '당일', dpr1: x.p[0] == null ? '-' : x.p[0].toLocaleString('en-US'),
        day3: '1주일전', dpr3: String(x.p[1] ?? '-'),
        day4: '2주일전', dpr4: String(x.p[2] ?? '-'),
        day5: '1개월전', dpr5: String(x.p[3] ?? '-'),
        day6: '1년전', dpr6: String(x.p[4] ?? '-'),
        day7: '일평년', dpr7: String(x.p[5] ?? '-'),
      }));
  };
  await collect(fetchRows, { day: fx.date, now: '2026-10-26T00:00:00Z' });
}
