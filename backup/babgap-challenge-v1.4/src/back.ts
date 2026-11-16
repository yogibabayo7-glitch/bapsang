// 뒤로가기(토스 위쪽 ‹ 버튼·안드로이드 뒤로가기·iOS 밀어서 뒤로) 처리 — 밥상물가와 같은 방식 (11/16 심사 점검)
// 다른 탭이 열려 있으면 오늘 탭으로 돌아가고, 첫 화면(오늘 탭)에서만 앱을 닫아요.
import { useEffect, useRef } from 'react';
import { closeView, graniteEvent } from '@apps-in-toss/web-framework';

type Layer = { id: number; close: () => void };
const layers: Layer[] = [];
let seq = 0;

// active가 true인 동안 '뒤로'를 누르면 close가 불려요. 나중에 열린 것부터 닫혀요.
export function useBackLayer(active: boolean, close: () => void) {
  const ref = useRef(close);
  ref.current = close;
  useEffect(() => {
    if (!active) return;
    const id = ++seq;
    layers.push({ id, close: () => ref.current() });
    return () => {
      const i = layers.findIndex((l) => l.id === id);
      if (i >= 0) layers.splice(i, 1);
    };
  }, [active]);
}

function goBack() {
  const top = layers[layers.length - 1];
  if (top) {
    top.close();
    return;
  }
  // 첫 화면에서 뒤로 = 앱 닫기 (구독하면 기본 뒤로가기가 막혀서 직접 닫아요)
  closeView().catch(() => {});
}

let started = false;
export function initBackHandler() {
  if (started) return;
  started = true;
  // 미리보기 점검용 (브라우저에서 window.__back()으로 뒤로가기 흉내)
  (window as unknown as { __back?: () => void }).__back = goBack;
  try {
    graniteEvent.addEventListener('backEvent', {
      onEvent: goBack,
      onError: () => {},
    });
  } catch {
    // 토스 밖(브라우저 미리보기)에서는 그냥 넘어가요
  }
}
