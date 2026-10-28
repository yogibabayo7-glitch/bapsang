// src/data/shopRules.ts → docs/data/shop-rules.json (사장님 PC의 bapsang-shop.ps1이 매일 내려받아 써요)
// 실행: node scripts/shop-rules.ts   (규칙을 고친 뒤 한 번 돌리고 커밋하면 다음 날 아침 수집부터 반영)
// 같이 하는 일: 품목마다 규칙이 있는지, 정규식이 맞는지, 헷갈리기 쉬운 상품 이름으로 시험
import { writeFileSync } from 'node:fs';
import { CATALOG } from '../src/data/catalog.ts';
import { SHOP_IMPORT_RE, SHOP_RULES } from '../src/data/shopRules.ts';

let bad = 0;
const fail = (m: string) => {
  console.error('✗ ' + m);
  bad++;
};

for (const c of CATALOG) if (!SHOP_RULES[c.id]) fail(`규칙 없음: ${c.id} ${c.name}`);
for (const id of Object.keys(SHOP_RULES)) if (!CATALOG.find((c) => c.id === id)) fail(`카탈로그에 없는 규칙: ${id}`);

const ok = (id: string, name: string) => {
  const r = SHOP_RULES[id];
  return (
    new RegExp(r.must, 'i').test(name) &&
    !(r.not && new RegExp(r.not, 'i').test(name)) &&
    !(r.kr && new RegExp(SHOP_IMPORT_RE, 'i').test(name))
  );
};

