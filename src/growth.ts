// 리뷰 요청 · 김장 알림 신청 · 카톡 공유 미리보기 그림 (11/5 앱인토스 웨비나 '혼자 만든 미니앱으로 하루 150만원' 정리대로)
// 근거: 개발자센터 '리뷰 요청'(같은 세션 반복 호출 금지, 노출 여부에 흐름을 묶지 말 것)
//       '푸시알림'(기능성 메시지만 — 혜택 안내·이용 유도는 광고성이라 불가. 발송 코드는 'bapsang-price-'로 시작)
//       '공유 링크'(Share.createLink ogImageUrl, 토스 Android 5.240·iOS 5.239 이상)
import { Environment, Notification, Review, Share } from '@apps-in-toss/web-framework';
import { getItem, setItem, track } from './platform';

// ── 김장 알림: 콘솔 '푸시알림'에서 템플릿을 만들고 검수 통과하면 발송 코드를 넣어요. 비어 있으면 버튼이 안 보여요.
//    신청한 분께만, 김장철 배추·재료값을 1회 알려 드리는 기능성 알림 (발송: 11/20 전후 오전, 토스에 1회 발송 요청)
export const ALERT_CODES: Record<string, string> = {
  kimjang: '',
};

export function alertSupported(key: string): boolean {
  if (!ALERT_CODES[key]) return false;
  try {
    return Notification.requestAgreement.isSupported();
  } catch {
    return false;
  }
}

export type AlertResult = 'new' | 'already' | 'rejected' | 'failed';

export function askAlert(key: string, done: (r: AlertResult) => void): void {
  const templateCode = ALERT_CODES[key];
  if (!templateCode) return done('failed');
  let off: (() => void) | undefined;
  try {
    off = Notification.requestAgreement({
      options: { templateCode },
      onEvent: ({ type }) => {
        const r: AlertResult = type === 'newAgreement' ? 'new' : type === 'alreadyAgreed' ? 'already' : 'rejected';
        track('alert_agreed', { key, result: r });
        done(r);
        off?.();
      },
      onError: () => {
        done('failed');
        off?.();
      },
    });
  } catch {
    done('failed');
  }
}

// ── 리뷰 요청: 핵심 일을 마친 순간 — 시세·김장 계산을 가족에게 공유한 직후, 토스쇼핑에서 담고 돌아왔을 때
//    한 세션에 한 번, 30일에 한 번, 두 번째 방문부터만.
const REVIEW_KEY = 'jb.review.v1';
const VISIT_KEY = 'jb.visits.v1';
let askedThisSession = false;
let visits = 0;

export function countVisit(): void {
  void getItem(VISIT_KEY).then((v) => {
    visits = Number(v || '0') + 1;
    void setItem(VISIT_KEY, String(visits));
  });
}

export async function askReview(reason: 'shared' | 'shop_return'): Promise<void> {
  if (askedThisSession) return;
  try {
    if (!Review.request.isSupported()) return;
    const last = Number((await getItem(REVIEW_KEY)) || '0');
    if (visits < 2 || Date.now() - last < 30 * 24 * 60 * 60 * 1000) return;
    askedThisSession = true;
    void setItem(REVIEW_KEY, String(Date.now()));
    track('review_requested', { reason });
    void Review.request().catch(() => {});
  } catch {}
}

// ── 공유 링크: 누르면 토스에서 이 앱(김장이면 김장 창)이 바로 열리고, 카톡엔 미리보기 그림이 나와요
const APP_NAME = 'bapsang-price';
const FALLBACK_LINK = 'https://tossminiapp.com/s/bF5eRzSo'; // 사장님이 받은 미니앱 공유 링크
const OG_IMAGE = 'https://raw.githubusercontent.com/yogibabayo7-glitch/bapsang/main/docs/og/bapsang-price-share-og.png';
const linkCache = new Map<string, string>();

export async function appLink(open?: 'kimjang'): Promise<string> {
  const path = open ? `intoss://${APP_NAME}?open=${open}` : `intoss://${APP_NAME}`;
  const hit = linkCache.get(path);
  if (hit) return hit;
  try {
    const url = await Share.createLink({ path, ogImageUrl: OG_IMAGE });
    if (url) {
      linkCache.set(path, url);
      return url;
    }
  } catch {}
  return FALLBACK_LINK;
}

// 토스는 들어올 때 쓴 주소를 Environment.initialURL로 알려줘요 (생애혜택 안내소 10/31 실기기 확인)
export function openTarget(): 'kimjang' | null {
  const parts: string[] = [];
  try {
    parts.push(String(Environment.initialURL ?? ''));
  } catch {}
  try {
    parts.push(window.location.search, window.location.hash);
  } catch {}
  return /[?&#]open=kimjang/.test(parts.join(' ')) ? 'kimjang' : null;
}
