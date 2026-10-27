# 오늘밥상물가 / 밥값 챌린지 — 작업 인수인계 (2026-10-27)

새 대화에서 이 파일부터 읽고 이어서 작업해요.

## 앱 2개 (토스 앱인토스)
- **오늘밥상물가** `bapsang-price` — 이 저장소(github.com/yogibabayo7-glitch/bapsang). KAMIS 소매 시세를 날씨처럼 보여줌.
  - 출시: v0.1(10/27). v0.3(장바구니+그림) 검토 중. v0.4(김장 계산기+토스쇼핑 카드) 빌드 완료, v0.3 출시 후 올릴 예정.
  - 빌드: `npm run build` → `bapsang-price.ait`. 미리보기: `npx vite build --base ./ --outDir docs/preview --emptyOutDir`.
  - 배너 광고 ID 아직 없음(`.env` `VITE_BANNER_AD_ID`).
- **밥값 챌린지** `babgap-challenge` — 소스는 이 저장소에 없음(작업 컨테이너의 /home/claude/babgap-challenge, 재구성본). v1.3(토스 적금 보러 가기 버튼, 링크 https://toss.im/_m/7VUPezk2) 검토 중.

## 데이터 파이프라인
- GitHub Actions "시세 수집"(`.github/workflows/collect.yml`) → `scripts/collect.ts` → `docs/data/latest.json`, `hist/{지역}.json` (Pages로 서비스).
- 한 달 전·1년 전 가격이 비면 KAMIS 과거 날짜를 받아 `data/past/`에 저장해 채움 (10/27 추가, 정상 동작 확인).
- Secrets: KAMIS_CERT_ID, KAMIS_CERT_KEY.

## 토스쇼핑 쉐어링크
- 기본 수수료 5%, 클릭 후 24시간 마지막 클릭 기준. 대가성 문구 필수, 클릭 보상 금지, 썸네일 가공 금지.
- Open API 승인됨(연동 중). 출발지 IP 등록 필요 → `tools/shop/` PowerShell 도구를 사장님 PC에서 매일 09:40 실행 → `docs/data/shop.json` 업로드. (아직 사장님 PC 설치 전, 실제 실행 검증 전)
- 앱: `src/Shop.tsx`(상품 카드, productsFor), `src/Kimjang.tsx`(김장 계산기, 20포기 기준 재료 12종).

## 다음 할 일
1. 김장 재료 **국산만**: KAMIS 품종 확인(고춧가루·깐마늘 등 국산 품종 고정), 쇼핑 상품도 '수입/중국산' 제외·'국산/국내산' 우선.
2. **배추 종류별 보기**: 쇼핑 상품을 산지·종류(해남, 괴산, 강원 고랭지, 절임배추, 생배추)로 묶어 골라 보는 화면. (API에 키워드 검색·카테고리 링크 없음 → 앱 안 목록으로 고르게)
3. 보상형 광고(밥값: 연속 기록 지키기 / 밥상물가: 지역 비교), 배너 추가, 전면 광고 — 광고 그룹 ID 받으면.
4. 10/28: 오늘밥상물가 핵심 지표에 `item_detail_viewed` 대표 전환 등록.
5. ③ "평소보다 싸요" 배지(30일 평균).