// [품목, 상품 이름, 통과해야 하나]
const CASES: [string, string, boolean][] = [
  ['lettuce', '국내산 청상추, 200g, 1봉', true],
  ['lettuce', '마른줄기 상추 궁채, 300g, 1개', false],
  ['lettuce', '모듬 쌈채소 (상추 깻잎 케일), 500g', false],
  ['soybean', '국산 백태 메주콩, 1kg', true],
  ['soybean', '제주 맑은콩나물, 무농약, 300g, 1개', false],
  ['soybean', '이진물산 26년산 볶은 땅콩, 500g', false],
  ['rice', '안성마춤농협 고시히카리쌀, 특등급, 10kg', true],
  ['rice', '새마을농산 귀리, 500g, 5봉', false],
  ['rice', '국내산 찹쌀, 4kg', false],
  ['tomato', '대저 짭짤이 토마토, 2kg', true],
  ['tomato', '포미 착즙 토마토주스, 750ml, 6개', false],
  ['tomato', '국내산 대추방울토마토, 750g', false],
  ['cherry-tomato', '국내산 대추방울토마토, 750g', true],
  ['cabbage', '해남 김장배추, 3포기, 1망', true],
  ['cabbage', '국내산 양배추, 800g-1kg, 1개', false],
  ['cabbage', '괴산군자농협 정품 절임배추, 20kg, 1개', false],
  ['cabbage', '중국산 배추, 1통', false],
  ['radish', '국내산 무, 1kg 내외, 1개', true],
  ['radish', '제주 월동무, 10kg', true],
  ['radish', '무농약 시금치, 300g', false],
  ['radish', '국내산 열무, 1kg', false],
  ['pear', '나주 신고배, 7.5kg, 14과', true],
  ['pear', '햇배추 2통', false],
  ['pear', '국산 배 5kg 선물용', true],
  ['pear', '무료배송 사과 3kg', false],
  ['sesame', '국산 볶음 참깨, 500g', true],
  ['sesame', '고궁 통참깨 참기름, 350ml, 4개', false],
  ['walnut', '미토 호두아몬드 율무차, 18g, 50개입', false],
  ['walnut', '미국산 호두 분태, 1kg', true],
  ['avocado', '광천김 아보카도유김, 30g, 5캔', false],
  ['avocado', '하스 아보카도, 5입', true],
  ['shrimp', '신안 새우젓, 국산, 2kg, 1개', false],
  ['shrimp', '활 흰다리새우, 1kg', true],
  ['salted-shrimp', '신안 새우젓, 국산, 2kg, 1개', true],
  ['sea-salt', '청담채 괴산 국내산 천일염 90일배추 절임배추', false],
  ['sea-salt', '천연옹판타일염전 신안 천일염, 2025년산, 20kg', true],
  ['beef-tenderloin', '농협안심한우 꼬리잡뼈, 보신용, 4kg, 1', false],
  ['beef-tenderloin', '1++ 한우 안심 스테이크용, 300g', true],
  ['beef-sirloin', '한가득 소고기 한판 세트, 살치 200g', false],
  ['beef-sirloin', '한우 1등급 꽃등심, 300g', true],
  ['pork-rib', '푸드센터 소갈비살, 200g, 2팩', false],
  ['pork-rib', '한돈 찜갈비, 1kg', true],
  ['pork-belly', '한돈 냉장 삼겹살 구이용, 500g', true],
  ['pork-belly', '스페인산 냉동 삼겹살, 1kg', false],
  ['imported-pork', '스페인산 냉동 삼겹살, 1kg', true],
  ['imported-pork', '한돈 냉장 삼겹살 구이용, 500g', false],
  ['chicken', '하림 생닭 10호, 1kg, 2팩', true],
  ['chicken', '닭가슴살 스테이크 100g, 10팩', false],
  ['apple', 'GAP 사과대추, 240g, 1개', false],
  ['apple', '아침애딴 경북 부사사과, 23-25과, 4kg', true],
  ['grape', '덴마크 테이크얼라이브 머스캣청포도+블러드오렌지', false],
  ['grape', '김천 캠벨얼리 포도, 2kg', true],
  ['orange', '덴마크 테이크얼라이브 머스캣청포도+블러드오렌지 주스', false],
  ['oyster', '통영 생굴, 1kg', true],
  ['oyster', '영광 법성포 굴비 10미', false],
  ['oyster', '이금기 굴소스, 510g', false],
  ['eggplant', '국내산 가지, 3입', true],
  ['eggplant', '여러가지 나물 세트', false],
  ['dried-pepper', '국산 햇 태양초 건고추, 1근', true],
  ['dried-pepper', '국산 태양초 고춧가루, 1kg', false],
  ['pepper-powder', '홍주부 국내산 고춧가루, 일반굵기, 보통매운맛', true],
  ['pepper-powder', '중국산 고춧가루, 1kg', false],
  ['egg', '무항생제 특란, 30구', true],
  ['egg', '맥반석 구운계란, 30구', false],
  ['milk', '서울우유 나100%우유, 1L', true],
  ['milk', '바나나맛 우유, 240ml', false],
  ['laver', '광천 김밥용김, 10매', true],
  ['laver', '광천김 고소한 아몬드를 넣은 김자반, 40g', false],
  ['us-beef', '미국산 소갈비살, 500g', true],
  ['us-beef', '한우 갈비살, 300g', false],
  ['mackerel-fillet-kr', '제주 순살 고등어, 1kg', true],
  ['mackerel-fillet-kr', '노르웨이 고등어 필렛, 1kg', false],
  ['mackerel-fillet-imp', '노르웨이 고등어 필렛, 1kg', true],
  ['mackerel', '노르웨이 고등어 필렛, 1kg', false],
  ['mackerel', '국내산 생물 고등어, 2마리', true],
  // 10/28 첫 실행 결과에서 걸러야 했던 실제 상품
  ['pork-neck', '바라던 이베리코 돼지고기 4종 세트', false],
  ['chicken', '대용량 냉동 닭 염통, 1kg', false],
  ['mango', '망고참외, 고당도, 2kg', false],
  ['mango', '베트남 골드망고 께오, 2kg', true],
  ['gulbi', '자갈치닷컴 민어굴비, 1.5kg', false],
  ['zucchini', '무농약 토핑 야채큐브 다진 애호박', false],
  ['hairtail', '국내산 냉동 마른갈치 풀치, 1kg', false],
  ['squid', '칼집 솔방울오징어, 200g', false],
  ['rice', '횡재미가 홍국강황쌀, 1kg', false],
  ['rice', '건강맞춤 국내산 상황버섯쌀, 1kg', false],
  ['rice', '서해대통 당진해 나루쌀 삼광미, 10kg', true],
  ['kelp', '완도산 쌈 다시마, 2kg', false],
  ['pork-shoulder', '고깃집왕건 호주산 소 앞다리살 우전각, 불고기용, 1kg', false],
  ['pork-shoulder', '한돈 앞다리살 수육용, 1kg', true],
  ['beef-brisket', '더예쁜한우 우삼겹 삼겹양지 구이용, 500g, 10개', false],
  ['soybean', '힘찬농부오달봉 매화콩(호랑이콩) 수입산, 500g', false],
  ['soybean', '이슬처럼 백태, 국산, 2025년산, 2kg, 1개', true],
  ['chicken', '고기중독 닭다리 북채, 1kg, 1팩', false],
  ['chicken', '동물복지 닭백숙용 통닭 11호, 1,000g, 1개', true],
  ['mackerel', '국내산 손질 고등어살, 특대, 170g, 1개', false],
  ['mackerel', '국내산 가시없는 고등어, 600g, 1개', false],
  ['mackerel', '오아시스 손질 푸른바다 고등어, 360g, 1개', true],
  ['squid', '국내산 손질 갑오징어, 400g, 2-3미, 1개', false],
  ['squid', '한잔푸드 국내산 동해안 활 오징어, 1kg, 1개', true],
  ['scallop', '물고기삼촌 자숙 가리비살, 1kg, 1개', false],
  ['lettuce', '투뿔농부 로메인 상추, 4kg, 1박스', false],
  ['lettuce', '무농약 적상추, 120g, 1개', true],
  ['almond', '햇 아몬드슬라이스, 500g, 1개', false],
  ['almond', '서래푸드 구운 아몬드, 1kg, 1봉', true],
];
for (const [id, name, want] of CASES) {
  if (!SHOP_RULES[id]) continue;
  if (ok(id, name) !== want) fail(`${id}: "${name}" → ${want ? '통과해야 하는데 빠짐' : '빠져야 하는데 통과'}`);
}

if (bad) {
  console.error(`\n문제 ${bad}개 — shop-rules.json을 만들지 않았어요.`);
  process.exit(1);
}

const out = {
  updatedAt: new Date().toISOString(),
  importRe: SHOP_IMPORT_RE,
  items: CATALOG.map((c) => ({ id: c.id, name: c.name, cat: c.cat, ...SHOP_RULES[c.id] })),
};
writeFileSync(new URL('../docs/data/shop-rules.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(`✓ 규칙 ${out.items.length}개, 시험 ${CASES.length}개 통과 → docs/data/shop-rules.json`);
