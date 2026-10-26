# 오늘밥상물가

토스 미니앱. KAMIS(aT 농산물유통정보) 평균 소매가격을 날씨 앱처럼 한눈에 보여줘요.

## 구조
- `src/` 앱 화면 (React)
  - `src/data/catalog.ts` 보여줄 품목·지역 목록 (품목 추가는 여기에)
  - `src/data/source.ts` 데이터 가져오는 곳 (`.env`의 `VITE_DATA_BASE`)
- `scripts/collect.ts` 매일 KAMIS에서 시세를 받아 `docs/data/`에 저장하는 수집기
- `.github/workflows/collect.yml` 수집기를 매일 자동 실행 (GitHub Actions)

## 처음 한 번 설정
1. GitHub에 이 폴더를 새 저장소(예: `jangbaguni`)로 올려요.
2. 저장소 Settings → Secrets and variables → Actions 에 두 값을 넣어요.
   - `KAMIS_CERT_KEY` : KAMIS 인증키
   - `KAMIS_CERT_ID`  : KAMIS 아이디
3. Settings → Pages → Branch를 `main`, 폴더를 `/docs`로 저장해요.
4. Actions 탭 → "시세 수집" → Run workflow 로 한 번 실행해요.
5. `.env`에 `VITE_DATA_BASE=https://아이디.github.io/jangbaguni/data` 를 넣고 `npm run build` 하면 진짜 시세로 된 `jangbaguni.ait`가 나와요.

## 직접 실행
```
KAMIS_CERT_KEY=... KAMIS_CERT_ID=... node scripts/collect.ts
```
