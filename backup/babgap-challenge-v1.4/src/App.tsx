import { useEffect, useMemo, useRef, useState } from 'react';
import { TIPS } from './tips';
import { initBackHandler, useBackLayer } from './back';
import {
  attachBanner,
  getItem,
  hasRewardedAd,
  inviteFriends,
  loadRewardedAd,
  openSavings,
  removeItem,
  setItem,
  shareText,
  showRewardedAd,
  track,
  viralEnabled,
} from './platform';

// ── 타입 ──
type Kind = 'home' | 'cvs' | 'delivery' | 'eatout' | 'cafe';
type Meal = { id: string; day: string; kind: Kind; amount: number };
type Settings = { goal: number; deliveryRef: number };
type JarMove = { id: string; day: string; amount: number };
type Jar = { name: string; target: number; moves: JarMove[] };
type Tab = 'today' | 'report' | 'settings';
type BadgeCtx = {
  total: number;
  best: number;
  homeAll: number;
  saved: number;
  noDeliveryWeek: boolean;
  moved: number;
};

// ── 상수 ──
const DEFAULT_JAR: Jar = { name: '비상금', target: 300000, moves: [] };

const KINDS: { k: Kind; label: string; icon: string }[] = [
  { k: 'home', label: '집밥', icon: '🍚' },
  { k: 'cvs', label: '편의점', icon: '🏪' },
  { k: 'delivery', label: '배달', icon: '🛵' },
  { k: 'eatout', label: '외식', icon: '🍜' },
  { k: 'cafe', label: '카페·간식', icon: '☕' },
];

const QUICK_AMOUNTS: Record<Kind, number[]> = {
  home: [0, 2000, 4000],
  cvs: [4000, 6000, 8000],
  delivery: [13000, 18000, 23000],
  eatout: [9000, 12000, 15000],
  cafe: [2000, 4500, 6000],
};

const KEYS = {
  settings: 'bg.settings',
  meals: 'bg.meals',
  tipBonus: 'bg.tipBonus',
  stamps: 'bg.stamps',
  covered: 'bg.covered',
  badges: 'bg.badges',
  jar: 'bg.jar',
};

const BADGES: { id: string; icon: string; name: string; how: string; ok: (c: BadgeCtx) => boolean }[] = [
  { id: 'first', icon: '✏️', name: '첫 기록', how: '처음으로 한 끼 기록', ok: (c) => c.total >= 1 },
  { id: 's3', icon: '🔥', name: '3일 연속', how: '목표 3일 연속 지키기', ok: (c) => c.best >= 3 },
  { id: 's7', icon: '🏅', name: '일주일 연속', how: '목표 7일 연속 지키기', ok: (c) => c.best >= 7 },
  { id: 's30', icon: '🏆', name: '한 달 연속', how: '목표 30일 연속 지키기', ok: (c) => c.best >= 30 },
  { id: 'home10', icon: '🍚', name: '집밥 10번', how: '집밥 10번 기록', ok: (c) => c.homeAll >= 10 },
  { id: 'nodel', icon: '🛵', name: '배달 없는 일주일', how: '7일 중 5일 이상 기록하고 배달 0번', ok: (c) => c.noDeliveryWeek },
  { id: 'save1', icon: '💰', name: '1만 원 아낌', how: '아낀 돈 누적 1만 원', ok: (c) => c.saved >= 10000 },
  { id: 'save5', icon: '💎', name: '5만 원 아낌', how: '아낀 돈 누적 5만 원', ok: (c) => c.saved >= 50000 },
  { id: 'save10', icon: '👑', name: '10만 원 아낌', how: '아낀 돈 누적 10만 원', ok: (c) => c.saved >= 100000 },
  { id: 'jar1', icon: '🐷', name: '첫 저금', how: '아낀 돈을 처음 저금통에 옮기기', ok: (c) => c.moved > 0 },
  { id: 'jar10', icon: '🪙', name: '1만 원 저금', how: '저금통에 1만 원 모으기', ok: (c) => c.moved >= 10000 },
  { id: 'jar100', icon: '🏦', name: '10만 원 저금', how: '저금통에 10만 원 모으기', ok: (c) => c.moved >= 100000 },
];

