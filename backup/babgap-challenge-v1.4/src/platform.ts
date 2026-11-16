// 토스 SDK 연결부: 저장소, 광고, 공유, 친구 초대, 이벤트 기록
import {
  Analytics,
  Storage,
  TossAds,
  contactsViral,
  loadFullScreenAd,
  openURL,
  share,
  showFullScreenAd,
} from '@apps-in-toss/web-framework';

const AD_IDS = { rewarded: '', banner: 'ait.v2.live.c7be76cf11634e43' };

export const hasRewardedAd = () => !!AD_IDS.rewarded;

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

const inToss = () => safe(() => loadFullScreenAd.isSupported(), false);

// ── 저장소 (토스 앱 안에서는 Storage, 밖에서는 localStorage) ──
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

export async function removeItem(key: string): Promise<void> {
  if (inToss()) {
    try {
      await Storage.removeItem(key);
      return;
    } catch {}
  }
  try {
    localStorage.removeItem(key);
  } catch {}
}

// ── 보상형 광고 ──
let adLoaded = false;
let loadTries = 0;

export function loadRewardedAd(onReady: (ready: boolean) => void): () => void {
  if (!inToss() || !AD_IDS.rewarded) {
    onReady(true);
    return () => {};
  }
  if (loadTries >= 3) return () => {};
  loadTries++;
  return loadFullScreenAd({
    options: { adGroupId: AD_IDS.rewarded },
    onEvent: (ev) => {
      if (ev.type === 'loaded') {
        adLoaded = true;
        loadTries = 0;
        onReady(true);
      }
    },
    onError: () => {
      adLoaded = false;
      onReady(false);
    },
  });
}

export function showRewardedAd(onReward: () => void, onDone: () => void): void {
  if (!inToss() || !AD_IDS.rewarded) {
    onReward();
    onDone();
    return;
  }
  if (!adLoaded || !safe(() => showFullScreenAd.isSupported(), false)) {
    onDone();
    return;
  }
  adLoaded = false;
  showFullScreenAd({
    options: { adGroupId: AD_IDS.rewarded },
    onEvent: (ev) => {
      if (ev.type === 'userEarnedReward') onReward();
      if (ev.type === 'dismissed' || ev.type === 'failedToShow') onDone();
    },
    onError: () => onDone(),
  });
}

// ── 배너 광고 ──
let adsInitialized = false;

export function attachBanner(el: HTMLElement): () => void {
  if (!safe(() => TossAds.attachBanner.isSupported(), false)) return () => {};
  if (!adsInitialized && safe(() => TossAds.initialize.isSupported(), false)) {
    adsInitialized = true;
    safe(() => TossAds.initialize({}), undefined);
  }
  const banner = safe(
    () => TossAds.attachBanner(AD_IDS.banner, el, { theme: 'light', variant: 'card' }),
    null,
  );
  return () => {
    try {
      banner?.destroy();
    } catch {}
  };
}

// ── 공유 ──
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

// ── 친구 초대 (현재 꺼져 있음) ──
export function viralEnabled(): boolean {
  return false;
}

export function inviteFriends(onReward: (n: number) => void, onClose: () => void): () => void {
  try {
    return contactsViral({
      options: { moduleId: '' },
      onEvent: (ev) => {
        if (ev.type === 'sendViral') onReward(ev.data.rewardAmount || 1);
        if (ev.type === 'close') onClose();
      },
      onError: () => onClose(),
    });
  } catch {
    onClose();
    return () => {};
  }
}

// ── 이벤트 기록 (콘솔 '이벤트' → '핵심 지표'에 쓰임) ──
export type TrackEvent =
  | 'meal_logged' // 식사 기록 완료 → 대표 전환
  | 'jar_saved' // 저금통에 저금
  | 'savings_opened' // 토스 적금·예금 보러 가기 누름 (v1.3)
  | 'report_shared'; // 주간 기록 공유

// ── 토스 적금·예금 보러 가기 (v1.3 추가, 사장님이 받은 토스 링크) ──
const SAVINGS_LINK = 'https://toss.im/_m/7VUPezk2';
export function openSavings(): void {
  void (async () => {
    try {
      await openURL(SAVINGS_LINK);
      return;
    } catch {}
    try {
      window.open(SAVINGS_LINK, '_blank');
    } catch {}
  })();
}

export function track(name: TrackEvent, params: Record<string, string | number> = {}): void {
  try {
    void Analytics.click({ log_name: name, ...params });
  } catch {}
}
