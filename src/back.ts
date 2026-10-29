// 뒤로가기(토스 위쪽 ‹ 버튼·안드로이드 뒤로가기·iOS 밀어서 뒤로) 처리
// 열려 있는 화면(품목 상세·시트·검색 결과)을 하나씩 닫고, 아무것도 안 열려 있을 때만 앱을 닫아요.
// (10/29 사장님 지적: 검색해서 상품 보다가 뒤로 가면 앱 밖으로 나가 버림)
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
