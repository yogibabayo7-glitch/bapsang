// 토스 SDK 연결부: 저장소, 공유, 이벤트 기록
import { Analytics, Device, Storage, TossAds, loadFullScreenAd, share } from '@apps-in-toss/web-framework';

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
  | 'price_viewed' // 오늘 시세 화면을 끝까지 본 순간 (첫 화면 로드)
  | 'item_detail_viewed' // 품목 상세(그래프) 열람 → 대표 전환 후보
  | 'favorite_added' // 자주 찾는 품목 추가
  | 'region_changed'
  | 'summary_shared'
  | 'basket_opened'
  | 'kimjang_opened'
  | 'cabbage_opened' // 배추 종류별 보기 열기
  | 'cabbage_kind_selected' // 배추 산지·종류 칩 누름
  | 'cheap_filter_opened' // "평소보다 싸요" 필터 누름
  | 'shop_clicked'; // 토스쇼핑 상품 누름 (보상 없음)

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
