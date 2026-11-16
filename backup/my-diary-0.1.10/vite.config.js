import { defineConfig } from 'vite';
import { existsSync, statSync } from 'node:fs';

// 0.1.9 안전장치: 글씨체 파일이 하나라도 빠지면 번들 만들기를 멈춰요 (글씨가 조용히 사라지는 일 방지)
const FONT_FILES = [
  'src/fonts/KyoboHandwriting2024psw.woff2',
  'src/fonts/KyoboHandwriting2025lyb.woff2',
  'node_modules/@fontsource/gaegu/400.css',
  'node_modules/@fontsource/nanum-pen-script/400.css',
  'node_modules/@fontsource/hi-melody/400.css',
];
const fontGuard = {
  name: 'font-guard',
  buildStart() {
    const missing = FONT_FILES.filter(f => !existsSync(f) || statSync(f).size < 1000);
    if (missing.length) this.error('글씨체 파일이 빠졌어요 — 번들 만들기를 멈춥니다: ' + missing.join(', '));
  },
};

export default defineConfig({ plugins: [fontGuard] });
