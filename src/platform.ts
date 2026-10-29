// 토스 SDK 연결부: 저장소, 공유, 이벤트 기록
import { Analytics, Device, Storage, TossAds, loadFullScreenAd, share, showFullScreenAd } from '@apps-in-toss/web-framework';

function inToss(): boolean {
  try {
    return loadFullScreenAd.isSupported();
  } catch {
    return false;
  }
}

export async function getItem(key: string): Promise<string | null> {
  if (inToss()) {
    try {
      return await Storage.getItem(key);
    } catch {}
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  if (inToss()) {
    try {
      await Storage.setItem(key, value);
      return;
    } catch {}
  }
  try {
    localStorage.setItem(key, value);
  } catch {}
}

// ── 배너 광고 (토스가 광고를 채워줘요) ──
// .env의 VITE_BANNER_AD_ID에 콘솔에서 받은 광고 그룹 ID를 넣어요. 비어 있으면 광고 자리를 안 만들어요.
export const BANNER_AD_ID: string = import.meta.env.VITE_BANNER_AD_ID ?? '';
let adsInitialized = false;

export function attachBanner(el: HTMLElement): () => void {
  if (!BANNER_AD_ID) return () => {};
  try {
    if (!TossAds.attachBanner.isSupported()) return () => {};
    if (!adsInitialized && TossAds.initialize.isSupported()) {
      adsInitialized = true;
      TossAds.initialize({});
    }
    const banner = TossAds.attachBanner(BANNER_AD_ID, el, { theme: 'light', variant: 'card' });
    return () => {
      try {
        banner?.destroy();
      } catch {}
    };
  } catch {
    return () => {};
  }
}

// ── 전면 광고 · 보상형 광고 ──
// .env의 VITE_INTERSTITIAL_AD_ID(전면), VITE_REWARD_AD_ID(보상형)에 콘솔 광고 그룹 ID를 넣어요.
// 비어 있으면 그 광고는 아예 안 불러요(보상형이 비면 '다른 지역 비교' 버튼도 숨겨요).
export const INTERSTITIAL_AD_ID: string = import.meta.env.VITE_INTERSTITIAL_AD_ID ?? '';
export const REWARD_AD_ID: string = import.meta.env.VITE_REWARD_AD_ID ?? '';

const adReady = new Set<string>();
const adLoading = new Set<string>();

function preloadAd(id: string): void {
  if (!id || adReady.has(id) || adLoading.has(id)) return;
  try {
    if (!loadFullScreenAd.isSupported()) return;
    adLoading.add(id);
    loadFullScreenAd({
      options: { adGroupId: id },
      onEvent: (e) => {
        if (e.type === 'loaded') {
          adLoading.delete(id);
          adReady.add(id);
        }
      },
      onError: () => {
        adLoading.delete(id);
      },
    });
  } catch {
    adLoading.delete(id);
  }
}

// 앱 시작 때 한 번: 광고를 미리 받아 둬요 (보여주는 건 나중에)
export function preloadAds(): void {
  preloadAd(INTERSTITIAL_AD_ID);
  preloadAd(REWARD_AD_ID);
}

type ShowResult = 'rewarded' | 'closed' | 'unavailable';

function showAd(id: string): Promise<ShowResult> {
  return new Promise((resolve) => {
    if (!id || !adReady.has(id)) {
      preloadAd(id);
      resolve('unavailable');
      return;
    }
    adReady.delete(id);
    let rewarded = false;
    let done = false;
    const finish = (r: ShowResult) => {
      if (done) return;
      done = true;
      preloadAd(id); // 다음 번을 위해 다시 받아 둬요
      resolve(r);
    };
    try {
      showFullScreenAd({
        options: { adGroupId: id },
        onEvent: (e) => {
          if (e.type === 'userEarnedReward') rewarded = true;
          if (e.type === 'dismissed') finish(rewarded ? 'rewarded' : 'closed');
          if (e.type === 'failedToShow') finish('unavailable');
        },
        onError: () => finish('unavailable'),
      });
    } catch {
      finish('unavailable');
    }
  });
}

// 전면 광고: 품목 상세를 3번 닫을 때마다 한 번, 그리고 최소 3분 간격. 앱 켜자마자는 안 나와요.
const INTERSTITIAL_EVERY = 3;
const INTERSTITIAL_GAP_MS = 3 * 60 * 1000;
let detailCloses = 0;
let lastInterstitial = 0;

export function maybeShowInterstitial(): void {
  if (!INTERSTITIAL_AD_ID) return;
  detailCloses += 1;
  if (detailCloses % INTERSTITIAL_EVERY !== 0) return;
  if (Date.now() - lastInterstitial < INTERSTITIAL_GAP_MS) return;
  if (!adReady.has(INTERSTITIAL_AD_ID)) return;
  lastInterstitial = Date.now();
  track('interstitial_shown');
  void showAd(INTERSTITIAL_AD_ID);
}

// 보상형 광고: 끝까지 보면 true. 광고를 못 불러온 경우에도 기능은 열어 줘요(사용자 잘못이 아니니까).
export async function showRewarded(): Promise<boolean> {
  const r = await showAd(REWARD_AD_ID);
  return r !== 'closed';
}

export async function shareText(message: string): Promise<boolean> {
  try {
    await share({ message });
    return true;
  } catch {}
  try {
    await navigator.clipboard.writeText(message);
    return true;
  } catch {
    return false;
  }
}

// 콘솔 '이벤트' → '핵심 지표'에 쓰는 기록
export type TrackEvent =
  | 'resume_opened' // 토스쇼핑 다녀와 앱을 다시 열었을 때 보던 화면 다시 열기 (to=kimjang·detail·banchan·cabbage)
  | 'price_viewed' // 오늘 시세 화면을 끝까지 본 순간 (첫 화면 로드)
  | 'item_detail_viewed' // 품목 상세(그래프) 열람 → 대표 전환 후보
  | 'favorite_added' // 자주 찾는 품목 추가
  | 'region_changed'
  | 'summary_shared'
  | 'basket_opened'
  | 'kimjang_opened'
  | 'kimjang_heads_changed' // 김장 포기 수 바꿈 (preset/step/input)
  | 'kimjang_item_toggled' // 집에 있는 재료 빼기/넣기
  | 'kimjang_amount_changed' // 재료 양 ▲▼
  | 'kimjang_amount_reset' // 재료 양 기본으로
  | 'cabbage_opened' // 배추 종류별 보기 열기
  | 'cabbage_kind_selected' // 배추 산지·종류 칩 누름
  | 'banchan_opened' // 반찬 카드에서 종류·전체 보기 누름
  | 'banchan_kind_selected' // 반찬 시트에서 종류 칩 누름
  | 'cheap_filter_opened' // "평소보다 싸요" 필터 누름
  | 'shop_clicked' // 토스쇼핑 상품 누름 (보상 없음)
  | 'compare_regions_tapped' // '다른 지역은 얼마?' 버튼 누름
  | 'compare_regions_unlocked' // 보상형 광고 보고 지역 비교 열림
  | 'interstitial_shown'; // 전면 광고 노출

export function track(name: TrackEvent, params: Record<string, string | number> = {}): void {
  try {
    void Analytics.click({ log_name: name, ...params });
  } catch {}
}

// 링크 열기 (토스쇼핑 쉐어링크 등)
export async function openLink(url: string): Promise<void> {
  try {
    await Device.openURL(url);
    return;
  } catch {}
  try {
    window.open(url, '_blank');
  } catch {}
}

// ── 토스쇼핑 다녀온 뒤 이어 보기 (10/29) ──
// 토스쇼핑 링크로 나가면 토스 쪽 문제로 미니앱이 닫힐 때가 있어요(개발자 커뮤니티 문의 중, 토스 수정 날짜 미정).
// 나가기 직전 화면을 저장해 두고, 앱을 다시 열면(30분 안) 그 화면을 다시 열어요.
export type Resume = { k: 'kimjang'; ing?: string } | { k: 'detail'; id: string } | { k: 'banchan'; kind: string } | { k: 'cabbage' };
const RESUME_KEY = 'jb.resume';
const RESUME_MS = 30 * 60 * 1000;
export function saveResume(r: Resume) {
  void setItem(RESUME_KEY, JSON.stringify({ ...r, t: Date.now() }));
}
export function clearResume() {
  void setItem(RESUME_KEY, '');
}
// 앱을 새로 열 때 한 번만 읽어요 (읽으면 지워요)
let resumeOnce: Promise<Resume | null> | null = null;
export function takeResume(): Promise<Resume | null> {
  if (!resumeOnce)
    resumeOnce = getItem(RESUME_KEY).then((v) => {
      clearResume();
      try {
        const o = v ? JSON.parse(v) : null;
        if (o && typeof o.t === 'number' && Date.now() - o.t < RESUME_MS) return o as Resume;
      } catch {}
      return null;
    });
  return resumeOnce;
}
// 앱이 안 닫히고 살아서 돌아온 경우엔 화면이 그대로라 저장한 걸 지워요 (나중에 엉뚱하게 열리지 않게)
try {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') clearResume();
  });
} catch {}