// ── 유틸 ──
const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;
const toDay = (d = new Date()) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const addDays = (day: string, n: number) => {
  const d = new Date(day + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toDay(d);
};
const weekdayOf = (day: string) => '일월화수목금토'[new Date(day + 'T00:00:00').getDay()];
const newId = () => Math.random().toString(36).slice(2, 10);
const digits = (s: string) => s.replace(/[^0-9]/g, '');

function parse<T>(raw: string | null): T | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

// ── 메인 ──
export default function App() {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [tab, setTab] = useState<Tab>('today');
  const [kind, setKind] = useState<Kind | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [tipBonus, setTipBonus] = useState({ day: '', n: 0 });
  const [adReady, setAdReady] = useState(false);
  const [toast, setToast] = useState('');
  const [stamps, setStamps] = useState(0);
  const [covered, setCovered] = useState<string[]>([]);
  const [badges, setBadges] = useState<string[] | null>(null);
  const [jar, setJar] = useState<Jar>(DEFAULT_JAR);
  const [partialMove, setPartialMove] = useState('');
  // 11/16: 뒤로가기 — 리포트·설정 탭에서 누르면 오늘 탭으로 돌아가요
  useBackLayer(tab !== 'today', () => setTab('today'));
  const today = toDay();

  useEffect(() => {
    (async () => {
      const [s, m, tb, st, cv, bd, jr] = await Promise.all([
        getItem(KEYS.settings),
        getItem(KEYS.meals),
        getItem(KEYS.tipBonus),
        getItem(KEYS.stamps),
        getItem(KEYS.covered),
        getItem(KEYS.badges),
        getItem(KEYS.jar),
      ]);
      const ps = parse<Settings>(s);
      if (ps) setSettings(ps);
      const pm = parse<Meal[]>(m);
      if (pm) setMeals(pm);
      const ptb = parse<{ day: string; n: number }>(tb);
      if (ptb) setTipBonus(ptb);
      setStamps(Number(st) || 0);
      const pcv = parse<string[]>(cv);
      if (pcv) setCovered(pcv);
      setBadges(parse<string[]>(bd) ?? []);
      const pj = parse<Partial<Jar>>(jr);
      if (pj) setJar({ ...DEFAULT_JAR, ...pj });
      setReady(true);
      initBackHandler(); // 11/16: 안드로이드 뒤로가기 — 다른 탭이면 오늘 탭으로, 오늘 탭(첫 화면)이면 앱 닫기
    })();
    const cancel = loadRewardedAd(setAdReady);
    return () => {
      try {
        cancel();
      } catch {}
    };
  }, []);

  const saveMeals = (next: Meal[]) => {
    setMeals(next);
    void setItem(KEYS.meals, JSON.stringify(next.slice(-1500)));
  };
  const saveSettings = (next: Settings) => {
    setSettings(next);
    void setItem(KEYS.settings, JSON.stringify(next));
  };
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };
  const saveJar = (next: Jar) => {
    setJar(next);
    void setItem(KEYS.jar, JSON.stringify({ ...next, moves: next.moves.slice(-1000) }));
  };

  const stats = useMemo(() => {
    const goal = settings?.goal ?? 10000;
    const byDay = new Map<string, number>();
    meals.forEach((m) => byDay.set(m.day, (byDay.get(m.day) ?? 0) + m.amount));
    const spentToday = byDay.get(today) ?? 0;

    let saved = 0;
    byDay.forEach((v, day) => {
      if (day < today) saved += Math.max(0, goal - v);
    });

    const kept = (day: string) =>
      covered.includes(day) || (byDay.has(day) && (byDay.get(day) ?? 0) <= goal);

    let streak = 0;
    let cur = kept(today) ? today : addDays(today, -1);
    while (kept(cur)) {
      streak++;
      cur = addDays(cur, -1);
    }

    const yesterday = addDays(today, -1);
    const breakDay = !kept(yesterday) && kept(addDays(yesterday, -1)) ? yesterday : '';

    let best = 0;
    let run = 0;
    let prev = '';
    for (const day of [...new Set([...byDay.keys(), ...covered])].sort()) {
      if (kept(day)) {
        run = prev && addDays(prev, 1) === day ? run + 1 : 1;
        best = Math.max(best, run);
        prev = day;
      } else {
        run = 0;
        prev = '';
      }
    }

    const homeAll = meals.filter((m) => m.kind === 'home').length;
    const week = Array.from({ length: 7 }, (_, i) => {
      const k = addDays(today, i - 6);
      return { k, v: byDay.get(k) ?? 0, has: byDay.has(k) };
    });
    const weekMeals = meals.filter((m) => m.day >= week[0].k);
    const weekSaved = week
      .filter((d) => d.has && d.k < today)
      .reduce((a, d) => a + Math.max(0, goal - d.v), 0);
    const byKind = KINDS.map((k) => ({
      ...k,
      sum: weekMeals.filter((m) => m.kind === k.k).reduce((a, m) => a + m.amount, 0),
      n: weekMeals.filter((m) => m.kind === k.k).length,
    }));
    const deliveries = byKind.find((k) => k.k === 'delivery')!.n;
    const avoided = weekMeals.filter((m) => m.kind === 'home').length;
    const deliveryRef = settings?.deliveryRef ?? 18000;
    const vsDelivery = weekMeals
      .filter((m) => m.kind === 'home' || m.kind === 'cvs')
      .reduce((a, m) => a + Math.max(0, deliveryRef - m.amount), 0);
    const recordedDays = Array.from({ length: 7 }, (_, i) => addDays(today, -i)).filter((d) =>
      byDay.has(d),
    ).length;
    const recentDeliveries = meals.filter(
      (m) => m.day > addDays(today, -7) && m.kind === 'delivery',
    ).length;
    const moved = jar.moves.reduce((a, m) => a + m.amount, 0);

    return {
      moved,
      toMove: Math.max(0, saved - moved),
      breakDay,
      badgeCtx: {
        total: meals.length,
        best,
        homeAll,
        saved,
        noDeliveryWeek: recordedDays >= 5 && recentDeliveries === 0,
        moved,
      } as BadgeCtx,
      vsDelivery,
      goal,
      spentToday,
      saved,
      streak,
      week,
      weekSaved,
      byKind,
      deliveries,
      avoided,
      weekTotal: weekMeals.reduce((a, m) => a + m.amount, 0),
    };
  }, [meals, settings, today, covered, jar]);

  // 새 배지 알림
  useEffect(() => {
    if (!badges || !settings) return;
    const earned = BADGES.filter((b) => b.ok(stats.badgeCtx)).map((b) => b.id);
    const fresh = earned.filter((id) => !badges.includes(id));
    if (fresh.length) {
      const b = BADGES.find((x) => x.id === fresh[0])!;
      setBadges(earned);
      void setItem(KEYS.badges, JSON.stringify(earned));
      setTimeout(() => showToast(`${b.icon} 새 배지: ${b.name}`), 900);
    }
  }, [stats, badges, settings]);

  const bonusToday = tipBonus.day === today ? tipBonus.n : 0;
  const dayIndex = Math.floor(new Date(today + 'T00:00:00').getTime() / 86400000);
  const tips = Array.from({ length: 1 + bonusToday }, (_, i) => TIPS[(dayIndex * 3 + i) % TIPS.length]);

  if (!ready)
    return (
      <div className="screen center">
        <div className="spinner" />
      </div>
    );
  if (!settings) return <Intro onStart={saveSettings} />;

  const logMeal = (k: Kind, amount: number) => {
    if (!(amount >= 0) || amount > 1_000_000) {
      showToast('금액을 다시 확인해 주세요');
      return;
    }
    saveMeals([...meals, { id: newId(), day: today, kind: k, amount }]);
    setKind(null);
    setCustomAmount('');
    const left = settings.goal - (stats.spentToday + amount);
    track('meal_logged', { meal_type: k, amount, within_goal: left >= 0 ? 'Y' : 'N' });
    showToast(left >= 0 ? `기록했어요 · 오늘 ${won(left)} 남았어요` : `기록했어요 · 목표보다 ${won(-left)} 더 썼어요`);
  };

  const moveToJar = (amount: number) => {
    if (!(amount > 0) || amount > 10_000_000) {
      showToast('금액을 다시 확인해 주세요');
      return;
    }
    saveJar({ ...jar, moves: [...jar.moves, { id: newId(), day: today, amount }] });
    setPartialMove('');
    track('jar_saved', { amount });
    showToast(`🐷 저금통에 ${won(amount)} 넣었어요`);
  };

  const left = settings.goal - stats.spentToday;
  const usedPct = Math.min(100, (stats.spentToday / settings.goal) * 100);

  return (
    <div className="screen">
      {tab === 'today' && (
        <div className="scroll">
          <section className="hero">
            <div className="label">오늘 남은 식비</div>
            <div className={`big ${left < 0 ? 'over' : ''}`}>{left >= 0 ? won(left) : `-${won(-left)}`}</div>
            <div className="bar">
              <i style={{ width: `${usedPct}%` }} className={left < 0 ? 'over' : ''} />
            </div>
            <div className="sub">
              목표 {won(settings.goal)} 중 {won(stats.spentToday)} 썼어요
            </div>
          </section>

          <section className="cards2">
            <div className="card">
              <div className="label">목표 지킨 날</div>
              <div className="mid">{stats.streak}일 연속</div>
            </div>
            <div className="card">
              <div className="label">어제까지 아낀 돈</div>
              <div className="mid blue">{won(stats.saved)}</div>
            </div>
          </section>

          {stats.toMove > 0 && (
            <section className="card notice">
              <b>🐷 아낀 돈 {won(stats.toMove)}, 진짜로 모아 볼까요?</b>
              <p>
                은행이나 토스 앱에서 내 저축 통장으로 직접 옮긴 뒤 눌러 주세요. 밥값 챌린지는 돈을 옮기지
                않고, 옮겼다고 누른 금액만 저금통에 쌓아요.
              </p>
              <button
                className="btn ghost full"
                style={{ marginBottom: 8 }}
                onClick={() => {
                  track('savings_opened', { from: 'notice', amount: stats.toMove });
                  openSavings();
                }}
              >
                🏦 토스에서 적금·예금 보러 가기
              </button>
              <button className="btn full" onClick={() => moveToJar(stats.toMove)}>
                {won(stats.toMove)} 옮겼어요
              </button>
              <div className="row" style={{ marginTop: 8 }}>
                <input
                  inputMode="numeric"
                  placeholder="일부만 옮겼다면 금액 (원)"
                  value={partialMove}
                  onChange={(e) => setPartialMove(digits(e.target.value))}
                />
                <button className="btn ghost" disabled={!partialMove} onClick={() => moveToJar(Number(partialMove))}>
                  넣기
                </button>
              </div>
            </section>
          )}

          {stats.breakDay && stamps > 0 && (
            <section className="card notice">
              <b>어제 기록이 끊겼어요</b>
              <p>도장 1개로 어제를 지키면 연속 기록이 이어져요. (남은 도장 {stamps}개)</p>
              <button
                className="btn full"
                onClick={() => {
                  const next = [...covered, stats.breakDay];
                  setCovered(next);
                  void setItem(KEYS.covered, JSON.stringify(next));
                  const s = stamps - 1;
                  setStamps(s);
                  void setItem(KEYS.stamps, String(s));
                  showToast('연속 기록을 지켰어요');
                }}
              >
                도장 1개로 연속 기록 지키기
              </button>
            </section>
          )}

          <section className="card">
            <h2>방금 먹은 거 기록하기</h2>
            <div className="kinds">
              {KINDS.map((k) => (
                <button key={k.k} className={`kind ${kind === k.k ? 'on' : ''}`} onClick={() => setKind(kind === k.k ? null : k.k)}>
                  <span className="ico">{k.icon}</span>
                  {k.label}
                </button>
              ))}
            </div>
            {kind && (
              <div className="amount">
                <div className="quick">
                  {QUICK_AMOUNTS[kind].map((a) => (
                    <button key={a} className="chip" onClick={() => logMeal(kind, a)}>
                      {a === 0 ? '0원 (있던 재료)' : won(a)}
                    </button>
                  ))}
                </div>
                <div className="row">
                  <input
                    inputMode="numeric"
                    placeholder="직접 입력 (원)"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(digits(e.target.value))}
                  />
                  <button className="btn" disabled={!customAmount} onClick={() => logMeal(kind, Number(customAmount))}>
                    기록
                  </button>
                </div>
              </div>
            )}
            <ul className="list">
              {meals
                .filter((m) => m.day === today)
                .map((m) => {
                  const k = KINDS.find((x) => x.k === m.kind)!;
                  return (
                    <li key={m.id}>
                      <span>
                        {k.icon} {k.label}
                      </span>
                      <b>{won(m.amount)}</b>
                      <button className="del" aria-label="삭제" onClick={() => saveMeals(meals.filter((x) => x.id !== m.id))}>
                        삭제
                      </button>
                    </li>
                  );
                })}
              {!meals.some((m) => m.day === today) && <li className="empty">아직 오늘 기록이 없어요</li>}
            </ul>
          </section>

          <section className="card">
            <h2>오늘의 절약 팁</h2>
            {tips.map((t, i) => (
              <div className="tip" key={i}>
                <b>{t.t}</b>
                <p>{t.d}</p>
              </div>
            ))}
            <button
              className="btn ghost full"
              onClick={() => {
                if (bonusToday >= 3) {
                  showToast('오늘 팁은 여기까지예요. 내일 또 만나요');
                  return;
                }
                showRewardedAd(
                  () => {
                    const next = { day: today, n: bonusToday + 1 };
                    setTipBonus(next);
                    void setItem(KEYS.tipBonus, JSON.stringify(next));
                  },
                  () => {
                    setAdReady(false);
                    loadRewardedAd(setAdReady);
                  },
                );
              }}
              disabled={!adReady && bonusToday < 3}
            >
              {bonusToday >= 3
                ? '오늘 팁을 다 봤어요'
                : hasRewardedAd()
                  ? adReady
                    ? '광고 보고 팁 하나 더 보기'
                    : '광고 준비 중…'
                  : '팁 하나 더 보기'}
            </button>
          </section>

          {viralEnabled() && (
            <section className="card">
              <h2>친구 초대하고 도장 받기</h2>
              <p className="note" style={{ marginTop: 0 }}>
                친구에게 밥값 챌린지를 보내면 도장을 받아요. 도장은 기록이 끊긴 날 연속 기록을 지키는 데 써요.
                하루 한 번까지.
              </p>
              <button
                className="btn ghost full"
                style={{ marginTop: 12 }}
                onClick={() => {
                  const close = inviteFriends(
                    (n) => {
                      setStamps((s) => {
                        const next = s + n;
                        void setItem(KEYS.stamps, String(next));
                        return next;
                      });
                      showToast(`도장 ${n}개를 받았어요`);
                    },
                    () => {
                      try {
                        close();
                      } catch {}
                    },
                  );
                }}
              >
                친구에게 보내기 (내 도장 {stamps}개)
              </button>
            </section>
          )}

          <Banner />
        </div>
      )}

      {tab === 'report' && (
        <div className="scroll">
          <section className="hero">
            <div className="label">최근 7일 동안 아낀 돈 (어제까지)</div>
            <div className="big blue">{won(stats.weekSaved)}</div>
            <div className="sub">
              7일 동안 {won(stats.weekTotal)} 썼어요 · 배달 {stats.deliveries}번 · 집밥 {stats.avoided}번
            </div>
          </section>

          <section className="card">
            <h2>하루 식비</h2>
            <div className="chart">
              {stats.week.map((d) => {
                const max = Math.max(settings.goal * 1.5, ...stats.week.map((w) => w.v));
                return (
                  <div className="col" key={d.k}>
                    <div className="val">
                      {d.has ? (d.v >= 10000 ? `${(d.v / 10000).toFixed(1)}만` : `${Math.round(d.v / 1000)}천`) : '-'}
                    </div>
                    <div className="track">
                      <i className={d.v > settings.goal ? 'over' : ''} style={{ height: `${(d.v / max) * 100}%` }} />
                      <span className="goal" style={{ bottom: `${(settings.goal / max) * 100}%` }} />
                    </div>
                    <div className={`d ${d.k === today ? 'now' : ''}`}>{d.k === today ? '오늘' : weekdayOf(d.k)}</div>
                  </div>
                );
              })}
            </div>
            <p className="note">점선은 하루 목표 {won(settings.goal)}이에요. 빨간 막대는 목표를 넘은 날이에요.</p>
          </section>

          <section className="card">
            <div className="label">배달 대신 집밥·편의점으로 먹어서 아낀 돈</div>
            <div className="mid blue">{won(stats.vsDelivery)}</div>
            <p className="note">내가 정한 배달 한 번 금액 {won(settings.deliveryRef)} 기준이에요.</p>
          </section>

          <JarCard
            jar={jar}
            moved={stats.moved}
            toMove={stats.toMove}
            onSave={(name, target) => {
              saveJar({ ...jar, name, target });
              showToast('저금통 목표를 저장했어요');
            }}
          />

          <section className="card">
            <h2>
              내 배지 {BADGES.filter((b) => b.ok(stats.badgeCtx)).length}/{BADGES.length}
            </h2>
            <div className="badges">
              {BADGES.map((b) => {
                const on = b.ok(stats.badgeCtx);
                return (
                  <div key={b.id} className={`badge ${on ? 'on' : ''}`}>
                    <span className="bi">{on ? b.icon : '🔒'}</span>
                    <b>{b.name}</b>
                    <small>{b.how}</small>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card">
            <h2>어디에 썼나</h2>
            <ul className="list">
              {stats.byKind
                .filter((k) => k.n > 0)
                .sort((a, b) => b.sum - a.sum)
                .map((k) => (
                  <li key={k.k}>
                    <span>
                      {k.icon} {k.label} {k.n}번
                    </span>
                    <b>{won(k.sum)}</b>
                  </li>
                ))}
              {stats.byKind.every((k) => k.n === 0) && <li className="empty">기록이 쌓이면 여기에 보여요</li>}
            </ul>
          </section>

          <button
            className="btn full"
            onClick={async () => {
              const ok = await shareText(`밥값 챌린지 7일 기록: 목표 지키고 ${won(stats.weekSaved)} 아꼈어요. 같이 해볼래?`);
              if (ok) track('report_shared', { week_saved: stats.weekSaved });
              showToast(ok ? '공유할 준비가 됐어요' : '공유하지 못했어요');
            }}
          >
            이번 주 기록 공유하기
          </button>
          <Banner />
        </div>
      )}

      {tab === 'settings' && (
        <div className="scroll">
          <SettingsView
            settings={settings}
            onSave={(s) => {
              saveSettings(s);
              showToast('저장했어요');
            }}
            onReset={async () => {
              await removeItem(KEYS.meals);
              await removeItem(KEYS.jar);
              setMeals([]);
              setJar(DEFAULT_JAR);
              showToast('기록을 모두 지웠어요');
            }}
          />
        </div>
      )}

      <nav className="tabs">
        {(
          [
            ['today', '오늘'],
            ['report', '리포트'],
            ['settings', '설정'],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            className={tab === k ? 'on' : ''}
            onClick={() => {
              setTab(k);
              setKind(null);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ── 저금통 카드 ──
function JarCard({
  jar,
  moved,
  toMove,
  onSave,
}: {
  jar: Jar;
  moved: number;
  toMove: number;
  onSave: (name: string, target: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(jar.name);
  const [target, setTarget] = useState(jar.target);
  const pct = jar.target > 0 ? Math.min(100, (moved / jar.target) * 100) : 0;

  return (
    <section className="card">
      <h2>🐷 내 저금통 · {jar.name}</h2>
      <div className="big blue" style={{ fontSize: 28 }}>
        {won(moved)}
      </div>
      <div className="bar">
        <i style={{ width: `${pct}%` }} />
      </div>
      <div className="sub">
        목표 {won(jar.target)} 중 {Math.floor(pct)}% 모았어요
        {toMove > 0 ? ` · 아직 안 옮긴 돈 ${won(toMove)}` : ''}
      </div>
      {editing ? (
        <div className="amount">
          <div className="quick">
            {['비상금', '여행', '적금', '갖고 싶은 것'].map((n) => (
              <button key={n} className={`chip ${name === n ? 'on' : ''}`} onClick={() => setName(n)}>
                {n}
              </button>
            ))}
          </div>
          <input value={name} maxLength={12} placeholder="저금통 이름" onChange={(e) => setName(e.target.value)} />
          <input
            inputMode="numeric"
            value={target || ''}
            placeholder="목표 금액 (원)"
            onChange={(e) => setTarget(Number(digits(e.target.value)))}
          />
          <button
            className="btn full"
            disabled={!name.trim() || target < 1000}
            onClick={() => {
              onSave(name.trim(), target);
              setEditing(false);
            }}
          >
            저장
          </button>
        </div>
      ) : (
        <button className="btn ghost full" style={{ marginTop: 14 }} onClick={() => setEditing(true)}>
          저금통 이름·목표 바꾸기
        </button>
      )}
      <button
        className="btn ghost full"
        style={{ marginTop: 8 }}
        onClick={() => {
          track('savings_opened', { from: 'jar' });
          openSavings();
        }}
      >
        🏦 아낀 돈 넣을 적금 찾아보기
      </button>
      <p className="note">저금통은 내가 직접 저축 통장으로 옮긴 돈을 기록하는 곳이에요. 어디에 넣을지는 직접 정해요.</p>
    </section>
  );
}

// ── 배너 광고 ──
function Banner() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) return attachBanner(ref.current);
  }, []);
  return <div className="banner" ref={ref} />;
}

// ── 첫 화면 ──
function Intro({ onStart }: { onStart: (s: Settings) => void }) {
  const [goal, setGoal] = useState(10000);
  const [deliveryRef, setDeliveryRef] = useState(18000);
  return (
    <div className="screen">
      <div className="scroll intro">
        <div className="emoji">🍚</div>
        <h1>
          하루 밥값 목표 지키고
          <br />
          아낀 돈 쌓기
        </h1>
        <p className="lede">
          먹을 때마다 한 번만 누르면 오늘 남은 식비와 지금까지 아낀 돈이 보여요. 기록은 이 휴대폰에만 저장돼요.
        </p>
        <section className="card">
          <h2>하루 식비 목표</h2>
          <div className="quick">
            {[8000, 10000, 15000, 20000].map((g) => (
              <button key={g} className={`chip ${goal === g ? 'on' : ''}`} onClick={() => setGoal(g)}>
                {won(g)}
              </button>
            ))}
          </div>
          <input inputMode="numeric" value={goal || ''} onChange={(e) => setGoal(Number(digits(e.target.value)))} />
          <p className="note">처음엔 지킬 수 있는 금액으로 시작하는 게 오래 가요.</p>
        </section>
        <section className="card">
          <h2>배달 한 번 시키면 보통 얼마 써요?</h2>
          <input
            inputMode="numeric"
            value={deliveryRef || ''}
            onChange={(e) => setDeliveryRef(Number(digits(e.target.value)))}
          />
          <p className="note">리포트에서 비교 기준으로만 써요. 나중에 바꿀 수 있어요.</p>
        </section>
        <button
          className="btn full"
          disabled={goal < 1000}
          onClick={() => onStart({ goal, deliveryRef: deliveryRef || 18000 })}
        >
          시작하기
        </button>
      </div>
    </div>
  );
}

// ── 설정 화면 ──
function SettingsView({
  settings,
  onSave,
  onReset,
}: {
  settings: Settings;
  onSave: (s: Settings) => void;
  onReset: () => void;
}) {
  const [goal, setGoal] = useState(settings.goal);
  const [deliveryRef, setDeliveryRef] = useState(settings.deliveryRef);
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <section className="card">
        <h2>하루 식비 목표</h2>
        <input inputMode="numeric" value={goal || ''} onChange={(e) => setGoal(Number(digits(e.target.value)))} />
        <h2 style={{ marginTop: 16 }}>배달 한 번 평균 금액 (내 기준)</h2>
        <input
          inputMode="numeric"
          value={deliveryRef || ''}
          onChange={(e) => setDeliveryRef(Number(digits(e.target.value)))}
        />
        <button
          className="btn full"
          style={{ marginTop: 16 }}
          disabled={goal < 1000}
          onClick={() => onSave({ goal, deliveryRef: deliveryRef || 18000 })}
        >
          저장
        </button>
      </section>
      <section className="card">
        <h2>기록 지우기</h2>
        <p className="note">모든 식비 기록과 저금통 기록을 지워요. 되돌릴 수 없어요.</p>
        {confirming ? (
          <div className="row">
            <button className="btn ghost" onClick={() => setConfirming(false)}>
              취소
            </button>
            <button
              className="btn danger"
              onClick={() => {
                onReset();
                setConfirming(false);
              }}
            >
              지우기
            </button>
          </div>
        ) : (
          <button className="btn ghost full" onClick={() => setConfirming(true)}>
            모든 기록 지우기
          </button>
        )}
      </section>
      <p className="note center">밥값 챌린지는 기록을 이 기기에만 저장해요. 서버로 보내지 않아요.</p>
    </>
  );
}
